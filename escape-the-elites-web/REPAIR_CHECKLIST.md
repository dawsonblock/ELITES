# Repair Checklist

## Completed
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

## Critical Remaining
- [ ] Split dev e2e tests from production e2e tests
- [ ] Ensure test:e2e:prod runs only production-safe tests
- [ ] Add production test proving __ETE_TEST__ is absent
- [ ] Add browser evidence interaction test using real keypress
- [ ] Add browser save/load/continue test using UI path
- [ ] Add SECURITY_NOTES.md
- [ ] Update README run/test instructions
- [ ] Add release verification script

## Enhancement Remaining
- [ ] Polish dock → service entrance → mansion office route
- [ ] Add readable camera cones
- [ ] Add hiding zones
- [ ] Add one patrol enemy
- [ ] Add better blocked-door messages
- [ ] Add final broadcast pressure sequence
- [ ] Add basic GLB asset pipeline
- [ ] Move remaining static inline styles to CSS
