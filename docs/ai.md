# AI

The AI subsystem decides *whether* to respond and generates the response. It is platform-agnostic and provider-swappable.

## Provider

- `AiProvider` (`src/core/ai/ai.types.ts`) — a single method: `complete(request) → Promise<string>`.
- `OpenAiProvider` (`src/core/ai/openai.provider.ts`) — OpenAI `chat.completions` implementation. The SDK client is created lazily so importing the module never fails at boot; `OPENAI_API_KEY` is validated by server bootstrap.

## Decision + generation — `AiService`

Per-bot configuration (`aiConfig`): `enabled`, `model`, `temperature`, `maxOutputTokens`, `maxResponseLength`, `triggerMode`, `triggerPrefix`, `cooldownSeconds`.

- `decide(bot, content)` — trigger-mode decision, ignores cooldown:
  - `manual` — never responds
  - `prefix` — responds when the message starts with `triggerPrefix`
  - `mention` — responds when the message mentions `@<bot name>`
  - `keyword` / `question` — responds to question-like text (English + Persian heuristics, `?` / `؟`)
- `canRespond(bot, roomId, content)` — trigger decision **plus** per-bot+room cooldown.
- `generateResponse(bot, username, content)` — builds the prompt (`prompt.service.ts`, includes bot personality) and calls the provider; honors `maxResponseLength`.
- `markResponded(bot, roomId)` — records the cooldown window.

The cooldown store is injectable (`AiCooldownStore`); `InMemoryAiCooldownStore` is the MVP implementation.

## Agent bridge — `AgentService`

`AgentService.createRunner()` returns the `AiRunner` used by the automation engine's AI rule:

1. Suppresses the bot's own messages (compares `context.botUserId`).
2. Asks `AiService.canRespond`; returns `null` when not triggered or on cooldown.
3. Records `ai_request` usage.
4. Generates the response, marks cooldown, records `ai_response` usage.
5. Returns the text for the rule to send via `context.sendMessage`.

## Data flow

```text
message.created
   → AutomationStage → AI rule → AiRunner (AgentService)
   → AiService.canRespond (trigger + cooldown)
   → OpenAiProvider.complete
   → adapter.sendMessage(answer)
```

## See also

- [`docs/automation.md`](automation.md) — how the AI rule plugs into the pipeline.
