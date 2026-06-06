# Agent Notes: Escape the Elites: The Broadcast

## Build & Test Commands

```bash
npm install
npm run dev      # Start dev server on port 3000
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build
npm test         # Run Vitest tests
npm run lint     # TypeScript check only
```

## Stack
- **Vite** — build tool and dev server
- **React 18** — UI overlay (menus, HUD, evidence board, terminals, endings)
- **TypeScript** — strict mode enabled
- **PlayCanvas** — 3D engine (player movement, scenes, lighting, cameras)
- **Zustand** — available but not used; game state uses custom `GameStateManager`
- **Vitest** — testing

## Architecture
- `src/game/` — PlayCanvas integration (`Game.ts`, `GameState.ts`, `InputManager.ts`)
- `src/game/stealth/` — `StealthSystem.ts` (camera detection, hiding zones, guard FSM)
- `src/game/controllers/` — `PlayerController.ts` (movement, noise emission, head bob)
- `src/scenes/` — `SceneBuilder.ts` builds scenes procedurally from typed helpers
- `src/systems/` — Game logic (`EvidenceSystem`, `ObjectiveSystem`, `EndingSystem`, `AudioSystem`, `AssetLoader`)
- `src/ui/` — React overlay components (`MainMenu`, `HUD`, `EvidenceBoard`, `TerminalUI`, `PauseMenu`, `SettingsPanel`, `EndingScreen`, `LoadingScreen`, `BroadcastSequence`)
- `src/data/` — JSON content (evidence, objectives, terminals, endings, scenes)
- `src/data/levels/` — JSON level schemas (pilot: `service_entrance.json`)
- `src/types/` — Shared TypeScript types (`levelSchema.ts` defines the level JSON format)
- `src/app/hooks/` — React hooks extracted from App.tsx (`useGameLifecycle`, `useGameEvents`, `useDevTestHooks`)
- `src/utils/commandBus.ts` — Typed command dispatcher for all game state mutations

## Key Files
- `src/App.tsx` — Main React component (224 lines); wires hooks and JSX, no business logic
- `src/app/hooks/useGameLifecycle.ts` — startGame, continueGame, quitToMenu, initGame
- `src/app/hooks/useGameEvents.ts` — keyboard, interact, download, broadcast event handlers
- `src/app/hooks/useDevTestHooks.ts` — `__ETE_TEST__` dev hooks (DEV only, absent from production bundle)
- `src/game/Game.ts` — Core PlayCanvas app; scene loading, patrol spawning, update loop
- `src/game/GameState.ts` — Central game state singleton
- `src/utils/eventBus.ts` — Simple pub/sub for cross-layer communication
- `src/utils/commandBus.ts` — `dispatchGameCommand()` — route all state mutations here

## Level Schema
JSON levels live in `src/data/levels/`. Format defined in `src/types/levelSchema.ts`.
The schema supports: floor/wall/ceiling, prop, evidence, note, terminal, door, camera,
hiding_zone, light, trigger entities. Add new entity types to `LevelEntity` union first.
SceneBuilder procedural methods are the authoritative source until a level's JSON is validated.

## Guard FSM
`PatrolEnemy` in `src/game/stealth/StealthSystem.ts` implements a 4-state FSM:
  `patrol → investigate → alert → returnToPatrol → patrol`
Transitions are detection-value driven. Barks emitted via `GameEvents.SYSTEM_MESSAGE`.
One guard spawns in `security_wing` (see `Game.ts` line ~114).

## Command Bus
All game state mutations should go through `dispatchGameCommand()` in `src/utils/commandBus.ts`.
This provides centralized logging in DEV mode and a single place to trace state changes.
Commands: COLLECT_EVIDENCE, COMPLETE_OBJECTIVE, UNLOCK_DOOR, SET_LOCKDOWN, SET_ALERT,
START_BROADCAST, COMPLETE_BROADCAST, SAVE_GAME, LOAD_GAME, OPEN_TERMINAL, CLOSE_TERMINAL, SYSTEM_MESSAGE.

## Noise System
`audioSystem.emitNoise(position, radius, strength)` in `AudioSystem.ts`.
`PlayerController` calls it every frame when moving. Stance multipliers: sprint=2.5, walk=1.0, crouch=0.25.
Surface multipliers (concrete=1.0) are a TODO — set surfaceMult=1.0 until surface detection exists.

## Deployment
The `dist/` folder is ready for static hosting (Netlify, Vercel, GitHub Pages).
No server-side rendering required.

## Content Boundaries
- Entirely fictional island, elites, and network.
- No real victim names, no explicit abuse scenes.
- Horror is implied through documents, logs, surveillance, and environment.
