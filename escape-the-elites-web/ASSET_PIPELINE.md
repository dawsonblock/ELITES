# Asset Pipeline — Escape the Elites: The Broadcast

## Status: Alpha 0.5 Vertical Slice
All geometry is currently procedural (PlayCanvas primitives in SceneBuilder.ts).
This document defines the pipeline for transitioning to real GLB assets.

---

## Folder Structure

```
public/
├── models/
│   ├── environments/    # Scene geometry (floors, walls, architectural elements)
│   ├── props/           # Interactive and decorative props
│   ├── characters/      # NPC meshes and animation GLBs
│   └── documents/       # Evidence item meshes (document flats, keycard, USB)
├── textures/
│   ├── environment/     # Wall, floor, ceiling, skybox textures
│   └── ui/              # UI sprites and icon atlases
├── audio/
│   ├── ambience/        # Looping ambient tracks
│   ├── alerts/          # Detection beeps, lockdown alarms
│   ├── terminals/       # Terminal boot, typing, tone SFX
│   └── ui/              # UI click, confirm, cancel SFX
└── fonts/               # Web fonts (Inter)
```

---

## GLB Format Requirements

- **Format:** glTF 2.0 binary (.glb)
- **Scale:** 1 unit = 1 metre (match PlayCanvas default)
- **Coordinate system:** Y-up, Z-forward (PlayCanvas convention)
- **Mesh origin:** Bottom-centre for props; scene origin for environments
- **Animations:** Baked into the GLB, named by action (e.g. `Guard_Walk`, `Guard_Idle`)
- **Materials:** PBR metallic-roughness. No embedded textures for assets > 512px — reference external textures.
- **Polygon budget (guidance):**
  - Environment sections: < 20k triangles per room
  - Hero props (desk, cabinet): < 2k triangles
  - Background props: < 500 triangles
  - Characters: < 5k triangles (skin + clothing)

---

## Asset Manifest

All expected assets are listed in `src/systems/AssetLoader.ts` under `ASSET_MANIFEST`.
Add new entries there before creating the GLB file.

### Integration Pattern

When a GLB for a prop is ready, update `SceneBuilder.ts` to load it instead of the placeholder primitive:

```typescript
// Before (procedural placeholder):
this.addProp(root, "Toolbox", [2.5, 0.3, -3], [0.6, 0.6, 0.4], new pc.Color(0.18, 0.16, 0.14));

// After (GLB asset):
const toolboxAsset = assetLoader.get("props/toolbox");
if (toolboxAsset) {
  const entity = new pc.Entity("Toolbox");
  entity.addComponent("render", { type: "asset", asset: toolboxAsset });
  entity.setPosition(2.5, 0.3, -3);
  root.addChild(entity);
} else {
  // fallback to procedural if asset not loaded
  this.addProp(root, "Toolbox", [2.5, 0.3, -3], [0.6, 0.6, 0.4], new pc.Color(0.18, 0.16, 0.14));
}
```

---

## Audio Format

- **Format:** OGG Vorbis for ambience/SFX; MP3 fallback
- **Sample rate:** 44.1kHz
- **Bit depth:** 16-bit
- **Ambience loops:** Seamless, > 30s to avoid noticeable loops
- **SFX:** < 3s, normalised to -6 dBFS peak

---

## Texture Format

- **Format:** WebP (primary), PNG fallback
- **Environment textures:** 1024×1024 or 2048×2048 max
- **UI sprites:** 512×512 or smaller
- **Normal maps:** DirectX convention (Y-up)

---

## Production Checklist (per asset)

- [ ] Origin at bottom-centre (props) or scene origin (environments)
- [ ] Correct scale (1 unit = 1 metre)
- [ ] PBR materials assigned
- [ ] No loose vertices or open edges
- [ ] UV unwrap complete (no overlapping UVs)
- [ ] LODs provided for environment meshes > 5k tris
- [ ] Added to `ASSET_MANIFEST` in `AssetLoader.ts`
- [ ] Tested in-game with fallback disabled
