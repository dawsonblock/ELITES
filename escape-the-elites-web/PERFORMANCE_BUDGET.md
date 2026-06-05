# Performance Budget

## Targets
- Initial load: < 3s on fast 3G
- FPS: stable 60fps on mid-range laptop
- Memory: < 200MB during gameplay
- Texture budget: 2048x2048 max, prefer 1024x1024
- Draw calls: < 200 per scene
- Triangle count: < 100k per scene

## Rules
- No huge texture files in v1
- No runaway render loops
- Dispose scenes properly on change
- Pool reused materials/meshes where possible
- Prefer greybox + mood lighting over heavy assets for v1
