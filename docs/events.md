# Event System

This document describes the event system as implemented in [`src/core/events/`](../src/core/events/) and the `CommunityEvent` model ([`src/models/communityEvent.ts`](../src/models/communityEvent.ts)).

## Overview

There are **two** complementary pieces:

- `EventBus` — an **in-memory** publish/subscribe bus (`event-bus.ts`). Handlers are async and fire-and-forget; a throwing handler is logged, never crashes the publisher.
- `EventStore` — a **Mongo-backed** durable store (`event-store.impl.ts`) built on the `CommunityEvent` Mongoose model.

The bus is the live wiring for the current single-process runtime; the store gives the same events durability and a claim-based processing contract so a restarted process (or a future worker) cannot double-process them.

```text
room service / automation / platform events
    ↓
eventBus.publish(event)  ── subscribers (EventProcessor.subscribeAll)
    ↓
EventStore.claim(eventId)   (pending → processing, atomic, claimId token)
    ↓
stage pipeline: moderation → automation → usage
    ↓
EventStore.markProcessed | markFailed
```

## The `CommunityEvent` Record

Stored in the `communityevents` collection. Fields:

| Field | Type | Notes |
|---|---|---|
| `_id` | `string` | **Deterministic event id** (see below) — makes `persist` idempotent |
| `tenantId`, `botId`, `roomId` | `string` | Scoping |
| `platform` | `enum ['clubhouse']` | Default `'clubhouse'` |
| `type` | `CommunityEventType` | 8 types (below) |
| `occurredAt` | `Date` | Platform occurrence time |
| `payload` | `Mixed` | Type-specific payload |
| `status` | `enum ['pending','processing','processed','failed']` | Default `'pending'` |
| `attempts` | `number` | Incremented on each claim |
| `claimId` | `string?` | Ownership token of the current claim |
| `error` | `string?` | Last failure reason |
| `processedAt` | `Date?` | Set when processed |
| `expiresAt` | `Date?` | TTL expiry — set only for `processed` |
| `createdAt`, `updatedAt` | `Date` | Mongoose timestamps |

### Event types

```ts
'room.joined' | 'room.left' | 'room.ended' | 'user.joined'
| 'user.left' | 'message.created' | 'speaker.requested' | 'speaker.invited'
```

### Deterministic event id (`deriveEventId`)

The `_id` is derived from the event, not random, so a duplicate platform event re-persists as a no-op:

- `message.created`, `speaker.requested` → `evt:{platform}:{type}:{externalRoomId}:{messageId ?? 'unknown'}`
- `user.joined`, `user.left`, `speaker.invited` → `evt:{platform}:{type}:{externalRoomId}:{userId ?? 'unknown'}`
- `room.joined`, `room.left`, `room.ended` → `evt:{platform}:{type}:{externalRoomId}`
- default → `evt:{platform}:{type}:{externalRoomId}:{messageId ?? userId ?? 'unknown'}`

## EventBus

- `subscribe(type, handler)` → returns unsubscribe.
- `subscribeAll(handler)` → wildcard subscriber (used by the processor).
- `publish(event)` — dispatches to typed + wildcard subscribers without awaiting them; each invocation is independent.

This is the event backbone used by the room service, automation engine, moderation, and usage tracking.

## EventStore (Mongo)

Interface (`event-store.ts`) — implemented by `MongoEventStore` (`event-store.impl.ts`):

- `persist(event)` — idempotent upsert keyed on `_id`; a duplicate key is a no-op.
- `claim(eventId, tenantId)` → `{ claimed: true, claimId } | { claimed: false }` — atomic `findOneAndUpdate` on `{ _id, tenantId, status: 'pending' }` (or `processing` with `updatedAt` older than `STALE_PROCESSING_MS`). Increments `attempts`.
- `markProcessed(eventId, tenantId, claimId)` — only while the caller owns the claim (matches `claimId` and a fresh `updatedAt`); otherwise no-op. Sets `expiresAt = now + 30 days`.
- `markFailed(eventId, tenantId, claimId, error)` — while attempts remain returns the event to `pending`; once `attempts >= MAX_EVENT_ATTEMPTS` sets terminal `failed`.
- `recover({ limit?, staleMs? })` — returns pending events plus processing events stuck longer than `STALE_PROCESSING_MS`, oldest-first, bounded by `RECOVER_LIMIT` (100).
- `stats(tenantId)` — tenant-scoped status counts.

### Constants

| Constant | Value | Meaning |
|---|---|---|
| `MAX_EVENT_ATTEMPTS` | `3` | Max processing attempts before terminal `failed` |
| `STALE_PROCESSING_MS` | `120000` | A `processing` event older than this is reclaimable |
| `PROCESSED_EVENT_TTL_DAYS` | `30` | Processed events are TTL-deleted after 30 days |
| `RECOVER_LIMIT` | `100` | Batch size for the recovery drain |

### Retention

`expiresAt` is set **only** for `processed` events (`computeExpiry`); the `expiresAt` TTL index (`expireAfterSeconds: 0`) deletes them after 30 days. Pending/processing/failed events never expire so recovery and retry always see them.

## The Stage Pipeline

Wired once during boot in [`src/core/startup.ts`](../src/core/startup.ts) (`configureEventPipeline`):

1. **moderation** (`ModerationStage`) — gates `message.created` by room settings (see [moderation.md](./moderation.md)).
2. **automation** (`AutomationStage`) — evaluates automation rules for `user.joined`, `message.created`, `speaker.requested`; on context-resolution failure or rule failure returns `retry` (see [idempotency.md](./idempotency.md)).
3. **usage** (`UsageStage`) — records platform-observed usage events (see [usage.md](./usage.md)).

A stage returns one of `continue | block | retry | fail`. `block` stops the pipeline (no usage record for blocked messages); `retry` marks the event retryable (pending) via `markFailed` while attempts remain; a stage that throws is marked failed.

## Event Lifecycle

```text
event generated (room service / platform)
    ↓
persist(event)  (idempotent, status pending)
    ↓
eventBus.publish(event)
    ↓
EventProcessor.handle(event)
    ↓
claim(eventId)  →  { claimed: true, claimId } (pending → processing, attempts++)
    ↓
stage 1 moderation → stage 2 automation → stage 3 usage
    ↓
markProcessed(claimId)   OR   markFailed(claimId, reason)
```

A `{ claimed: false }` result means the event is already being processed, already processed, or terminal — the caller skips it. Idempotent persistence plus the deterministic id gives **at-most-once claims** with **at-least-once processing** semantics at the event level (retries re-run stages until the attempt budget is spent).

## Recovery

`EventProcessor.start()` (and re-entry on every publish path is guarded by a `recovering` flag) runs a bounded drain: repeatedly calls `recover({ limit: 100 })`, re-publishes returned events through the bus, and stops when fewer than 100 are returned. This is how a restarted process resumes events left in `pending`/stale `processing` by the previous run. Recovery is triggered once on `start()`; there is no periodic recovery timer.
