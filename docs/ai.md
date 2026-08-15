# AI Architecture

This document describes the AI subsystem as implemented in [`src/core/ai/`](../src/core/ai/). It covers trigger detection, cooldowns, providers, prompt construction, and how the AI response is delivered through the automation engine.

## Runtime Flow

The AI path runs inside the **automation stage** of the event pipeline, driven by the `ai-answer` rule ([ai.rule.ts](../src/core/automation/rules/ai.rule.ts)):

```text
message.created event
    ↓
moderation stage (room settings gate; see moderation.md)
    ↓
automation stage → ai-answer rule
    ↓
rule gate: room.aiEnabled && bot.aiConfig.enabled
    ↓
claim action key (idempotency, see idempotency.md)
    ↓
AgentService runner
    ├── self-message check (payload.userId === botUserId → skip)
    ├── AiService.canRespond (trigger mode + cooldown)
    ├── record usage ai_request
    ├── AiService.generateResponse (prompt → provider → length-truncate)
    ├── record usage ai_response
    └── return answer
    ↓
context.sendMessage(answer)  →  Clubhouse message
    ↓
action.markExecuted
```

## Trigger Detection (`AiService.decide`)

Resolved from the bot's `AiConfig` (`resolveAiConfig`). If `ai.enabled` is false → `respond: false`. Otherwise the `triggerMode` decides:

| Mode | Condition |
|---|---|
| `mention` (default) | `mentionDetector.isMentioned(input, identity)` — see below |
| `prefix` | `content.startsWith(triggerPrefix)` (default `'#'`) |
| `keyword` | `looksLikeQuestion(content)` |
| `question` | `looksLikeQuestion(content)` (same as keyword in the current implementation) |
| `manual` | always `respond: false` (`'no_trigger'`) — the AI never auto-responds |

`looksLikeQuestion` returns true when the content contains `?`/`؟` or any English/`فارسی` question word (e.g. `what`, `why`, `how`, `can`, `چرا`, `چه`, `کجا`, `چطور`).

## Mention Detection (`MentionDetector`)

Uses **platform identity**, never the internal bot label (`bot.name`):

1. **Structured mention match (authoritative)** — if `mentionedUserIds` contains `externalAccountId`, it is a mention.
2. **Token-bound @username match (fallback)** — the normalized `@externalAccountName` must appear as a word with word boundaries (`@helper` does **not** match `@helper123`); case-insensitive.

If `externalAccountId === ''`, never a mention. This mirrors the identity model in [platforms/clubhouse.md](./platforms/clubhouse.md) — the bot is a normal Clubhouse user operated programmatically.

## Cooldown

`InMemoryAiCooldownStore` — **in-memory** per `tenantId:botId:roomId:userId` (see [limitations.md](./limitations.md) for the single-process implication).

- `canRespond` calls `tryReserve(...)` which atomically reserves a cooldown slot using the same window as `cooldownSeconds` (default 30s). A user still within the window (or a concurrent caller that already reserved) gets `respond: false, reason: 'cooldown'`.
- On a successful response, `markResponded` anchors the window; `releaseCooldown` is called when the bot decides **not** to respond (no trigger / empty response) so a non-response never locks the user out.
- `cooldownSeconds <= 0` disables cooldown.

## Provider Selection

`EnvAiProviderResolver` reads `AI_PROVIDER` (default `'openai'`):

- `'openai'` → `OpenAiProvider` (uses the `openai` SDK; model from `OPENAI_MODEL` default `'gpt-4o-mini'`, key from `OPENAI_API_KEY`).
- `'openai-compatible'` → `OpenAiCompatibleProvider` with `baseUrl = AI_BASE_URL`, `apiKey = AI_API_KEY ?? OPENAI_API_KEY`, `defaultModel = AI_MODEL`.

Core AI services depend only on the `AiProvider` interface and never import concrete provider classes.

See [ai/providers.md](./ai/providers.md) for provider behavior (timeouts, retries, errors).

## Response Generation

`AiService.generateResponse(bot, username, question)`:

1. Builds the prompt via `buildAiPrompt` (see below).
2. Calls `provider.complete({ model, systemPrompt, userPrompt, maxOutputTokens, temperature })`.
3. Trims the raw output; if it exceeds `aiConfig.maxResponseLength` (default 280) it is truncated (with `truncated: true`).
4. Returns `AiResponse { content, truncated }`. **Never throws provider errors upward** — the caller treats a `null`/empty answer as "skip".

## Prompt Rules (`buildAiPrompt`)

The system prompt enforces these rules (in `prompt.service.ts`):

1. Answer as briefly as possible.
2. Keep the response under `aiConfig.maxResponseLength` characters.
3. Reply in the same language as the question.
4. If asked about "Ehsan"/"احسان", say everything about Ehsan is confidential.
5. Start the response with `"{username} Jan,"`.
6. Append `personality` as an additional persona if the bot has one.

## Agent Runner (`AgentService.createRunner`)

The `AgentService` bridges AI into the automation `AiRunner` contract:

- Skips **self-messages** (the bot's own message; `payload.userId === context.botUserId`).
- Records usage `ai_request` before generating and `ai_response` after a non-empty response (see [usage.md](./usage.md)).
- On cooldown or empty answer, releases the cooldown and returns `null` (the rule then `release()`s the action claim).

## Wiring

`src/core/ai/index.ts` constructs the singletons:

```ts
export const aiService = new AiService({
  provider: aiProviderResolver.resolve(),
  cooldown: new InMemoryAiCooldownStore()
})
export const agentService = new AgentService({ ai: aiService, usage: usageService })
```

The `ai-answer` rule uses `agentService.createRunner()` as its runner (see [default-engine.ts](../src/core/automation/default-engine.ts)).
