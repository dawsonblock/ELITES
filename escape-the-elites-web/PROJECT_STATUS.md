# Escape the Elites — Project Status

Status: **Alpha 0.7** — First route quality pass: gameplay, stealth, noise, guard FSM, command bus, JSON level schema pilot.

## Verified (Alpha 0.5)
- Clean source package (verify:release-package passes)
- No bundled node_modules, dist, test-results, or playwright-report in source tree
- `npm ci` works from clean source
- `npm run lint` passes (TypeScript strict — no errors)
- `npm test` passes: 31/31 unit tests
- `npm run build` passes cleanly

## What's In This Release

### Test Infrastructure
- Dev e2e tests in `e2e/dev/` (use `__ETE_TEST__` hooks, never run in production)
- Production e2e tests in `e2e/prod/` (no hooks, safe for CI against production build)
- Stealth e2e tests: detection rise/fall, hiding zone suppression, patrol detection (`e2e/dev/stealth.spec.ts`)
- Broadcast e2e tests: checklist UI, upload progress, sequence completion (`e2e/dev/broadcast.spec.ts`)
- `playwright.config.ts` → dev tests; `playwright.prod.config.ts` → prod tests
- `scripts/verify-release.mjs` — checks for forbidden artifacts before packaging
  - Standard mode: `npm run verify:release-package`
  - Strict mode (also checks node_modules): `npm run verify:release-package:strict`
- `npm run clean` — removes dist, test-results, playwright-report
- `npm run verify:full` — clean + lint + test + build + e2e (repeatable, no state bleed)
- `npm run verify:package` — clean + artifact check

### UI Polish
- Static inline styles progressively extracted to `src/styles/ui.css`
- Credits overlay inline styles moved to `.credits-overlay` CSS class (Alpha 0.6)
- Remaining acceptable dynamic inline values: detection width, alert tint, progress CSS variables, grid-area layout in MobileControls, importance border color in EvidenceBoard
- CSS class names follow BEM-style conventions throughout

### Gameplay — Alpha 0.7 First Route Quality Pass

**Dock scene additions:**
- Second crate cluster (Crate_D/E stacked, two barrels) on left side of dock
- Dock work log note on clipboard (interactable, reveals estate context)
- Security camera on right wall with sweep cone and red warning light

**Service entrance additions:**
- Second camera (cam_service_02) on right wall covering the far corridor end
- Warning stripe painted on floor under second camera (visual readability cue)
- Patrol schedule note on wall (reveals route and guard timing)

**Mansion office additions:**
- Armchair in corner (4-part: back, seat, two arms)
- Rug under desk
- Window light shaft with spot light for atmosphere
- Framed picture on back wall

**Stealth — guard FSM:**
- `PatrolEnemy` now runs a full 4-state FSM: `patrol → investigate → alert → returnToPatrol`
- Detection-value-driven transitions with per-state timers
- Suspicion barks emitted as `SYSTEM_MESSAGE` events on every transition
- Alert state triggers lockdown idempotently
- `playGuardAlert(state)` audio cues: suspicious (two rising tones), investigate (three ticks), alert (five descending pulses)

**Noise system:**
- `audioSystem.emitNoise(position, radius, strength)` added
- `PlayerController` emits noise every frame when moving; stance multipliers: sprint=2.5, walk=1.0, crouch=0.25
- `NOISE_EMITTED` event added to `GameEvents`

**Command bus:**
- `src/utils/commandBus.ts` — `dispatchGameCommand()` with typed union
- All interact-triggered state mutations in `useGameEvents.ts` routed through command bus
- Commands: COLLECT_EVIDENCE, COMPLETE_OBJECTIVE, UNLOCK_DOOR, SET_LOCKDOWN, SET_ALERT, START_BROADCAST, COMPLETE_BROADCAST, SAVE_GAME, LOAD_GAME, OPEN_TERMINAL, CLOSE_TERMINAL, SYSTEM_MESSAGE
- DEV mode logs every dispatched command to console

**JSON level schema (pilot):**
- `src/types/levelSchema.ts` — typed schema covering all entity types the first route uses
- `src/data/levels/service_entrance.json` — pilot level definition (mirrors current procedural build)
- Schema supports: floor, wall, ceiling, prop, evidence, note, terminal, door, camera, hiding_zone, light, trigger
- Procedural SceneBuilder methods remain authoritative; JSON is the schema reference

**Existing gameplay (carried from Alpha 0.5/0.6):**
- Blocked door messages, terminal command tooltips
- Camera cones change colour by proximity, hiding zone reduces detection by 95%
- Patrol enemy in Security Wing (now with full FSM)

### Broadcast / Ending
- Broadcast triggers evidence checklist UI before upload
- Fake upload animation with log lines and progress bar
- Four endings each have an "explanation" paragraph describing what actually happened
- Ending news segments expanded and more specific

### Asset Pipeline
- `src/systems/AssetLoader.ts` — full GLB manifest (22 entries), graceful skip if files missing
- `ASSET_PIPELINE.md` — format requirements, folder structure, integration pattern
- `public/models/` subdirectories in place with `.gitkeep`

### Accessibility
- Settings panel now has three tabs: Graphics / Audio / Controls
- Full key remapping for 11 actions, persisted to localStorage
- High Contrast mode: CSS variable override + thicker borders + focus rings
- Reduce Motion mode: collapses all CSS animations/transitions to ~0ms

## Security
See `SECURITY_NOTES.md` for full npm audit status and accepted risk assessment.

## Not Yet In This Release
- Real GLB assets (game uses PlayCanvas procedural geometry — intentional for this slice)
- Audio assets beyond procedural Web Audio (no .mp3/.ogg authored files yet)
- Surface-specific noise multipliers (concrete=1.0 default until surface detection added)
- SceneBuilder reading from JSON level files (schema exists, loader integration pending)
- Performance profiling / bundle size budget
- Mobile layout polish
- Additional production e2e tests for stealth and broadcast smoke paths
