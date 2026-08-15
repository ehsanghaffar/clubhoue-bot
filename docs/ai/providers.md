# AI Providers

Implemented in [`src/core/ai/`](../../src/core/ai/). There are **two** providers, both using the official `openai` SDK:

- `OpenAiProvider` — standard OpenAI (default).
- `OpenAiCompatibleProvider` — OpenAI-compatible API via a custom `baseURL`.

**No other providers** (Anthropic, Gemini, Groq, etc.) exist in the code.

## Provider Selection

`EnvAiProviderResolver` (in [provider-resolver.ts](../../src/core/ai/provider-resolver.ts)):

| `AI_PROVIDER` | Provider | Configuration |
|---|---|---|
| `openai` (default) | `OpenAiProvider` | SDK client from `src/services/openai.service.ts` (`getOpenAIClient`), lazy-created on first call; model from the request (`aiConfig.model`, default `OPENAI_MODEL` → `gpt-4o-mini`); key from `OPENAI_API_KEY` |
| `openai-compatible` | `OpenAiCompatibleProvider` | `baseURL = AI_BASE_URL`, `apiKey = AI_API_KEY ?? OPENAI_API_KEY`, `defaultModel = AI_MODEL` |

The resolved provider is injected into `AiService` once at module load (`src/core/ai/index.ts`). Core services depend only on the `AiProvider` interface (`complete(request) => Promise<string>`).
## Behavior (both providers)

Both providers share the same reliability policy:

- **Timeout:** `REQUEST_TIMEOUT_MS = 25_000` — a hard ceiling so a single AI request cannot hang the room loop.
- **Retries:** `MAX_ATTEMPTS = 2` with `RETRY_BASE_DELAY_MS = 1_000` linear backoff (`1000ms * attempt`). Only transient errors are retried.
- **Failure result:** after exhausting retries (or on a permanent error) the provider returns `''`. It never throws — the room/automation loop treats an empty answer as "skip".
- **Logging:** errors are logged with only a safe classification (attempt, maxAttempts, transient, HTTP status, retryable) — never the API key or full prompt.

### Transient vs permanent (`isTransientError`)

`OpenAiProvider.isTransientError` classifies:

- **Transient (retryable):** `APIError` with `status === 429` or `status >= 500 && < 600` or `408`; `TimeoutError`/`AbortError`; messages containing `timeout`, `econnreset`, `socket`, `network`; API errors with no status.
- **Permanent (no retry):** other 4xx errors — auth, request, policy (`retrying wastes time`).

## Error Taxonomy

`AiProviderError` (`ai.types.ts`) defines a `kind` for provider failures: `timeout | rate_limited | transient | authentication | invalid_request | permanent`. Note the providers themselves return `''` rather than throwing `AiProviderError`; the `AiProviderError` class exists for the provider abstraction's typed error surface.
