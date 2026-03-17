# Virus Online Architecture

## Goals

- Deterministic game logic isolated from infrastructure.
- Authoritative multiplayer backend with reconnect and timeout support.
- Frontend driven by server state rather than client-side rules.
- Testability first, with package boundaries that support high coverage.

## Monorepo Layout

```text
apps/
  backend/      NestJS + Socket.IO + Redis authoritative server
  frontend/     Next.js client, room UI, game UI, chat UI
packages/
  game-engine/  Pure deterministic reducer-based rules engine
  shared-types/ Cross-app contracts and DTOs
  shared-utils/ Pure helpers shared across backend/frontend
```

## Architectural Boundaries

### `packages/game-engine`

- Pure TypeScript only.
- No framework, IO, timers, random source, Redis, or sockets.
- Accepts the current immutable state plus an action.
- Returns the next immutable state plus deterministic effects metadata.

Proposed engine contract:

```ts
type EngineResult = {
  state: GameState;
  events: DomainEvent[];
};

function applyAction(
  state: GameState,
  action: GameAction,
  context: DeterministicContext,
): EngineResult;
```

`DeterministicContext` carries values that are normally nondeterministic, such as shuffled deck order or an auto-move choice already computed by the caller. That keeps the engine reproducible in tests and on replay.

### `apps/backend`

- Owns room lifecycle, player sessions, timers, reconnect handling, bots, and Socket.IO transport.
- Stores authoritative room/session/game state in Redis.
- Calls `game-engine` for every rule decision.
- Persists timer metadata separately from engine state so time passage stays infrastructure-driven.

Key modules:

- `room`: create, join, leave, quick-join, invite links, room codes
- `match`: match startup, rematch, spectator admission
- `game`: action validation via engine, turn progression, winner detection
- `session`: reconnect tokens, presence, room expiration countdown
- `chat`: room-scoped message broadcast
- `redis`: repositories and optimistic concurrency helpers
- `socket`: event gateway, auth, serialization

### `apps/frontend`

- Renders server-provided room and game projections.
- Uses Zustand for client session/UI state, not authoritative rules.
- Sends intent events only, such as `play_card` or `discard_cards`.
- Supports reconnect by restoring session token and resubscribing to room streams.

UI slices:

- lobby
- room
- match
- chat
- presence

## State Model

### Engine State

The engine owns only match rules:

- players in match order
- hands
- table organs/modifiers
- draw pile
- discard pile
- active player
- turn phase
- winner

### Room State

The backend owns room/session concerns:

- room metadata and join policy
- seated players vs spectators
- presence/reconnect status
- countdown timers
- rematch readiness
- chat history window

This separation avoids contaminating the engine with transport or lifecycle state.

## Redis Strategy

- One Redis key namespace per room.
- Small aggregates:
  - room metadata
  - player presence/session data
  - current match snapshot
  - timer descriptors
- Use optimistic version fields on room/match records to prevent broad locks.
- Publish room updates through Socket.IO from backend workers after successful state transitions.

This is sufficient for the stated scale because each active game maps to a compact room-scoped aggregate and updates are serialized per room rather than globally locked.

## Realtime Flow

1. Client emits intent event.
2. Backend authenticates session and loads room aggregate from Redis.
3. Backend validates turn/session constraints.
4. Backend calls `game-engine.applyAction(...)`.
5. Backend stores new state and emits projections to room subscribers.
6. Backend schedules or clears timers as needed.

## Determinism Strategy

- No randomness inside reducers.
- Shuffle order generated outside the engine and passed in as data.
- Auto-move and bot move selection computed by backend strategy code, then submitted as explicit deterministic actions/parameters.
- Every applied action is replayable from persisted history.

## Testing Strategy

- `game-engine`: dense unit/property-style rule tests and reducer transition snapshots.
- `backend`: integration tests around Redis repositories, socket gateway flows, reconnect, timers, rematch, spectators, and bots.
- `frontend`: component tests for state projections and Playwright flows for room/match lifecycle.
- Coverage gate enforced per package and for the workspace total.
