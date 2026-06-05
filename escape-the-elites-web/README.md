# Escape the Elites: The Broadcast

<p align="center">
  <b>An investigative survival-horror game built for the browser.</b><br>
  <i>Uncover the truth. Expose the network. Survive the island.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/PlayCanvas-1.71-orange?logo=webgl" alt="PlayCanvas">
  <img src="https://img.shields.io/badge/Vite-5.3-646CFF?logo=vite" alt="Vite">
</p>

## Overview

**Escape the Elites: The Broadcast** is a browser-based first-person investigative thriller. You play as an infiltrator on a remote island facility, gathering evidence of an offshore elite network while avoiding detection. The game combines first-person stealth and exploration with a deep narrative driven by documents, terminal logs, and environmental storytelling.

- **3D Exploration** — Navigate the island using PlayCanvas-powered first-person movement
- **Stealth Mechanics** — Avoid security cameras, time your movements, and stay hidden
- **Evidence Collection** — Discover and connect documents, logs, and recordings to build your case
- **Terminal Puzzles** — Hack into security systems, unlock doors, and download archives
- **Multiple Endings** — Your thoroughness determines how much of the truth gets out

## Tech Stack

| Layer | Technology |
|-------|------------|
| 3D Engine | [PlayCanvas](https://playcanvas.com/) |
| UI Framework | [React 18](https://react.dev/) |
| Language | [TypeScript](https://www.typescriptlang.org/) (strict mode) |
| Build Tool | [Vite](https://vitejs.dev/) |
| Testing | [Vitest](https://vitest.dev/) |
| State | Custom `GameStateManager` + EventBus |
| Audio | Web Audio API (procedural SFX + ambient layers) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (LTS recommended)
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/dawsonblock/elites.git
cd elites/escape-the-elites-web

# Install dependencies
npm install
```

### Development

```bash
# Start the dev server
npm run dev

# Or with explicit host/port
npm run dev -- --host 0.0.0.0 --port 3000
```

Open `http://localhost:3000` in your browser.

### Build & Preview

```bash
# Type-check and build for production
npm run build

# Preview the production build locally
npm run preview
```

The `dist/` folder is ready for static hosting (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.).

### Testing

```bash
# Run all tests once
npm test

# Watch mode
npm run test:watch

# Type-check only
npm run lint
```

## Project Structure

```
escape-the-elites-web/
├── public/                  # Static assets
├── src/
│   ├── game/                # PlayCanvas integration & game loop
│   │   ├── Game.ts          # Core 3D app, scenes, player, camera
│   │   ├── GameState.ts     # Central game state singleton
│   │   ├── InputManager.ts  # Mouse, keyboard, pointer lock
│   │   ├── GameEvents.ts    # Event constants
│   │   └── SaveManager.ts   # Save/load serialization
│   ├── systems/             # Gameplay systems
│   │   ├── EvidenceSystem.ts
│   │   ├── ObjectiveSystem.ts
│   │   ├── EndingSystem.ts
│   │   └── AudioSystem.ts   # Procedural audio engine
│   ├── ui/                  # React overlay components
│   │   ├── App.tsx          # Main bridge between 3D and React
│   │   ├── TerminalUI.tsx   # In-world terminal interfaces
│   │   ├── EvidenceBoard.tsx # Evidence connection board
│   │   ├── SettingsPanel.tsx
│   │   ├── HUD.tsx
│   │   ├── MainMenu.tsx
│   │   └── ...
│   ├── data/                # JSON-driven content
│   │   ├── evidence.json    # Evidence items & metadata
│   │   ├── objectives.json  # Mission objectives & gates
│   │   ├── terminals.json   # Terminal configs & commands
│   │   ├── scenes.json      # Scene spawns & lighting
│   │   └── endings.json     # Ending conditions & text
│   ├── types/               # Shared TypeScript interfaces
│   └── utils/               # Utilities
│       ├── eventBus.ts      # Pub/sub for cross-layer comms
│       └── storage.ts       # localStorage helpers
├── tests/                   # Vitest test suite
│   └── validation.test.ts # Data graph integrity tests
├── index.html
├── vite.config.ts
└── tsconfig.json
```

## Architecture

### Game Loop

The core game loop runs inside a PlayCanvas `Application`, handling:

- **Player Movement** — WASD + mouse look with head bobbing, crouching, and leaning
- **Collision Detection** — AABB-based world collision with doors and walls
- **Interaction Raycast** — Crosshair-based interactables (evidence, doors, terminals)
- **Camera Sweeps** — Rotating security cameras with detection cones
- **Stealth Detection** — Suspicion meter based on camera visibility and proximity

### UI Layer

React overlays the WebGL canvas using absolute positioning. UI screens are conditionally rendered based on game state:

- **Main Menu** — Start game, settings, credits
- **HUD** — Detection meter, objective tracker, evidence count
- **TerminalUI** — Retro CRT-style terminal interface with command execution
- **EvidenceBoard** — Grid of collected evidence with corroboration links
- **Pause Menu** — Resume, settings, save/load, quit

### State Management

Game state is managed by a central `GameStateManager` singleton, persisted to `localStorage` for settings and to save slots for game progress. Cross-layer communication uses a lightweight `EventBus`.

## Game Content

### Scenes

| Scene | Purpose | Tone |
|-------|---------|------|
| **Dock** | Movement & flashlight tutorial | Isolation |
| **Service Entrance** | Stealth & camera avoidance | The island is still active |
| **Mansion Office** | Evidence board & institutional cover | Luxury hiding logistics |
| **Security Wing** | Surveillance scale reveal | You are being watched |
| **Bunker Server Room** | Main evidence download; triggers lockdown | The hidden system is real |
| **Broadcast Tower** | Final upload & ending | Cold release |

### Key Mechanics

- **Evidence Gates** — Some objectives require specific evidence before they activate
- **Corroboration** — Connected evidence pieces strengthen your broadcast readiness
- **Terminal Unlocking** — Code-based or evidence-based terminal access
- **Lockdown** — Triggered after downloading the server archive; escape under pressure
- **Multiple Endings** — 4 endings from "The Story Dies" to the secret "One Node" reveal

## Contributing

Contributions are welcome. Please ensure your changes:

1. Pass `npm run lint` (strict TypeScript)
2. Pass `npm test` (all validation and unit tests)
3. Follow the existing code style and patterns
4. Respect the content boundaries outlined below

## Content Boundaries

This project is entirely fictional. To maintain ethical storytelling:

- No real victim names or likenesses
- No explicit abuse scenes
- No direct real-person criminal accusations
- Horror is implied through documents, logs, surveillance, and environmental storytelling

## License

[MIT](LICENSE) &copy; Dawson Block

---

<p align="center">
  Built with <a href="https://playcanvas.com/">PlayCanvas</a>, <a href="https://react.dev/">React</a>, and <a href="https://vitejs.dev/">Vite</a>.
</p>
