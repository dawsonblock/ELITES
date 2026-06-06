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
- `src/scenes/` — Not used; scenes are built procedurally in `Game.ts` via `buildScene()`
- `src/systems/` — Game logic (`EvidenceSystem`, `ObjectiveSystem`, `EndingSystem`)
- `src/ui/` — React overlay components (`MainMenu`, `HUD`, `EvidenceBoard`, `TerminalUI`, `PauseMenu`, `SettingsPanel`, `EndingScreen`, `LoadingScreen`)
- `src/data/` — JSON content (evidence, objectives, terminals, endings, scenes)
- `src/types/` — Shared TypeScript types

## Key Files
- `src/App.tsx` — Main React component; bridges PlayCanvas canvas and React UI
- `src/game/Game.ts` — Core PlayCanvas app; handles scenes, player, camera sweeps, detection, interaction raycast
- `src/game/GameState.ts` — Central game state singleton
- `src/utils/eventBus.ts` — Simple pub/sub for cross-layer communication

## Deployment
The `dist/` folder is ready for static hosting (Netlify, Vercel, GitHub Pages).
No server-side rendering required.

## Content Boundaries
- Entirely fictional island, elites, and network.
- No real victim names, no explicit abuse scenes.
- Horror is implied through documents, logs, surveillance, and environment.
