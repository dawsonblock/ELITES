import * as pc from "playcanvas";
import { GameEvents } from "./GameEvents";
import { gameState } from "./GameState";
import { eventBus } from "../utils/eventBus";
import { Timer } from "../utils/timers";
import type { AABB } from "../utils/collision";
import { getTriggerMeta } from "../utils/entityMeta";
import { audioSystem } from "../systems/AudioSystem";
import { SceneBuilder } from "../scenes/SceneBuilder";
import { progressionSystem } from "./ProgressionSystem";
import { PlayerController } from "./controllers/PlayerController";
import { InteractionSystem } from "./interactions/InteractionSystem";
import { DoorSystem } from "./world/DoorSystem";
import { StealthSystem } from "./stealth/StealthSystem";

export type GameCallbacks = {
  onReady?: () => void;
  onSceneChange?: (sceneId: string) => void;
  onInteractTarget?: (target: { type: string; label: string } | null) => void;
  onSceneEnter?: (sceneId: string, sceneName: string) => void;
};

export class Game {
  app: pc.Application | null = null;
  canvas: HTMLCanvasElement | null = null;
  private currentSceneId = "dock";
  private callbacks: GameCallbacks = {};
  private interactables: pc.Entity[] = [];
  private sceneRoot: pc.Entity | null = null;
  private downloadTimer = new Timer();
  private walls: AABB[] = [];
  private playerController: PlayerController | null = null;
  private doorSystem: DoorSystem | null = null;
  private interactionSystem = new InteractionSystem();
  private stealthSystem = new StealthSystem();
  private resizeHandler: (() => void) | null = null;

  constructor() {}

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const app = new pc.Application(canvas, {
      mouse: new pc.Mouse(canvas),
      touch: new pc.TouchDevice(canvas),
      keyboard: new pc.Keyboard(window),
      elementInput: new pc.ElementInput(canvas),
    });
    this.app = app;
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.start();

    this.resizeHandler = () => app.resizeCanvas();
    window.addEventListener("resize", this.resizeHandler);

    this.playerController = new PlayerController(app);
    this.interactionSystem.cameraEntity = this.playerController.cameraEntity;
    this.stealthSystem.setEntities(this.sceneRoot, this.playerController.playerEntity);
    this.loadScene("dock");

    app.on("update", (dt) => this.update(dt));

    this.callbacks.onReady?.();
  }

  loadScene(sceneId: string) {
    if (!this.app) return;
    this.currentSceneId = sceneId;
    gameState.sceneId = sceneId;

    if (this.sceneRoot) {
      this.sceneRoot.destroy();
      this.sceneRoot = null;
    }
    this.interactables = [];
    this.walls = [];

    const root = new pc.Entity("SceneRoot");
    this.app.root.addChild(root);
    this.sceneRoot = root;

    const builder = new SceneBuilder(this.app);
    builder.buildScene(sceneId, root);
    this.walls = builder.walls;
    this.interactables = builder.interactables;

    if (this.doorSystem) {
      this.doorSystem.dispose();
    }
    this.doorSystem = new DoorSystem(this.walls);
    this.doorSystem.setDoors(builder.doors, this.walls);

    this.playerController?.resetPosition(sceneId);
    this.interactionSystem.interactables = this.interactables;
    this.stealthSystem.setEntities(this.sceneRoot, this.playerController?.playerEntity ?? null);

    const ambientMap: Record<string, Parameters<typeof audioSystem.startAmbient>[0]> = {
      dock: "storm",
      service_entrance: "indoor",
      mansion_office: "indoor",
      security_wing: "indoor",
      bunker_server_room: "bunker",
      broadcast_tower: "tower",
    };
    audioSystem.startAmbient(ambientMap[sceneId] || "indoor");

    this.callbacks.onSceneChange?.(sceneId);
    eventBus.emit(GameEvents.SCENE_LOAD, sceneId);
  }

  private update(dt: number) {
    if (!this.app || !this.playerController) return;
    if (gameState.paused || gameState.terminalOpen || gameState.evidenceBoardOpen) return;
    gameState.playtimeSeconds += dt;
    this.playerController.update(dt, this.walls);
    this.doorSystem?.update(dt);
    this.checkTriggers();
    this.stealthSystem.updateSweeps(dt);
    this.interactionSystem.updateRay();
    this.stealthSystem.updateDetection(dt);
    this.downloadTimer.update(dt * 1000);
  }

  private currentTrigger: string | null = null;

  private checkTriggers() {
    if (!this.playerController?.playerEntity || !this.sceneRoot) return;
    const ppos = this.playerController.playerEntity.getPosition();
    let insideAny = false;

    this.sceneRoot.children.forEach((child) => {
      const trig = getTriggerMeta(child as pc.Entity);
      if (!trig) return;
      const cpos = child.getPosition();
      const cscale = child.getLocalScale();
      const inside =
        ppos.x > cpos.x - cscale.x / 2 && ppos.x < cpos.x + cscale.x / 2 &&
        ppos.y > cpos.y - cscale.y / 2 && ppos.y < cpos.y + cscale.y / 2 &&
        ppos.z > cpos.z - cscale.z / 2 && ppos.z < cpos.z + cscale.z / 2;

      if (inside) {
        insideAny = true;
        if (this.currentTrigger !== trig.targetScene) {
          this.currentTrigger = trig.targetScene;
          this.callbacks.onSceneEnter?.(trig.targetScene, trig.sceneName);
          progressionSystem.handleSceneTransition(trig.targetScene);
          this.loadScene(trig.targetScene);
        }
      }
    });

    if (!insideAny) {
      this.currentTrigger = null;
    }
  }

  interact() {
    this.interactionSystem.interact();
  }

  removeInteractable(entity: pc.Entity) {
    this.interactionSystem.removeInteractable(entity);
    this.interactables = this.interactables.filter((item) => item !== entity);
  }

  setCallbacks(cbs: GameCallbacks) {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  getSceneId() {
    return this.currentSceneId;
  }

  getPlaytime() {
    return gameState.playtimeSeconds;
  }

  getPlayerSnapshot() {
    return this.playerController?.getSnapshot(this.currentSceneId) ?? {
      sceneId: this.currentSceneId,
      position: [0, 1.7, 0] as [number, number, number],
      yaw: 0,
      pitch: 0,
    };
  }

  loadPlayerSnapshot(snapshot: { sceneId: string; position: [number, number, number]; yaw: number; pitch: number }) {
    if (snapshot.sceneId !== this.currentSceneId) {
      this.loadScene(snapshot.sceneId);
    }
    this.playerController?.loadSnapshot(snapshot);
  }

  dispose() {
    this.interactionSystem.dispose();
    this.stealthSystem.dispose();
    this.doorSystem?.dispose();
    this.doorSystem = null;
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.app) {
      this.app.destroy();
      this.app = null;
    }
    this.playerController = null;
    this.sceneRoot = null;
  }
}
