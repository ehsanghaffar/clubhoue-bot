# Moderation

This document describes message moderation as implemented in [`src/core/moderation/`](../src/core/moderation/).

## Overview

`ModerationStage` is the **first stage** of the event pipeline. It gates `message.created` events **before** they reach automation/AI. A blocked message returns `'block'` from the stage, which stops the pipeline — it never reaches the AI rules and never produces a usage event.

For events that are not `message.created`, the stage passes through (`continue`).

## Policy Source

Policy comes from the **room's settings** (`resolveRoomSettings` in [`src/core/rooms/room.types.ts`](../src/core/rooms/room.types.ts)). Defaults:

```ts
{
  welcomeEnabled: true,
  aiEnabled: true,
  autoInviteEnabled: false,
  moderationEnabled: false,          // moderation gate is OFF by default
  blockedUsers: [],
  blockedKeywords: [],
  messageRateLimit: { max: 10, windowSeconds: 60 }
}
```

`moderationEnabled` gates the whole stage. If it is `false` (the default), moderation is skipped entirely for the room.

## Checks (in order)

For a `message.created` event with moderation enabled:

1. **Blocked users** — `settings.blockedUsers` is a list of external platform user ids; if `payload.userId` (non-empty) is in the list → `blocked_user`.
2. **Blocked keywords** — `settings.blockedKeywords`; case-insensitive substring match on the raw content → `blocked_keyword`.
3. **Message rate limit** — if `settings.messageRateLimit` is set, the composite key `botId:roomId:userId` is checked against `InMemoryMessageRateLimiter` with `max` / `windowSeconds`. Exceeding the limit → `rate_limited`.

A blocked message is logged at `info` with the reason and never reaches automation/AI/usage.

## Rate Limiter (`InMemoryMessageRateLimiter`)

- **In-memory** fixed-window limiter (see [limitations.md](./limitations.md) for the single-process implication).
- Keys are the composite `botId:roomId:userId` — limits are per bot/room/user and **never** process-global cross-tenant limits.
- `max <= 0` → always disallowed.
- Lazy window expiry (hits outside the window are dropped on access).
- Bounded growth: evicts idle buckets when the map exceeds `10_000` buckets (a bucket is idle if empty or its last hit is older than 5 minutes).

## Failure Behavior

- If the room cannot be resolved (`getRoom` throws or returns `null`), the stage **continues** (does not block) — moderation is skipped rather than dropping the message.
- The limiter is injectable (`deps.limiter`); tests inject a fresh instance.

## Relationship to Other Gates

There are **two separate rate-limit concepts** in the codebase:

| Concept | Scope | Store | See |
|---|---|---|---|
| HTTP rate limiter (`express-rate-limit` on `/v1`) | per-IP, 100 req / 60s, returns 429 | middleware | [api.md](./api.md) |
| Message moderation rate limit | per `botId:roomId:userId` | in-memory buckets | this document |
| AI cooldown | per `tenantId:botId:roomId:userId` | in-memory cooldown store | [ai.md](./ai.md) |
