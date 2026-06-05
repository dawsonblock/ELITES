import * as pc from "playcanvas";
import { GameConfig } from "./GameConfig";
import { GameEvents } from "./GameEvents";
import { gameState } from "./GameState";
import { inputManager } from "./InputManager";
import { eventBus } from "../utils/eventBus";
import { Timer } from "../utils/timers";
import { clamp, lerp } from "../utils/math";
import type { AABB } from "../utils/collision";
import { entityToAABB, resolveCircleAABB } from "../utils/collision";
import { audioSystem } from "../systems/AudioSystem";

export type GameCallbacks = {
  onReady?: () => void;
  onSceneChange?: (sceneId: string) => void;
  onInteractTarget?: (target: { type: string; label: string } | null) => void;
  onSceneEnter?: (sceneId: string, sceneName: string) => void;
};

export class Game {
  app: pc.Application | null = null;
  canvas: HTMLCanvasElement | null = null;
  private playerEntity: pc.Entity | null = null;
  private cameraEntity: pc.Entity | null = null;
  private flashlightEntity: pc.Entity | null = null;
  private currentSceneId = "dock";
  private callbacks: GameCallbacks = {};
  private interactables: pc.Entity[] = [];
  private sceneRoot: pc.Entity | null = null;
  private downloadTimer = new Timer();
  private walls: AABB[] = [];
  private doors: { entity: pc.Entity; aabb: AABB; open: boolean; targetOpen: boolean; speed: number; meta: Record<string, unknown>; basePos: pc.Vec3 }[] = [];
  private moveTime = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private currentFov: number = GameConfig.camera.fov;

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

    window.addEventListener("resize", () => app.resizeCanvas());

    this.createPlayer();
    this.loadScene("dock");

    app.on("update", (dt) => this.update(dt));

    this.callbacks.onReady?.();
  }

  private createPlayer() {
    if (!this.app) return;

    const player = new pc.Entity("Player");
    player.setPosition(0, GameConfig.player.height / 2, 0);
    this.app.root.addChild(player);
    this.playerEntity = player;

    const camera = new pc.Entity("Camera");
    camera.addComponent("camera", {
      clearColor: new pc.Color(0.015, 0.015, 0.02),
      fov: GameConfig.camera.fov,
      nearClip: GameConfig.camera.nearClip,
      farClip: GameConfig.camera.farClip,
    });
    camera.setPosition(0, 0, 0);
    player.addChild(camera);
    this.cameraEntity = camera;

    const light = new pc.Entity("Flashlight");
    light.addComponent("light", {
      type: "spot",
      color: new pc.Color(0.98, 0.95, 0.88),
      intensity: 0,
      range: 22,
      spotAngle: 38,
      innerConeAngle: 28,
      castShadows: true,
      shadowResolution: 1024,
      shadowDistance: 25,
      normalOffsetBias: 0.05,
    });
    light.setLocalPosition(0.15, -0.12, 0.1);
    light.setLocalEulerAngles(0, 0, 0);
    camera.addChild(light);
    this.flashlightEntity = light;
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
    this.doors = [];
    this.moveTime = 0;

    const root = new pc.Entity("SceneRoot");
    this.app.root.addChild(root);
    this.sceneRoot = root;

    this.buildScene(sceneId, root);

    // Ambient audio per scene
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

  private buildScene(id: string, root: pc.Entity) {
    if (!this.app) return;

    const sceneDefs: Record<string, { name: string; fogColor: [number, number, number]; fogDensity: number }> = {
      dock: { name: "Storm Dock", fogColor: [0.02, 0.025, 0.035], fogDensity: 0.035 },
      service_entrance: { name: "Service Entrance", fogColor: [0.03, 0.03, 0.04], fogDensity: 0.02 },
      mansion_office: { name: "Mansion Office", fogColor: [0.04, 0.035, 0.03], fogDensity: 0.015 },
      security_wing: { name: "Security Wing", fogColor: [0.02, 0.025, 0.03], fogDensity: 0.018 },
      bunker_server_room: { name: "Bunker Server Room", fogColor: [0.015, 0.015, 0.02], fogDensity: 0.012 },
      broadcast_tower: { name: "Broadcast Tower", fogColor: [0.025, 0.025, 0.03], fogDensity: 0.03 },
    };
    const preset = sceneDefs[id];

    this.app.scene.fog = pc.FOG_EXP2;
    this.app.scene.fogColor = new pc.Color(...preset.fogColor);
    this.app.scene.fogDensity = preset.fogDensity;

    switch (id) {
      case "dock": this.buildDock(root); break;
      case "service_entrance": this.buildServiceEntrance(root); break;
      case "mansion_office": this.buildMansionOffice(root); break;
      case "security_wing": this.buildSecurityWing(root); break;
      case "bunker_server_room": this.buildBunker(root); break;
      case "broadcast_tower": this.buildBroadcastTower(root); break;
    }
  }

  private createMaterial(color: pc.Color, emissive?: pc.Color, gloss?: number): pc.StandardMaterial {
    const mat = new pc.StandardMaterial();
    mat.diffuse = color;
    if (emissive) mat.emissive = emissive;
    (mat as any).shininess = gloss ?? 20;
    (mat as any).metalness = gloss !== undefined ? 0.3 : 0.1;
    mat.update();
    return mat;
  }

  private addWall(root: pc.Entity, name: string, pos: [number, number, number], scale: [number, number, number], color: pc.Color, emissive?: pc.Color) {
    const box = new pc.Entity(name);
    box.addComponent("render", { type: "box" });
    box.setPosition(...pos);
    box.setLocalScale(...scale);
    (box.render as any).material = this.createMaterial(color, emissive);
    root.addChild(box);
    this.walls.push(entityToAABB({ x: pos[0], y: pos[1], z: pos[2] }, { x: scale[0], y: scale[1], z: scale[2] }));
    return box;
  }

  private addFloor(root: pc.Entity, name: string, pos: [number, number, number], scale: [number, number, number], color: pc.Color) {
    const box = new pc.Entity(name);
    box.addComponent("render", { type: "box" });
    box.setPosition(...pos);
    box.setLocalScale(...scale);
    (box.render as any).material = this.createMaterial(color, undefined, 40);
    root.addChild(box);
    return box;
  }

  private addCeiling(root: pc.Entity, name: string, pos: [number, number, number], scale: [number, number, number], color: pc.Color) {
    const box = new pc.Entity(name);
    box.addComponent("render", { type: "box" });
    box.setPosition(...pos);
    box.setLocalScale(...scale);
    (box.render as any).material = this.createMaterial(color);
    root.addChild(box);
    return box;
  }

  private addInteractable(entity: pc.Entity, type: string, label: string, meta?: Record<string, unknown>) {
    (entity as any).__interactable = { type, label, meta };
    this.interactables.push(entity);
  }

  private addCameraCone(_root: pc.Entity, parent: pc.Entity, _coneAngle: number, range: number) {
    if (!this.app) return;
    // Create a translucent cone mesh to visualize camera FOV
    const cone = new pc.Entity("CameraCone");
    cone.addComponent("render", { type: "cone" });
    cone.setLocalScale(range * 0.6, range, range * 0.6);
    cone.setLocalPosition(0, -0.5, range * 0.4);
    cone.setLocalEulerAngles(-90, 0, 0);
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(0.8, 0.1, 0.1);
    mat.opacity = 0.12;
    mat.blendType = pc.BLEND_NORMAL;
    (mat as any).depthWrite = false;
    mat.update();
    (cone.render as any).material = mat;
    parent.addChild(cone);
  }

  private addDoor(root: pc.Entity, name: string, pos: [number, number, number], scale: [number, number, number], color: pc.Color, meta: Record<string, unknown>) {
    const box = new pc.Entity(name);
    box.addComponent("render", { type: "box" });
    box.setPosition(...pos);
    box.setLocalScale(...scale);
    (box.render as any).material = this.createMaterial(color, undefined, 60);
    root.addChild(box);

    const aabb = entityToAABB({ x: pos[0], y: pos[1], z: pos[2] }, { x: scale[0], y: scale[1], z: scale[2] });
    const doorObj = { entity: box, aabb, open: false, targetOpen: false, speed: 2, meta, basePos: new pc.Vec3(...pos) };
    this.doors.push(doorObj);
    (box as any).__door = doorObj;
    this.addInteractable(box, "door", meta.locked ? "Locked Door" : "Door", meta);
    return box;
  }

  private addProp(root: pc.Entity, name: string, pos: [number, number, number], scale: [number, number, number], color: pc.Color, emissive?: pc.Color) {
    const box = new pc.Entity(name);
    box.addComponent("render", { type: "box" });
    box.setPosition(...pos);
    box.setLocalScale(...scale);
    (box.render as any).material = this.createMaterial(color, emissive);
    root.addChild(box);
    return box;
  }

  private addLight(root: pc.Entity, name: string, type: "point" | "directional" | "spot", pos: [number, number, number], color: [number, number, number], intensity: number, range?: number, angle?: number) {
    const light = new pc.Entity(name);
    const comp: any = { type, color: new pc.Color(...color), intensity };
    if (range) comp.range = range;
    if (angle && type === "spot") comp.spotAngle = angle;
    light.addComponent("light", comp);
    light.setPosition(...pos);
    root.addChild(light);
    return light;
  }

  private addTrigger(root: pc.Entity, pos: [number, number, number], scale: [number, number, number], targetScene: string, sceneName: string) {
    const box = new pc.Entity(`Trigger_${targetScene}`);
    box.setPosition(...pos);
    box.setLocalScale(...scale);
    root.addChild(box);
    (box as any).__trigger = { targetScene, sceneName };
  }

  // === DOCK ===
  private buildDock(root: pc.Entity) {
    this.addFloor(root, "Floor", [0, -0.1, -6], [16, 0.2, 24], new pc.Color(0.1, 0.11, 0.13));
    this.addCeiling(root, "Ceiling", [0, 4.2, -6], [16, 0.2, 24], new pc.Color(0.08, 0.08, 0.09));
    this.addFloor(root, "Pier", [0, 0.2, -14], [6, 0.4, 12], new pc.Color(0.14, 0.13, 0.12));
    this.addProp(root, "PierPost_L", [-2.8, 1, -18], [0.25, 2, 0.25], new pc.Color(0.12, 0.11, 0.1));
    this.addProp(root, "PierPost_R", [2.8, 1, -18], [0.25, 2, 0.25], new pc.Color(0.12, 0.11, 0.1));
    this.addProp(root, "BoatHull", [-3, 0.8, -16], [3.5, 1.2, 7], new pc.Color(0.08, 0.09, 0.1));
    this.addProp(root, "BoatMast", [-3, 2.5, -15], [0.15, 3, 0.15], new pc.Color(0.1, 0.1, 0.11));
    this.addWall(root, "Wall_GateL", [-3, 2, -8], [2.2, 4, 0.3], new pc.Color(0.18, 0.18, 0.2));
    this.addWall(root, "Wall_GateR", [3, 2, -8], [2.2, 4, 0.3], new pc.Color(0.18, 0.18, 0.2));
    this.addDoor(root, "Door_MainGate", [0, 2, -8], [4, 3.8, 0.25], new pc.Color(0.22, 0.22, 0.24), { doorId: "main_gate", locked: true });
    this.addWall(root, "Wall_Left", [-8, 2, -6], [0.3, 4, 24], new pc.Color(0.12, 0.12, 0.14));
    this.addWall(root, "Wall_Right", [8, 2, -6], [0.3, 4, 24], new pc.Color(0.12, 0.12, 0.14));
    this.addWall(root, "Wall_Back", [0, 2, 6], [16, 4, 0.3], new pc.Color(0.12, 0.12, 0.14));
    this.addProp(root, "Crate", [3, 0.35, -4], [0.8, 0.7, 0.8], new pc.Color(0.16, 0.14, 0.12));
    const map = this.addProp(root, "Evidence_ServiceMap", [3, 0.75, -4], [0.35, 0.02, 0.45], new pc.Color(0.9, 0.85, 0.6), new pc.Color(0.05, 0.04, 0.02));
    this.addInteractable(map, "evidence", "Maintenance Route Map", { evidenceId: "service_map_001" });
    this.addLight(root, "MoonLight", "directional", [5, 12, -10], [0.35, 0.42, 0.55], 0.5);
    this.addLight(root, "DockLight", "point", [0, 3.5, -12], [0.6, 0.65, 0.75], 0.3, 15);
    this.addTrigger(root, [0, 1.7, -19], [4, 3, 1], "service_entrance", "Service Entrance");
  }

  private buildServiceEntrance(root: pc.Entity) {
    this.addFloor(root, "Floor", [0, -0.1, 0], [10, 0.2, 30], new pc.Color(0.12, 0.12, 0.13));
    this.addCeiling(root, "Ceiling", [0, 3.8, 0], [10, 0.2, 30], new pc.Color(0.09, 0.09, 0.1));
    this.addWall(root, "Wall_L", [-5, 1.9, 0], [0.3, 3.8, 30], new pc.Color(0.2, 0.2, 0.22));
    this.addWall(root, "Wall_R", [5, 1.9, 0], [0.3, 3.8, 30], new pc.Color(0.2, 0.2, 0.22));
    this.addProp(root, "CamMount", [0, 3.6, -5], [0.4, 0.4, 0.4], new pc.Color(0.15, 0.15, 0.16));
    const cam = this.addProp(root, "Camera_01", [0, 3.4, -5], [0.3, 0.25, 0.5], new pc.Color(0.25, 0.05, 0.05), new pc.Color(0.6, 0, 0));
    (cam as any).__camera = { id: "cam_service_01", sweepAngle: 55, sweepSpeed: 0.5 };
    this.addCameraCone(root, cam, 55, 14);
    this.addProp(root, "Toolbox", [2.5, 0.3, -3], [0.6, 0.6, 0.4], new pc.Color(0.18, 0.16, 0.14));
    const card = this.addProp(root, "Evidence_Keycard", [2.5, 0.7, -3], [0.22, 0.02, 0.14], new pc.Color(0.9, 0.7, 0.2));
    this.addInteractable(card, "evidence", "Staff Keycard", { evidenceId: "staff_keycard_001" });
    this.addWall(root, "DoorFrame_T", [0, 3.6, -14], [2.4, 0.4, 0.3], new pc.Color(0.22, 0.2, 0.18));
    this.addWall(root, "DoorFrame_L", [-1.1, 1.8, -14], [0.2, 3.6, 0.3], new pc.Color(0.22, 0.2, 0.18));
    this.addWall(root, "DoorFrame_R", [1.1, 1.8, -14], [0.2, 3.6, 0.3], new pc.Color(0.22, 0.2, 0.18));
    this.addDoor(root, "Door_Maintenance", [0, 1.8, -14], [2, 3.5, 0.2], new pc.Color(0.28, 0.24, 0.2), { doorId: "maintenance_door", locked: true, needsKey: "staff_keycard_001" });
    this.addProp(root, "Shelf", [-3.5, 1.2, -6], [1.5, 0.08, 0.4], new pc.Color(0.2, 0.18, 0.15));
    const note = this.addProp(root, "Evidence_CameraNote", [-3.5, 1.35, -6], [0.3, 0.02, 0.3], new pc.Color(0.95, 0.95, 0.9));
    this.addInteractable(note, "evidence", "Camera Maintenance Note", { evidenceId: "camera_note_001" });
    this.addLight(root, "CorridorLight1", "point", [0, 3.2, -2], [0.7, 0.7, 0.65], 0.25, 12);
    this.addLight(root, "CorridorLight2", "point", [0, 3.2, -8], [0.7, 0.7, 0.65], 0.25, 12);
    this.addLight(root, "CorridorLight3", "point", [0, 3.2, -14], [0.7, 0.7, 0.65], 0.25, 12);
    this.addTrigger(root, [0, 1.7, -18], [4, 3, 1], "mansion_office", "Mansion Office");
  }

  private buildMansionOffice(root: pc.Entity) {
    this.addFloor(root, "Floor", [0, -0.05, -3], [14, 0.1, 12], new pc.Color(0.2, 0.16, 0.13));
    this.addCeiling(root, "Ceiling", [0, 4, -3], [14, 0.1, 12], new pc.Color(0.18, 0.16, 0.14));
    this.addWall(root, "Wall_Back", [0, 2, -9], [14, 4, 0.3], new pc.Color(0.24, 0.22, 0.19));
    this.addWall(root, "Wall_Left", [-7, 2, -3], [0.3, 4, 12], new pc.Color(0.24, 0.22, 0.19));
    this.addWall(root, "Wall_Right", [7, 2, -3], [0.3, 4, 12], new pc.Color(0.24, 0.22, 0.19));
    this.addWall(root, "Wall_Front", [0, 2, 3], [14, 4, 0.3], new pc.Color(0.24, 0.22, 0.19));
    this.addWall(root, "DoorFrame_T2", [0, 3.6, 3], [2.4, 0.4, 0.3], new pc.Color(0.26, 0.24, 0.21));
    this.addWall(root, "DoorFrame_L2", [-1.1, 1.8, 3], [0.2, 3.6, 0.3], new pc.Color(0.26, 0.24, 0.21));
    this.addWall(root, "DoorFrame_R2", [1.1, 1.8, 3], [0.2, 3.6, 0.3], new pc.Color(0.26, 0.24, 0.21));
    this.addDoor(root, "Door_Security", [0, 1.8, 3], [2, 3.5, 0.2], new pc.Color(0.3, 0.26, 0.22), { doorId: "security_door", locked: true, needsKey: "staff_keycard_001" });
    this.addProp(root, "DeskTop", [0, 0.8, -4], [3.2, 0.1, 1.6], new pc.Color(0.32, 0.22, 0.16));
    this.addProp(root, "DeskLeg_LF", [-1.4, 0.4, -4.6], [0.1, 0.8, 0.1], new pc.Color(0.28, 0.2, 0.14));
    this.addProp(root, "DeskLeg_RF", [1.4, 0.4, -4.6], [0.1, 0.8, 0.1], new pc.Color(0.28, 0.2, 0.14));
    this.addProp(root, "DeskLeg_LB", [-1.4, 0.4, -3.4], [0.1, 0.8, 0.1], new pc.Color(0.28, 0.2, 0.14));
    this.addProp(root, "DeskLeg_RB", [1.4, 0.4, -3.4], [0.1, 0.8, 0.1], new pc.Color(0.28, 0.2, 0.14));
    const term = this.addProp(root, "Terminal_Office", [0, 1.0, -4.2], [0.5, 0.35, 0.35], new pc.Color(0.08, 0.08, 0.1), new pc.Color(0, 0.15, 0.3));
    this.addInteractable(term, "terminal", "Office Terminal", { terminalId: "terminal_office_001" });
    this.addProp(root, "CabinetBody", [-5, 1, -5], [1, 2, 0.7], new pc.Color(0.35, 0.3, 0.25));
    this.addProp(root, "CabinetDrawer1", [-5, 1.3, -5.38], [0.9, 0.35, 0.05], new pc.Color(0.32, 0.27, 0.22));
    this.addProp(root, "CabinetDrawer2", [-5, 0.7, -5.38], [0.9, 0.35, 0.05], new pc.Color(0.32, 0.27, 0.22));
    const log = this.addProp(root, "Evidence_GuestLog", [0.9, 0.88, -4], [0.4, 0.04, 0.5], new pc.Color(0.9, 0.85, 0.6));
    this.addInteractable(log, "evidence", "Private Guest Arrival Log", { evidenceId: "guest_log_001" });
    const memo = this.addProp(root, "Evidence_StaffMemo", [-0.8, 0.88, -4], [0.3, 0.02, 0.4], new pc.Color(0.95, 0.95, 0.9));
    this.addInteractable(memo, "evidence", "Staff Instruction Memo", { evidenceId: "staff_memo_001" });
    const drawer = this.addProp(root, "Evidence_PaymentNote", [-5, 0.45, -5.2], [0.35, 0.04, 0.3], new pc.Color(0.9, 0.85, 0.6));
    this.addInteractable(drawer, "evidence", "Payment Ledger Fragment", { evidenceId: "payment_note_001" });
    this.addLight(root, "Chandelier", "point", [0, 3.5, -4], [0.95, 0.78, 0.55], 0.8, 10);
    this.addLight(root, "DeskLamp", "point", [-1, 0.95, -4], [0.9, 0.75, 0.5], 0.4, 4);
    this.addTrigger(root, [0, 1.7, 7], [4, 3, 1], "security_wing", "Security Wing");
  }

  private buildSecurityWing(root: pc.Entity) {
    this.addFloor(root, "Floor", [0, -0.05, 0], [14, 0.1, 16], new pc.Color(0.1, 0.1, 0.11));
    this.addCeiling(root, "Ceiling", [0, 4, 0], [14, 0.1, 16], new pc.Color(0.08, 0.08, 0.09));
    this.addWall(root, "Wall_Back", [0, 2, -8], [14, 4, 0.3], new pc.Color(0.18, 0.18, 0.2));
    this.addWall(root, "Wall_Left", [-7, 2, 0], [0.3, 4, 16], new pc.Color(0.18, 0.18, 0.2));
    this.addWall(root, "Wall_Right", [7, 2, 0], [0.3, 4, 16], new pc.Color(0.18, 0.18, 0.2));
    this.addWall(root, "Wall_Front", [0, 2, 8], [14, 4, 0.3], new pc.Color(0.18, 0.18, 0.2));
    for (let i = -2; i <= 2; i++) {
      const mon = this.addProp(root, `Monitor_${i}`, [i * 2.2, 2.2, -7.5], [1.8, 1.1, 0.15], new pc.Color(0.04, 0.04, 0.05), new pc.Color(0, 0.12, 0.25));
      (mon as any).__monitor = true;
    }
    this.addProp(root, "ConsoleDesk", [0, 0.7, -7], [12, 0.1, 1.2], new pc.Color(0.14, 0.14, 0.16));
    const term = this.addProp(root, "Terminal_Security", [0, 1.05, -7.2], [0.5, 0.35, 0.35], new pc.Color(0.08, 0.08, 0.1), new pc.Color(0, 0.25, 0.15));
    this.addInteractable(term, "terminal", "Security Archive Terminal", { terminalId: "terminal_security_001" });
    const feed = this.addProp(root, "Evidence_SecurityFeed", [4, 1.0, -7], [0.25, 0.2, 0.05], new pc.Color(0.08, 0.08, 0.1), new pc.Color(0.3, 0, 0));
    this.addInteractable(feed, "evidence", "Archived Security Feed", { evidenceId: "security_feed_002" });
    const log = this.addProp(root, "Evidence_AccessLog", [-4, 1.0, -7], [0.3, 0.04, 0.4], new pc.Color(0.9, 0.85, 0.6));
    this.addInteractable(log, "evidence", "Bunker Access Log", { evidenceId: "access_log_001" });
    this.addWall(root, "BunkerFrame_T", [0, 3.6, 7], [2.8, 0.4, 0.3], new pc.Color(0.28, 0.28, 0.32));
    this.addWall(root, "BunkerFrame_L", [-1.3, 1.8, 7], [0.2, 3.6, 0.3], new pc.Color(0.28, 0.28, 0.32));
    this.addWall(root, "BunkerFrame_R", [1.3, 1.8, 7], [0.2, 3.6, 0.3], new pc.Color(0.28, 0.28, 0.32));
    this.addDoor(root, "Door_Bunker", [0, 1.8, 7], [2.4, 3.5, 0.25], new pc.Color(0.32, 0.32, 0.36), { doorId: "bunker_door", locked: true, needsCode: "7391" });
    this.addLight(root, "MonitorGlow", "point", [0, 2.5, -6], [0.2, 0.5, 0.7], 0.6, 10);
    this.addLight(root, "CeilingPanel1", "point", [-4, 3.8, 0], [0.65, 0.65, 0.7], 0.35, 8);
    this.addLight(root, "CeilingPanel2", "point", [4, 3.8, 0], [0.65, 0.65, 0.7], 0.35, 8);
    this.addTrigger(root, [0, 1.7, 11], [4, 3, 1], "bunker_server_room", "Bunker Server Room");
  }

  private buildBunker(root: pc.Entity) {
    this.addFloor(root, "Floor", [0, -0.05, 0], [14, 0.1, 18], new pc.Color(0.08, 0.08, 0.09));
    this.addCeiling(root, "Ceiling", [0, 3.5, 0], [14, 0.1, 18], new pc.Color(0.06, 0.06, 0.07));
    this.addWall(root, "Wall_Back", [0, 1.75, -9], [14, 3.5, 0.3], new pc.Color(0.14, 0.14, 0.16));
    this.addWall(root, "Wall_Left", [-7, 1.75, 0], [0.3, 3.5, 18], new pc.Color(0.14, 0.14, 0.16));
    this.addWall(root, "Wall_Right", [7, 1.75, 0], [0.3, 3.5, 18], new pc.Color(0.14, 0.14, 0.16));
    this.addWall(root, "Wall_Front", [0, 1.75, 9], [14, 3.5, 0.3], new pc.Color(0.14, 0.14, 0.16));
    for (let x = -4; x <= 4; x += 2) {
      for (let z = -6; z <= -2; z += 2) {
        if (Math.abs(x) < 1 && z > -4) continue;
        const rack = this.addProp(root, `ServerRack_${x}_${z}`, [x, 1.5, z], [0.9, 3, 1], new pc.Color(0.1, 0.1, 0.12), new pc.Color(0, 0.08, 0.18));
        (rack as any).__server = true;
      }
    }
    const term = this.addProp(root, "Terminal_Server", [0, 1.0, -1], [0.8, 0.5, 0.5], new pc.Color(0.08, 0.08, 0.1), new pc.Color(0.4, 0, 0));
    this.addInteractable(term, "terminal", "Server Archive Console", { terminalId: "terminal_server_001" });
    const manifest = this.addProp(root, "Evidence_Transport", [3, 0.3, -5], [0.4, 0.05, 0.5], new pc.Color(0.9, 0.85, 0.6));
    this.addInteractable(manifest, "evidence", "Transport Manifest", { evidenceId: "transport_manifest_001" });
    this.addProp(root, "KeyTable", [-2, 0.5, -1], [1.2, 0.1, 0.6], new pc.Color(0.12, 0.12, 0.14));
    const key = this.addProp(root, "Evidence_BroadcastKey", [-2, 0.65, -1], [0.22, 0.02, 0.14], new pc.Color(0.9, 0.7, 0.2));
    this.addInteractable(key, "evidence", "Broadcast Routing Key", { evidenceId: "broadcast_key_001" });
    const hidden = this.addProp(root, "Evidence_HiddenArchive", [5.5, 0.3, -7], [0.3, 0.05, 0.4], new pc.Color(0.5, 0.08, 0.08), new pc.Color(0.15, 0, 0));
    this.addInteractable(hidden, "evidence", "Redacted Internal Memo", { evidenceId: "hidden_archive_001" });
    this.addLight(root, "EmergencyLight", "point", [0, 3, -4], [0.8, 0.05, 0.05], 0.5, 15);
    this.addLight(root, "ServerGlow1", "point", [-3, 1.5, -4], [0, 0.2, 0.4], 0.3, 4);
    this.addLight(root, "ServerGlow2", "point", [3, 1.5, -4], [0, 0.2, 0.4], 0.3, 4);
    this.addTrigger(root, [0, 1.7, 13], [4, 3, 1], "broadcast_tower", "Broadcast Tower");
  }

  private buildBroadcastTower(root: pc.Entity) {
    this.addFloor(root, "Floor", [0, -0.05, 0], [10, 0.1, 12], new pc.Color(0.12, 0.12, 0.13));
    this.addCeiling(root, "Ceiling", [0, 5, 0], [10, 0.1, 12], new pc.Color(0.08, 0.08, 0.09));
    this.addWall(root, "Wall_Back", [0, 2.5, -6], [10, 5, 0.3], new pc.Color(0.16, 0.16, 0.18));
    this.addWall(root, "Wall_Left", [-5, 2.5, 0], [0.3, 5, 12], new pc.Color(0.16, 0.16, 0.18));
    this.addWall(root, "Wall_Right", [5, 2.5, 0], [0.3, 5, 12], new pc.Color(0.16, 0.16, 0.18));
    this.addWall(root, "Wall_Front", [0, 2.5, 6], [10, 5, 0.3], new pc.Color(0.16, 0.16, 0.18));
    this.addProp(root, "TowerBase", [0, 2.5, -7], [2, 5, 2], new pc.Color(0.18, 0.18, 0.2));
    this.addProp(root, "Antenna_Lower", [0, 6, -7], [0.3, 3, 0.3], new pc.Color(0.25, 0.25, 0.28));
    this.addProp(root, "Antenna_Upper", [0, 9, -7], [0.15, 3, 0.15], new pc.Color(0.3, 0.3, 0.35));
    const console_ = this.addProp(root, "BroadcastConsole", [0, 1.1, -2], [1.2, 0.7, 0.7], new pc.Color(0.08, 0.08, 0.1), new pc.Color(0, 0.3, 0));
    this.addInteractable(console_, "terminal", "Broadcast Uplink Console", { terminalId: "terminal_broadcast_001" });
    this.addLight(root, "TowerStorm", "directional", [0, 10, -5], [0.45, 0.45, 0.55], 0.35);
    this.addLight(root, "ConsoleGlow", "point", [0, 2, -2], [0.1, 0.4, 0.2], 0.4, 6);
  }

  // === GAME LOOP ===
  private update(dt: number) {
    if (!this.app || !this.playerEntity || !this.cameraEntity) return;
    if (gameState.paused || gameState.terminalOpen || gameState.evidenceBoardOpen) return;
    gameState.playtimeSeconds += dt;
    this.updatePlayer(dt);
    this.updateDoors(dt);
    this.updateCameraSweeps(dt);
    this.updateInteractRay();
    this.updateDetection(dt);
    this.updateTimers(dt);
  }

  private updatePlayer(dt: number) {
    if (!this.playerEntity || !this.cameraEntity) return;
    const forward = this.cameraEntity.forward;
    const right = this.cameraEntity.right;
    const move = new pc.Vec3(0, 0, 0);
    if (inputManager.isActive("moveForward")) move.add(new pc.Vec3(forward.x, 0, forward.z));
    if (inputManager.isActive("moveBackward")) move.sub(new pc.Vec3(forward.x, 0, forward.z));
    if (inputManager.isActive("moveLeft")) move.sub(new pc.Vec3(right.x, 0, right.z));
    if (inputManager.isActive("moveRight")) move.add(new pc.Vec3(right.x, 0, right.z));

    let speed: number = GameConfig.player.walkSpeed;
    if (inputManager.isActive("sprint") && !inputManager.isActive("crouch")) speed = GameConfig.player.sprintSpeed;
    if (inputManager.isActive("crouch")) speed = GameConfig.player.crouchSpeed;

    const isMoving = move.length() > 0.01;
    if (isMoving) {
      move.normalize();
      const speedDt = speed * dt;
      const pos = this.playerEntity.getPosition().clone();
      const radius = GameConfig.player.radius;
      const [newX] = resolveCircleAABB(pos.x, pos.z, radius, this.walls, speedDt * move.x, 0);
      const [, newZ] = resolveCircleAABB(newX, pos.z, radius, this.walls, 0, speedDt * move.z);
      pos.x = newX;
      pos.z = newZ;
      this.playerEntity.setPosition(pos);
      this.moveTime += dt;
      // Footsteps
      const stepRate = speed > GameConfig.player.walkSpeed ? 0.35 : 0.55;
      if (this.moveTime > 0 && Math.floor(this.moveTime / stepRate) !== Math.floor((this.moveTime - dt) / stepRate)) {
        audioSystem.playFootstep("concrete");
      }
    } else {
      this.moveTime = 0;
    }

    const [dx, dy] = inputManager.consumeLook();
    this.targetYaw -= dx * GameConfig.player.lookSensitivity;
    this.targetPitch -= dy * GameConfig.player.lookSensitivity;
    this.targetPitch = clamp(this.targetPitch, -85, 85);

    const rot = this.cameraEntity.getLocalEulerAngles();
    const damp = GameConfig.player.smoothLookDamping;
    const yaw = lerp(rot.y, this.targetYaw, damp);
    const pitch = lerp(rot.x, this.targetPitch, damp);

    // Lean mechanic (Q/E)
    const targetRoll = inputManager.isActive("leanLeft") ? 8 : inputManager.isActive("leanRight") ? -8 : 0;
    const roll = lerp(rot.z, targetRoll, damp * 1.5);
    this.cameraEntity.setLocalEulerAngles(pitch, yaw, roll);

    const camLocalY = isMoving && !inputManager.isActive("crouch")
      ? Math.sin(this.moveTime * GameConfig.player.headBobFrequency) * GameConfig.player.headBobAmount
      : 0;
    this.cameraEntity.setLocalPosition(0, camLocalY, 0);

    const targetPlayerY = inputManager.isActive("crouch") ? GameConfig.player.crouchHeight / 2 : GameConfig.player.height / 2;
    const ppos = this.playerEntity.getPosition();
    ppos.y = lerp(ppos.y, targetPlayerY, dt * 8);
    this.playerEntity.setPosition(ppos);

    if (this.flashlightEntity) {
      const light = this.flashlightEntity.light;
      if (light) {
        const targetIntensity = inputManager.isActive("flashlight") ? 1.4 : 0;
        light.intensity = lerp(light.intensity, targetIntensity, dt * 12);
      }
    }

    const targetFov = inputManager.isActive("sprint") && isMoving
      ? GameConfig.player.fovSprint
      : inputManager.isActive("crouch")
      ? GameConfig.player.fovCrouch
      : GameConfig.player.fovBase;
    this.currentFov = lerp(this.currentFov, targetFov, dt * GameConfig.player.fovLerpSpeed);
    if (this.cameraEntity.camera) {
      (this.cameraEntity.camera as any).fov = this.currentFov;
    }

    this.checkTriggers();
  }

  private updateDoors(dt: number) {
    for (const door of this.doors) {
      if (door.open !== door.targetOpen) {
        const dir = door.targetOpen ? 1 : -1;
        const progress = door.open ? 1 : 0;
        const newProgress = clamp(progress + dir * door.speed * dt, 0, 1);
        door.open = newProgress >= 1;
        if (!door.open && newProgress <= 0) door.open = false;
        // Slide door sideways (Z-aligned doors slide in X)
        const bx = door.basePos.x;
        door.entity.setPosition(bx + (door.targetOpen ? 1.5 : 0) * newProgress, door.basePos.y, door.basePos.z);
        // Update collision only on state transition
        const idx = this.walls.indexOf(door.aabb);
        if (door.targetOpen && idx >= 0) {
          this.walls.splice(idx, 1);
        } else if (!door.targetOpen && idx < 0) {
          this.walls.push(door.aabb);
        }
      }
    }
  }

  private checkTriggers() {
    if (!this.playerEntity || !this.sceneRoot) return;
    const ppos = this.playerEntity.getPosition();
    this.sceneRoot.children.forEach((child) => {
      const trig = (child as any).__trigger;
      if (!trig) return;
      const cpos = child.getPosition();
      const cscale = child.getLocalScale();
      if (
        ppos.x > cpos.x - cscale.x / 2 && ppos.x < cpos.x + cscale.x / 2 &&
        ppos.y > cpos.y - cscale.y / 2 && ppos.y < cpos.y + cscale.y / 2 &&
        ppos.z > cpos.z - cscale.z / 2 && ppos.z < cpos.z + cscale.z / 2
      ) {
        this.callbacks.onSceneEnter?.(trig.targetScene, trig.sceneName);
        this.loadScene(trig.targetScene);
      }
    });
  }

  private updateCameraSweeps(_dt: number) {
    if (!this.sceneRoot) return;
    this.sceneRoot.children.forEach((child) => {
      const cam = (child as any).__camera;
      if (!cam) return;
      if (gameState.isCameraDisabled(cam.id)) return;
      const t = performance.now() / 1000;
      const angle = Math.sin(t * cam.sweepSpeed) * cam.sweepAngle;
      child.setLocalEulerAngles(0, angle, 0);
    });
  }

  private updateInteractRay() {
    if (!this.cameraEntity) return;
    const from = this.cameraEntity.getPosition();
    let best: pc.Entity | null = null;
    let bestDist = Infinity;

    for (const ent of this.interactables) {
      const pos = ent.getPosition();
      const dist = pos.distance(from);
      if (dist > GameConfig.interaction.rayLength) continue;
      const dir = pos.clone().sub(from).normalize();
      const dot = dir.dot(this.cameraEntity.forward);
      if (dot > 0.82 && dist < bestDist) {
        best = ent;
        bestDist = dist;
      }
    }

    if (best) {
      const data = (best as any).__interactable;
      this.callbacks.onInteractTarget?.({ type: data.type, label: data.label });
    } else {
      this.callbacks.onInteractTarget?.(null);
    }
  }

  private updateDetection(dt: number) {
    if (!this.playerEntity || !this.sceneRoot) return;
    const ppos = this.playerEntity.getPosition();
    let detectionDelta = 0;

    this.sceneRoot.children.forEach((child) => {
      const cam = (child as any).__camera;
      if (!cam) return;
      if (gameState.isCameraDisabled(cam.id)) return;
      const dist = child.getPosition().distance(ppos);
      if (dist > GameConfig.stealth.cameraDetectionRange) return;
      const dir = ppos.clone().sub(child.getPosition()).normalize();
      const forward = child.forward;
      const angle = Math.acos(clamp(dir.dot(forward), -1, 1)) * (180 / Math.PI);
      if (angle > GameConfig.stealth.cameraConeAngle) return;

      const distFactor = 1 - dist / GameConfig.stealth.cameraDetectionRange;
      const angleFactor = 1 - angle / GameConfig.stealth.cameraConeAngle;
      let mod = 1;
      if (inputManager.isActive("crouch")) mod *= 0.4;
      if (inputManager.isActive("flashlight")) mod *= 1.5;
      detectionDelta += distFactor * angleFactor * mod * dt * 40;
    });

    let current = gameState.detectionValue;
    if (detectionDelta > 0) {
      current += detectionDelta;
    } else {
      current -= GameConfig.stealth.detectionDecayRate * dt;
    }
    current = clamp(current, 0, 100);

    let state: import("../types/stealth").DetectionState = "hidden";
    if (current >= 100) state = "detected";
    else if (current >= 75) state = "critical";
    else if (current >= 50) state = "suspicious";
    else if (current >= 25) state = "watched";

    const prevState = gameState.detection;
    gameState.setDetection(current, state);

    // Audio feedback on state escalation
    if (state !== prevState && (state === "watched" || state === "suspicious" || state === "critical" || state === "detected")) {
      audioSystem.playDetectionBeep(state);
    }
    if (detectionDelta > 0 && Math.random() > 0.97) {
      audioSystem.playCameraSweep();
    }

    if (state === "detected" && gameState.alert !== "full_lockdown") {
      gameState.setAlert("full_lockdown");
      eventBus.emit(GameEvents.ALERT_CHANGED, "full_lockdown");
      eventBus.emit(GameEvents.LOCKDOWN_TRIGGERED);
      gameState.lockdown = true;
    }
  }

  private updateTimers(_dt: number) {
    this.downloadTimer.update(_dt * 1000);
  }

  interact() {
    if (!this.cameraEntity) return;
    const from = this.cameraEntity.getPosition();
    let best: pc.Entity | null = null;
    let bestDist = Infinity;

    for (const ent of this.interactables) {
      const pos = ent.getPosition();
      const dist = pos.distance(from);
      if (dist > GameConfig.interaction.rayLength) continue;
      const dir = pos.clone().sub(from).normalize();
      const dot = dir.dot(this.cameraEntity.forward);
      if (dot > 0.82 && dist < bestDist) {
        best = ent;
        bestDist = dist;
      }
    }

    if (!best) return;
    const data = (best as any).__interactable;
    eventBus.emit(GameEvents.INTERACT_TRIGGER, data);
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

  dispose() {
    if (this.app) {
      this.app.destroy();
      this.app = null;
    }
    this.playerEntity = null;
    this.cameraEntity = null;
    this.flashlightEntity = null;
    this.sceneRoot = null;
  }
}
