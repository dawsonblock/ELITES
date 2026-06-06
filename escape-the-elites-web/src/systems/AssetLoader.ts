import * as pc from "playcanvas";

/**
 * AssetLoader — central asset registry for Escape the Elites.
 *
 * In Alpha 0.5 (vertical slice) the game uses PlayCanvas procedural geometry
 * (boxes, cones, capsules) generated directly in SceneBuilder. This loader
 * provides the infrastructure for transitioning to real GLB assets without
 * changing any scene-building code.
 *
 * Usage:
 *   await assetLoader.init(app);
 *   const asset = assetLoader.get("props/crate");
 *   if (asset) entity.render!.asset = asset.id;
 */

export type AssetCategory = "environments" | "props" | "characters" | "documents";

export type AssetEntry = {
  id: string;           // logical name used to look up the asset
  category: AssetCategory;
  path: string;         // relative to /public/models/
  preload: boolean;     // true = load at startup, false = load on demand
};

/**
 * Full GLB manifest. Add new assets here as they are produced.
 * Paths are relative to /public/models/.
 */
export const ASSET_MANIFEST: AssetEntry[] = [
  // ── Environments ───────────────────────────────────────────────────
  { id: "env/dock_floor",          category: "environments", path: "environments/dock_floor.glb",          preload: true  },
  { id: "env/pier",                category: "environments", path: "environments/pier.glb",                preload: true  },
  { id: "env/mansion_office",      category: "environments", path: "environments/mansion_office.glb",      preload: false },
  { id: "env/service_corridor",    category: "environments", path: "environments/service_corridor.glb",    preload: false },
  { id: "env/security_wing",       category: "environments", path: "environments/security_wing.glb",       preload: false },
  { id: "env/bunker_server_room",  category: "environments", path: "environments/bunker_server_room.glb",  preload: false },
  { id: "env/broadcast_deck",      category: "environments", path: "environments/broadcast_deck.glb",      preload: false },

  // ── Props ───────────────────────────────────────────────────────────
  { id: "props/crate",             category: "props",        path: "props/crate.glb",                      preload: true  },
  { id: "props/filing_cabinet",    category: "props",        path: "props/filing_cabinet.glb",             preload: false },
  { id: "props/desk",              category: "props",        path: "props/desk.glb",                       preload: false },
  { id: "props/security_camera",   category: "props",        path: "props/security_camera.glb",            preload: true  },
  { id: "props/terminal_screen",   category: "props",        path: "props/terminal_screen.glb",            preload: false },
  { id: "props/server_rack",       category: "props",        path: "props/server_rack.glb",                preload: false },
  { id: "props/boat_hull",         category: "props",        path: "props/boat_hull.glb",                  preload: false },
  { id: "props/toolbox",           category: "props",        path: "props/toolbox.glb",                    preload: false },
  { id: "props/breaker_box",       category: "props",        path: "props/breaker_box.glb",                preload: false },
  { id: "props/bookshelf",         category: "props",        path: "props/bookshelf.glb",                  preload: false },

  // ── Characters ──────────────────────────────────────────────────────
  { id: "chars/guard_idle",        category: "characters",   path: "characters/guard_idle.glb",            preload: false },
  { id: "chars/guard_walk",        category: "characters",   path: "characters/guard_walk.glb",            preload: false },

  // ── Document overlays ───────────────────────────────────────────────
  { id: "docs/document_flat",      category: "documents",    path: "documents/document_flat.glb",          preload: false },
  { id: "docs/keycard",            category: "documents",    path: "documents/keycard.glb",                preload: false },
  { id: "docs/usb_drive",          category: "documents",    path: "documents/usb_drive.glb",              preload: false },
];

export class AssetLoaderSystem {
  private registry = new Map<string, pc.Asset>();
  private app: pc.Application | null = null;
  private initialized = false;

  /**
   * Initialize the loader with the PlayCanvas application.
   * Preloads all entries marked `preload: true`.
   * Gracefully skips missing files (returns null on get()).
   */
  async init(app: pc.Application): Promise<void> {
    this.app = app;
    this.initialized = true;

    const preloadTargets = ASSET_MANIFEST.filter((e) => e.preload);
    const promises = preloadTargets.map((entry) => this.loadEntry(entry));
    const results = await Promise.allSettled(promises);

    let loaded = 0;
    let skipped = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") loaded++;
      else {
        skipped++;
        // Expected during vertical slice — assets not yet produced
        console.debug(`[AssetLoader] Skipped: ${preloadTargets[i].path}`);
      }
    });

    console.info(`[AssetLoader] Init complete — ${loaded} loaded, ${skipped} skipped (placeholder)`);
  }

  /**
   * Load a single asset entry on demand.
   * Resolves immediately if already cached.
   */
  async load(id: string): Promise<pc.Asset | null> {
    if (this.registry.has(id)) return this.registry.get(id)!;
    const entry = ASSET_MANIFEST.find((e) => e.id === id);
    if (!entry) {
      console.warn(`[AssetLoader] Unknown asset id: ${id}`);
      return null;
    }
    try {
      return await this.loadEntry(entry);
    } catch {
      return null;
    }
  }

  /**
   * Synchronous get — returns null if not yet loaded.
   * Use after init() for preloaded assets.
   */
  get(id: string): pc.Asset | null {
    return this.registry.get(id) ?? null;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private loadEntry(entry: AssetEntry): Promise<pc.Asset> {
    return new Promise((resolve, reject) => {
      if (!this.app) { reject(new Error("App not set")); return; }
      if (this.registry.has(entry.id)) {
        resolve(this.registry.get(entry.id)!);
        return;
      }

      const asset = new pc.Asset(entry.id, "container", {
        url: `/models/${entry.path}`,
        filename: entry.path.split("/").pop() ?? entry.path,
      });

      asset.once("load", () => {
        this.registry.set(entry.id, asset);
        resolve(asset);
      });

      asset.once("error", (err: string) => {
        reject(new Error(`Asset load failed: ${entry.path} — ${err}`));
      });

      this.app.assets.add(asset);
      this.app.assets.load(asset);
    });
  }

  dispose() {
    this.registry.clear();
    this.app = null;
    this.initialized = false;
  }
}

export const assetLoader = new AssetLoaderSystem();
