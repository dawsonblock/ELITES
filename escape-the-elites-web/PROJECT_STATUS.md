# Escape the Elites — Current Status

Status: Alpha vertical slice.

## Known stable
- npm ci works from clean source
- npm run lint passes
- npm test passes (24 tests across 4 files)
- npm run build passes
- Core progression data validates
- Server archive download now collects evidence
- Bunker code uses player-visible 7391
- Dynamic imports split PlayCanvas from main bundle
- Source maps disabled in production
- Unused dependency (zustand) removed

## Not release-ready
- Gameplay is mostly greybox/procedural
- No browser-level playthrough tests
- Save/load needs full browser validation
- Stealth is shallow
- Asset pipeline is missing
- Dependency audit has vulnerabilities
- Game.ts is still ~495 lines (target: <250 after extraction)
- Scattered `as any` metadata on PlayCanvas entities
- No real asset pipeline (only primitive boxes)
- Mobile controls exist but need more testing
- First 5-minute route needs environmental storytelling polish
