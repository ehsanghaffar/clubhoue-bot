# Action Idempotency

This document describes how automation actions are claimed exactly once per logical action, implemented in [`src/core/events/action-idempotency.ts`](../src/core/events/action-idempotency.ts) and the `ActionRecord` model ([`src/models/actionRecord.ts`](../src/models/actionRecord.ts)).

## Terminology

The implementation provides:

- **At-most-once claims** — for a given action key, at most one concurrent caller receives `acquired: true`.
- **At-least-once processing** — failures are retried until the attempt budget is spent, so a side effect may be retried after a crash.
- **Lease-based recovery** — a `processing` claim whose lease expired can be reclaimed by a successor.

**No guarantee of exactly-once external side effects.** The claim guarantees that only one process at a time runs the side effect while it owns the lease, but a crash after the external side effect and before `markExecuted` can lead to a retry (and therefore a duplicate external side effect). This is inherent to the lease design.

## The ActionRecord

One document per logical action. The `_id` is the **deterministic action key**:

```text
{actionType}:{tenantId}:{eventId}:{ruleId}
```

(e.g. `ai_response:tenant-1:evt:...:ai-answer`). Because the tenant id is part of the key, the same event/rule can never collide across tenants.

Statuses: `pending → processing → executed | failed`.

| Field | Notes |
|---|---|
| `_id` | Deterministic action key |
| `tenantId` | Required; `index: true` |
| `actionType` | `'ai_response' \| 'welcome' \| 'speaker_invite'` |
| `ruleId`, `eventId`, `botId`, `roomId` | Stamped on first claim (metadata) |
| `status` | `pending / processing / executed / failed` |
| `attempts` | Incremented on each claim |
| `claimedAt`, `leaseUntil`, `claimId` | Claim ownership |
| `executedAt` | Set on success |
| `error` | Last failure reason (truncated to 500 chars) |

## Claim Mechanism

`MongoActionIdempotencyStore.claim(tenantId, key, metadata?)` makes the ownership decision in **one atomic `findOneAndUpdate`** — there is no application-level lock and no read-modify-write:

```text
claimable = { _id: key, tenantId,
  $or: [
    { status: 'pending' },
    { status: 'failed', attempts: { $lt: maxAttempts } },
    { status: 'processing', leaseUntil: { $lt: now } }   // expired lease → reclaimable
  ] }

transition = { $set: { status:'processing', claimedAt, leaseUntil, claimId: uuid() },
               $inc: { attempts: 1 },
               $setOnInsert: { metadata... } }
```

1. `findOneAndUpdate(claimable, transition)` — exactly one concurrent caller wins; the rest get `acquired: false`.
2. If no document matched (fresh key), the same transition runs with `upsert: true`. A duplicate-key error (`11000`) means another caller just created the record; the loser reports the current reason (`processing`/`executed`/`failed`) and does **not** retry the upsert.
3. The winning caller receives a per-claim `claimId` ownership token.

## Constants

| Constant | Value | Meaning |
|---|---|---|
| `ACTION_LEASE_MS` | `120000` | A `processing` claim older than this may be reclaimed |
| `MAX_ACTION_ATTEMPTS` | `5` | Max attempts before terminal `failed` |

## Ownership-Enforced Mutations

Every subsequent mutation requires the current `claimId` **and** a valid lease:

- `markExecuted(tenantId, key, claimId)` — `updateOne({ _id, tenantId, status:'processing', claimId, leaseUntil: { $gt: now } }, { status:'executed', ... })`. A stale owner (lease expired and reclaimed) matches zero documents → no-op.
- `markFailed(...)` — same guard; if `attempts >= MAX_ACTION_ATTEMPTS` sets terminal `failed`, otherwise back to `pending` (retryable). `error` is truncated to 500 chars.
- `release(tenantId, key, claimId)` — returns a held, unexecuted claim to `pending` **without** consuming the retry budget (used by the AI rule when no answer is produced).

## Store Selection

```ts
// action-idempotency.ts
export const actionIdempotencyStore: ActionIdempotencyStore =
  process.env.NODE_ENV === 'test' ? new InMemoryActionIdempotencyStore() : new MongoActionIdempotencyStore()
```

Production uses the Mongo-backed store; tests use an in-memory fake.

## How Rules Use It

Each automation rule claims its action key **before** performing the external side effect and only acts when it acquired the claim ([welcome.rule.ts](../src/core/automation/rules/welcome.rule.ts), [speaker.rule.ts](../src/core/automation/rules/speaker.rule.ts), [ai.rule.ts](../src/core/automation/rules/ai.rule.ts)):

| Rule | Event | Action type | Side effect | On null/no-op |
|---|---|---|---|---|
| `welcome` | `user.joined` | `welcome` | send welcome message | n/a (guarded by `welcomeEnabled`) |
| `speaker-request` | `message.created` | `speaker_invite` | invite speaker | n/a (guarded by `autoInviteEnabled` + allow-list + keyword) |
| `ai-answer` | `message.created` | `ai_response` | send AI response | `release()` the claim when the runner returns `null` |

Pattern per rule:

```text
if !gate → action 'none'
key = buildActionKey(tenantId, event.id, ruleId, actionType)
claim = actions.claim(...)
if !claim.acquired → success (someone else owns it)
try:
    perform side effect
    actions.markExecuted(claimId)
catch:
    actions.markFailed(claimId, error); throw
```

The AI rule additionally calls `release()` when the runner produces no answer, so a "no answer" is never recorded as an execution and does not consume retry attempts.

## Failure Semantics

- Side effect throws → `markFailed`; if attempts remain the record returns to `pending` and the next event of the same key (or a retried event) can re-run it.
- `markFailed` is **not** used when the rule was simply not applicable — those return `success: false` with `action: 'none'` and never create a record.
- Because claims are keyed by `eventId`, a single platform event that produces no side effect (e.g. AI decides not to respond) leaves no persistent action record after `release()` beyond the initial `pending` document.
