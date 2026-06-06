# Repair Checklist — Alpha 0.5 Complete

## Completed (Alpha 0.4 baseline)
- [x] Clean package
- [x] Remove nested ZIP/test junk
- [x] Fix callback ordering before Game.init()
- [x] Unify start/continue callback lifecycle
- [x] Fix unknown evidence ID poisoning
- [x] Remove collected evidence props immediately
- [x] Add production-preview e2e config
- [x] Add real terminal/download e2e test
- [x] Add @types/node
- [x] Remove test hooks from production bundle

## Completed (Alpha 0.5)
- [x] Split dev e2e tests into e2e/dev/ (hook-based)
- [x] Split prod e2e tests into e2e/prod/ (no hooks)
- [x] Production smoke test proves __ETE_TEST__ absent
- [x] Dev evidence interaction test using real keypress
- [x] SECURITY_NOTES.md added with npm audit analysis
- [x] README updated with accurate test instructions
- [x] Release verification script (scripts/verify-release.mjs)
- [x] All static inline styles moved to ui.css (dynamic values remain inline)
- [x] Blocked-door messages with contextual reasons
- [x] Terminal disabled command buttons show missing evidence in tooltip
- [x] Dock scene: fence, silhouette, sign, wreckage, additional lighting
- [x] Service entrance: pipes, breaker box, hiding alcove, flickering light
- [x] Mansion office: bookshelf, file boxes, security monitor
- [x] Camera cones: colour changes based on player proximity/detection state
- [x] Hiding zone: alcove in service entrance reduces detection gain 95%
- [x] Patrol enemy: Security Wing guard with waypoints, vision, hearing
- [x] Broadcast sequence: evidence checklist → upload animation → ending
- [x] Endings: explanation panel, expanded news segments
- [x] Asset pipeline: AssetLoader.ts with GLB manifest, ASSET_PIPELINE.md
- [x] Settings: three tabs (Graphics/Audio/Controls), key remapping, Reduce Motion, High Contrast

## Remaining for Alpha 0.6
- [ ] Real GLB assets replacing procedural geometry
- [ ] Audio assets (ambience, SFX, terminal sounds)
- [ ] Additional e2e coverage for stealth flow and broadcast sequence
- [ ] Performance budget: bundle size targets
- [ ] Mobile layout polish
- [ ] Gamepad support
