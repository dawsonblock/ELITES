# Escape the Elites — Project Status

Status: **Alpha 0.6** — Playable vertical slice; scripts, refactor, and test coverage improvements.

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

### Gameplay
- Blocked door messages: player sees contextual reason when interaction is denied
- Terminal command buttons show exact missing evidence in tooltip when disabled
- Dock scene: fence line, mansion silhouette, security notice sign, boat wreckage
- Service entrance: pipes, breaker box with readable note, hiding alcove with detection zone
- Mansion office: bookshelf, file boxes, security monitor, monitor glow
- Camera cones change colour based on player proximity (safe / suspicious / detecting)
- Hiding zones: standing in the service entrance alcove reduces detection gain by 95%
- Patrol enemy in Security Wing: waypoint patrol, vision cone, hearing radius

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
- Audio assets beyond placeholder paths
- Additional e2e test coverage for stealth and broadcast sequence
- Performance profiling / bundle size budget
- Mobile layout polish
