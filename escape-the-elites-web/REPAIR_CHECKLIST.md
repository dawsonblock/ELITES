# Repair Checklist

## Critical Remaining
- [ ] Fix callback ordering before Game.init()
- [ ] Unify start/continue callbacks
- [ ] Fix unknown evidence ID poisoning
- [ ] Remove collected evidence props immediately
- [ ] Add production-preview e2e test
- [ ] Add real terminal/download e2e test
- [ ] Fix stale docs
- [ ] Document/fix npm audit vulnerabilities

## Architecture
- [x] Split Game.ts (target <250 lines)
- [x] Split App.tsx callback logic
- [ ] Move interactable metadata away from `as any`
- [ ] Add typed command handlers

## Gameplay
- [ ] Polish first 5-minute route (dock → service entrance → mansion office)
- [ ] Add fair camera cones
- [ ] Add hiding zones
- [ ] Add one patrol enemy
- [ ] Add final broadcast pressure sequence

## Release
- [ ] Fix audit vulnerabilities or document accepted risk
- [ ] Add deployment config
- [ ] Add performance budget checks
- [ ] Add compressed asset pipeline
