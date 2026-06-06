# Repair Checklist

## Critical
- [ ] Add Playwright browser playthrough tests
- [ ] Validate save/load after scene transition
- [ ] Validate continue game from menu
- [ ] Validate broadcast ending from real UI path
- [ ] Add no-pointer-lock fallback
- [ ] Add release build smoke test

## Architecture
- [ ] Split Game.ts (target <250 lines)
- [ ] Split App.tsx
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
