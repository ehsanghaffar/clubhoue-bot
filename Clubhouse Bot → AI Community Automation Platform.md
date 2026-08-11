# Clubhouse Bot → AI Community Automation Platform

## Full Repository Refactor & MVP Implementation

You are working directly inside the existing repository:

`https://github.com/ehsanghaffar/clubhoue-bot`

Your task is to **refactor and evolve the existing codebase into a production-oriented MVP for an AI-powered Community / Room Management Platform**, starting with Clubhouse as the first platform.

Do **NOT** rewrite the project from scratch.

The existing Clubhouse integration is valuable and must be preserved. Your job is to progressively refactor the existing implementation into a clean architecture that can later support Discord and other social/community platforms through adapters.

---

# 1. Primary Goal

Transform the current architecture:

```text
Clubhouse API
      ↓
ClubApiService
      ↓
ChannelService / ChatbotService
      ↓
REST API
```

into:

```text
                         API
                          │
                          ▼
                    Bot Management
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
            Bots        Rooms       Users
              │           │
              └─────┬─────┘
                    ▼
             Event / Automation Engine
                    │
          ┌─────────┼──────────┐
          ▼         ▼          ▼
        Welcome     AI      Moderation
          │         │          │
          └─────────┼──────────┘
                    ▼
             Platform Adapter
                    │
                    ▼
                Clubhouse

Future:

                Platform Adapter
                    │
             ┌──────┴──────┐
             ▼             ▼
         Clubhouse       Discord
```

The MVP must be functional, testable, maintainable, and extensible.

---

# 2. Important Constraints

## DO NOT rewrite everything

Preserve and reuse the existing:

- Clubhouse API integration
- `agent.ts`
- `ClubApiService`
- room/channel functionality
- user functionality
- speaker invitation functionality
- notification functionality
- AI integration
- existing authentication primitives where useful
- existing MongoDB infrastructure
- Docker setup where possible
- existing tests

The current repository already contains meaningful Clubhouse integration code.

Treat that code as an existing integration layer that needs to be isolated and improved, not discarded.

---

# 3. First Step: Repository Audit

Before modifying code:

1. Inspect the entire repository.
2. Inspect every source directory.
3. Inspect:
   - `package.json`
   - TypeScript configuration
   - environment configuration
   - Docker files
   - tests
   - routes
   - controllers
   - services
   - models
   - utilities
   - middleware
   - configuration
   - scripts
   - CI workflows
4. Identify dead code.
5. Identify duplicated logic.
6. Identify Clubhouse-specific logic currently leaking into generic services.
7. Identify in-memory state.
8. Identify global singleton state.
9. Identify security problems.
10. Identify missing persistence.
11. Identify code that prevents multiple bots or multiple rooms from running concurrently.

Do not stop after producing an audit.

**Use the audit to implement the migration.**

---

# 4. Target Architecture

Gradually migrate toward:

```text
src/
│
├── api/
│   ├── controllers/
│   ├── routes/
│   └── middleware/
│
├── core/
│   ├── bots/
│   │   ├── bot.service.ts
│   │   ├── bot.types.ts
│   │   └── bot.repository.ts
│   │
│   ├── rooms/
│   │   ├── room.service.ts
│   │   ├── room.types.ts
│   │   └── room.repository.ts
│   │
│   ├── events/
│   │   ├── event-bus.ts
│   │   ├── event-processor.ts
│   │   └── event.types.ts
│   │
│   ├── automation/
│   │   ├── rule-engine.ts
│   │   ├── action-dispatcher.ts
│   │   └── automation.types.ts
│   │
│   └── ai/
│       ├── ai.service.ts
│       ├── agent.service.ts
│       ├── prompt.service.ts
│       └── ai.types.ts
│
├── platforms/
│   └── clubhouse/
│       ├── adapter.ts
│       ├── agent.ts
│       ├── api.service.ts
│       └── types.ts
│
├── models/
│   ├── tenant.ts
│   ├── bot.ts
│   ├── credential.ts
│   ├── room.ts
│   ├── message.ts
│   ├── automation.ts
│   └── usage.ts
│
├── workers/
│   ├── message.worker.ts
│   ├── ai.worker.ts
│   ├── ping.worker.ts
│   └── room.worker.ts
│
├── infrastructure/
│   ├── database/
│   ├── redis/
│   └── queue/
│
└── server.ts
```

Do not blindly create empty abstractions.

Only introduce files/modules when they have real responsibilities and real implementations.

---

# 5. Phase 0 — Stabilize Existing Code

Before major architectural changes:

## 5.1 Run

- typecheck
- lint
- unit tests
- integration tests
- build
- dependency audit

Fix all existing errors.

Do not hide errors with:

```ts
any
@ts-ignore
@ts-expect-error
eslint-disable
```

unless there is a documented and justified reason.

---

## 5.2 Authentication

The current API has API-key middleware, but global API authentication is not consistently enforced.

Introduce:

```text
Authentication
      ↓
Tenant context
      ↓
Authorization
      ↓
Controller
```

Create appropriate middleware such as:

```text
src/api/middleware/authentication.ts
src/api/middleware/authorization.ts
src/api/middleware/tenant-context.ts
```

Preserve the existing API-key mechanism where useful.

---

# 6. Phase 1 — Introduce Tenant

Introduce a minimal multi-tenant foundation.

Create:

```text
Tenant
```

At minimum:

```ts
interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}
```

Everything user-owned must eventually have ownership through a tenant.

Do not over-engineer user authentication yet.

For MVP, API-key-based tenant access is sufficient.

---

# 7. Phase 2 — Introduce Bot

The most important new domain entity is:

```text
Bot
```

Create a persistent Bot model.

Suggested structure:

```ts
interface Bot {
  id: string;
  tenantId: string;

  name: string;

  platform: 'clubhouse';

  status:
    | 'created'
    | 'starting'
    | 'active'
    | 'stopping'
    | 'stopped'
    | 'error';

  aiConfig: {
    enabled: boolean;
    model: string;
    temperature: number;
    maxOutputTokens: number;
    maxResponseLength: number;
  };

  personality?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

The architecture must make adding:

```text
platform: 'discord'
```

later straightforward.

Do not implement Discord yet.

---

# 8. Phase 3 — Bot Credentials

Replace the current global/profile-oriented credential concept with bot-owned credentials.

Create:

```text
BotCredential
```

Suggested fields:

```ts
interface BotCredential {
  id: string;

  tenantId: string;
  botId: string;

  platform: 'clubhouse';

  encryptedToken: string;

  externalAccountId?: string;
  externalAccountName?: string;

  status: 'active' | 'invalid' | 'revoked';

  createdAt: Date;
  updatedAt: Date;
}
```

## Security requirement

Never store Clubhouse tokens as plaintext.

Implement encryption/decryption using a server-side encryption key.

The encryption key must come from environment configuration.

Never expose decrypted credentials through API responses.

Never log credentials.

---

# 9. Phase 4 — Bot Rooms

Create:

```text
BotRoom
```

Suggested model:

```ts
interface BotRoom {
  id: string;

  tenantId: string;
  botId: string;

  platform: 'clubhouse';

  externalRoomId: string;

  status:
    | 'configured'
    | 'joining'
    | 'active'
    | 'leaving'
    | 'inactive'
    | 'error';

  settings: {
    welcomeEnabled: boolean;
    aiEnabled: boolean;
    autoInviteEnabled: boolean;
    moderationEnabled: boolean;
  };

  joinedAt?: Date;
  lastSeenAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

This replaces the concept of a single global `activeChannel`.

A bot must be able to manage multiple rooms.

---

# 10. Refactor Clubhouse Integration

Move Clubhouse-specific code under:

```text
src/platforms/clubhouse/
```

Preserve the existing implementation.

The current:

```text
agent.ts
ClubApiService
```

should become the implementation of the Clubhouse adapter.

Create a platform abstraction such as:

```ts
interface CommunityPlatformAdapter {
  getRoom(roomId: string): Promise<Room>;

  joinRoom(roomId: string): Promise<void>;

  leaveRoom(roomId: string): Promise<void>;

  getMessages(roomId: string): Promise<Message[]>;

  sendMessage(roomId: string, message: string): Promise<void>;

  getUser(userId: string): Promise<User>;

  searchUsers(query: string): Promise<User[]>;

  inviteSpeaker(roomId: string, userId: string): Promise<void>;

  acceptSpeakerInvite(roomId: string): Promise<void>;
}
```

Implement:

```text
ClubhouseAdapter
```

using the existing Clubhouse code.

Do not implement Discord yet.

The goal is to make Discord possible later without changing the core domain.

---

# 11. Normalize Platform Data

Do not allow Clubhouse-specific response shapes to leak into the core domain.

Introduce normalized types:

```ts
interface Room {
  id: string;
  platform: string;
  title?: string;
  description?: string;
  status?: string;
}

interface User {
  id: string;
  platform: string;
  username?: string;
  displayName?: string;
}

interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  timestamp: Date;
}
```

Clubhouse responses should be transformed into these types.

---

# 12. Phase 5 — Event System

Introduce a normalized event model.

Events should include:

```text
room.joined
room.left
room.ended
user.joined
user.left
message.created
speaker.requested
speaker.invited
```

Example:

```ts
interface CommunityEvent {
  id: string;

  tenantId: string;
  botId: string;
  roomId: string;

  platform: 'clubhouse';

  type: string;

  timestamp: Date;

  payload: unknown;
}
```

Create:

```text
EventBus
EventProcessor
```

Do not tightly couple event processing to Clubhouse.

---

# 13. Phase 6 — Automation Engine

Refactor the existing `ChannelService` automation into a generic rule/action system.

Architecture:

```text
Event
 ↓
Rule Engine
 ↓
Conditions
 ↓
Action Dispatcher
 ↓
Platform Adapter
```

Support these MVP automations:

### Welcome

```text
user.joined
      ↓
send welcome message
```

### AI Q&A

```text
message.created
      ↓
should AI respond?
      ↓
AI
      ↓
send message
```

### Speaker Request

```text
message.created
      ↓
speaker request detected
      ↓
allow-list / permissions
      ↓
invite speaker
```

Preserve the existing speaker allow-list behavior.

---

# 14. Phase 7 — AI Agent

Replace the current single-room chatbot architecture.

Do not keep:

```ts
activeChannel
```

as global mutable state.

Create:

```text
AIService
AgentService
PromptService
```

The AI pipeline should become:

```text
Message Event
     ↓
Rule Engine
     ↓
Should AI respond?
     ↓
AI Agent
     ↓
Safety / validation
     ↓
Response
     ↓
Platform Adapter
     ↓
Send Message
```

---

# 15. AI Configuration

Do not rely exclusively on global environment variables for bot behavior.

Move configurable AI behavior into `Bot.aiConfig`.

Support:

```text
enabled
model
temperature
maxOutputTokens
maxResponseLength
personality
trigger mode
cooldown
```

For example:

```json
{
  "enabled": true,
  "model": "gpt-4o-mini",
  "temperature": 0.4,
  "maxOutputTokens": 150,
  "maxResponseLength": 280
}
```

Environment variables may provide safe defaults.

Bot configuration overrides defaults.

---

# 16. AI Trigger Rules

The existing `#question` trigger can remain supported.

However, make the trigger configurable:

```text
mention
prefix
keyword
question
manual
```

MVP default:

```text
#question
```

Example:

```text
# What is React Server Components?
```

should invoke the AI.

Do not make the AI respond to every message by default.

Add cooldown/debouncing to avoid spam.

---

# 17. Message Deduplication

The current in-memory message cache must not remain the source of truth.

Replace it with persistent/distributed deduplication.

Prefer:

```text
Redis
```

with keys such as:

```text
processed:{botId}:{roomId}:{messageId}
```

with TTL.

If Redis is not introduced immediately, implement a repository abstraction so the storage mechanism can be replaced without rewriting the message pipeline.

---

# 18. Phase 8 — Worker Architecture

Background loops must not live permanently inside the HTTP server.

The current polling, pinging, chatbot loops and similar background work should be moved toward worker jobs.

Introduce:

```text
Redis
BullMQ
Worker process
```

Suggested jobs:

```text
process-message
ai-response
active-ping
room-sync
speaker-invite
```

Architecture:

```text
API
 │
 ▼
MongoDB
 │
 ▼
Redis
 │
 ▼
Worker
 │
 ├── message processing
 ├── AI
 ├── ping
 ├── room sync
 └── automation
```

The API process should be safe to restart without losing bot state.

---

# 19. Multi-room and Multi-bot Requirements

The resulting implementation must support:

```text
Tenant
 ├── Bot A
 │    ├── Room 1
 │    └── Room 2
 │
 └── Bot B
      └── Room 3
```

Do not use global mutable variables for:

- active room
- active bot
- active token
- chatbot state
- ping state

State must be scoped by:

```text
tenantId
botId
roomId
```

---

# 20. Public API

Keep the existing low-level Clubhouse endpoints if they are useful for backwards compatibility.

Introduce a new versioned product API:

```text
/v1
```

Required endpoints:

### Bots

```http
POST   /v1/bots
GET    /v1/bots
GET    /v1/bots/:botId
PATCH  /v1/bots/:botId
DELETE /v1/bots/:botId
```

### Credentials

```http
POST   /v1/bots/:botId/credentials
GET    /v1/bots/:botId/credentials
DELETE /v1/bots/:botId/credentials/:credentialId
```

Never return decrypted credentials.

### Rooms

```http
POST /v1/bots/:botId/rooms
GET  /v1/bots/:botId/rooms
GET  /v1/bots/:botId/rooms/:roomId
POST /v1/bots/:botId/rooms/:roomId/join
POST /v1/bots/:botId/rooms/:roomId/leave
```

### Bot lifecycle

```http
POST /v1/bots/:botId/start
POST /v1/bots/:botId/stop
```

### Usage

```http
GET /v1/bots/:botId/usage
```

### Events

```http
GET /v1/bots/:botId/events
```

Use proper validation and authorization on every endpoint.

---

# 21. Usage Tracking

Introduce:

```text
UsageEvent
```

Track at least:

```text
message_received
message_sent
ai_request
ai_response
speaker_invite
room_join
room_leave
automation_triggered
```

Store enough information to calculate future billing.

Do not implement billing yet.

---

# 22. Basic Analytics

MVP analytics should expose:

```text
rooms
messages
users
AI responses
automation actions
errors
AI usage
```

Example:

```json
{
  "messages": 1203,
  "aiResponses": 183,
  "users": 490,
  "rooms": 12,
  "speakerInvites": 34
}
```

Keep analytics implementation simple.

---

# 23. Moderation

Implement only basic MVP moderation.

Support:

```text
blocked users
blocked keywords
message rate limiting
AI response cooldown
```

Architecture:

```text
Message
 ↓
Moderation
 ↓
Automation
 ↓
AI
```

Do not implement an advanced moderation AI system yet.

---

# 24. Timer / Existing Non-core Features

Existing features such as Pomodoro/timer functionality should not block the migration.

Do not delete them unless they are clearly dead code.

Move them out of the critical architecture path.

The core product is:

```text
Bot
Room
Event
Automation
AI
Platform
```

---

# 25. Testing Requirements

Expand testing substantially.

At minimum create tests for:

### Unit

```text
BotService
RoomService
AutomationEngine
RuleEngine
AIService
MessageDeduplication
CredentialEncryption
Authorization
```

### Integration

```text
Bot API
Credential API
Room API
Automation pipeline
```

### Platform

Mock Clubhouse responses and test:

```text
join
leave
send message
get messages
invite speaker
user lookup
```

Do not make tests depend on live Clubhouse API calls.

---

# 26. Docker / Deployment

Keep the existing Dockerfile where possible.

Update deployment architecture to support:

```text
api
worker
mongo
redis
```

Development compose may remain separate from production configuration.

Do not introduce Kubernetes.

---

# 27. CI

Create or improve GitHub Actions.

Every pull request should run:

```text
install
↓
typecheck
↓
lint
↓
test
↓
build
↓
dependency audit
```

The repository must not merge code that fails these checks.

---

# 28. Code Quality Rules

Follow these rules throughout the migration:

- TypeScript strict mode.
- No unnecessary `any`.
- No duplicated business logic.
- Controllers remain thin.
- Business logic belongs in services/domain modules.
- Platform-specific logic stays inside platform adapters.
- Database access stays behind repositories/services.
- Secrets never appear in logs.
- No plaintext Clubhouse credentials.
- No global mutable bot state.
- No hidden background timers inside request handlers.
- Validate external input.
- Use explicit error types where appropriate.
- Preserve backward compatibility where practical.
- Do not introduce abstractions without a concrete use case.

---

# 29. Migration Strategy

Implement the project incrementally.

Do NOT perform a giant destructive refactor.

Use this sequence:

```text
01. Stabilize current code
02. Authentication / tenant context
03. Tenant model
04. Bot model
05. Bot credentials
06. Credential encryption
07. Bot rooms
08. Clubhouse adapter
09. Normalized domain types
10. Event system
11. Automation engine
12. AI agent
13. Redis / deduplication
14. Worker architecture
15. Usage tracking
16. Basic analytics
17. Public /v1 API
18. Integration tests
19. Docker production setup
20. CI hardening
```

After every phase:

1. Run typecheck.
2. Run lint.
3. Run tests.
4. Run build.
5. Fix all regressions.
6. Review the diff.
7. Update documentation.

Do not proceed to the next phase while the current phase is broken.

---

# 30. Git Commit Strategy

Make commits small and logically grouped.

Use commit messages such as:

```text
feat(auth): introduce tenant authentication context
feat(bots): add bot domain model
feat(credentials): add encrypted bot credentials
feat(rooms): add bot room management
refactor(clubhouse): isolate platform integration
feat(events): add community event pipeline
feat(automation): add rule engine
feat(ai): replace chatbot with room-aware AI agent
feat(queue): introduce background workers
feat(usage): add usage event tracking
test(api): add bot and room integration tests
ci: harden validation pipeline
```

Do not create giant commits containing unrelated changes.

---

# 31. Documentation

Update the repository documentation as the architecture changes.

Create/update:

```text
docs/
├── architecture.md
├── mvp-roadmap.md
├── api.md
├── bot-lifecycle.md
├── automation.md
├── ai.md
├── platforms.md
├── deployment.md
└── security.md
```

Documentation must reflect the actual implemented architecture.

Never document features that have not been implemented.

---

# 32. MVP Definition of Done

The MVP is considered complete only when this complete flow works:

```text
API Client
    │
    ▼
Create Bot
    │
    ▼
Attach Clubhouse Credential
    │
    ▼
Configure Room
    │
    ▼
Start Bot
    │
    ▼
Bot joins Clubhouse Room
    │
    ├── user joins
    │      ↓
    │   welcome message
    │
    ├── message arrives
    │      ↓
    │   event processor
    │      ↓
    │   automation rules
    │      ↓
    │   AI decision
    │      ↓
    │   AI response
    │
    ├── speaker request
    │      ↓
    │   permission check
    │      ↓
    │   invite speaker
    │
    └── room ends
           ↓
        usage/event data
```

The system must support multiple bots and multiple rooms without relying on process-global mutable state.

---

# 33. Future Discord Compatibility

Do not implement Discord now.

However, the architecture must make this possible:

```text
core/
   Bot
   Room
   Message
   Event
   Automation
   AI

platforms/
   clubhouse/
      ClubhouseAdapter

   discord/
      DiscordAdapter   ← future
```

The AI, automation engine, bot manager, usage tracking and core domain must not depend directly on Clubhouse APIs.

Only the platform adapter should know about Clubhouse-specific APIs.

---

# 34. Critical Product Risk

The existing Clubhouse integration relies on private/undocumented Clubhouse API behavior and client impersonation.

Treat this as a major platform risk.

Therefore:

1. Keep Clubhouse integration isolated.
2. Do not spread Clubhouse assumptions into core business logic.
3. Make platform failures recoverable.
4. Implement clear adapter errors.
5. Do not assume Clubhouse endpoints are permanently stable.
6. Never hardcode platform-specific behavior into AI/business logic.

This is essential because the long-term product should be:

```text
AI Community Automation Platform
```

not:

```text
Clubhouse-only codebase
```

---

# 35. Final Instruction

**Implement the plan in the repository.**

Start by auditing the current repository and establishing the baseline.

Then execute the migration phase-by-phase.

For each phase:

```text
Analyze
→ Implement
→ Test
→ Typecheck
→ Lint
→ Build
→ Review
→ Document
→ Continue
```

Preserve existing working functionality unless there is a strong architectural reason to replace it.

At the end, provide a concise implementation report containing:

```text
1. What was changed
2. Files added
3. Files modified
4. Files removed
5. Architecture changes
6. Database changes
7. API changes
8. Worker/queue changes
9. Security improvements
10. Tests added
11. Remaining technical debt
12. Remaining MVP blockers
13. Recommended next steps
```

The final codebase must be **actually runnable**, not merely architecturally impressive.

Prioritize:

```text
Correctness
> Maintainability
> Security
> Reliability
> Extensibility
> Performance
> Feature count
```

Do not over-engineer.

Build the smallest clean architecture that can support the MVP t
