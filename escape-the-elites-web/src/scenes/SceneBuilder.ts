
import * as pc from "playcanvas";
import { entityToAABB } from "../utils/collision";
import type { AABB } from "../utils/collision";
import { gameState } from "../game/GameState";
import { setInteractableMeta, setCameraMeta, setTriggerMeta, setDoorMeta, setMonitorFlag, setServerFlag } from "../utils/entityMeta";

export class SceneBuilder {
  app: pc.Application;
  walls: AABB[] = [];
  doors: {
    id: string;
    entity: pc.Entity;
    aabb: AABB;
    locked: boolean;
    targetOpen: boolean;
    progress: number;
    speed: number;
    meta: Record<string, unknown>;
    basePos: pc.Vec3;
  }[] = [];
  interactables: pc.Entity[] = [];

  constructor(app: pc.Application) {
    this.app = app;
  }

  createMaterial(color: pc.Color, emissive?: pc.Color, gloss?: number): pc.StandardMaterial {
    const mat = new pc.StandardMaterial();
    mat.diffuse = color;
    if (emissive) mat.emissive = emissive;
    (mat as any).shininess = gloss ?? 20;
    (mat as any).metalness = gloss !== undefined ? 0.3 : 0.1;
    mat.update();
    return mat;
  }

  addWall(root: pc.Entity, name: string, pos: [number, number, number], scale: [number, number, number], color: pc.Color, emissive?: pc.Color) {
    const box = new pc.Entity(name);
    box.addComponent("render", { type: "box" });
    box.setPosition(...pos);
    box.setLocalScale(...scale);
    (box.render as any).material = this.createMaterial(color, emissive);
    root.addChild(box);
    this.walls.push(entityToAABB({ x: pos[0], y: pos[1], z: pos[2] }, { x: scale[0], y: scale[1], z: scale[2] }));
    return box;
  }

  addFloor(root: pc.Entity, name: string, pos: [number, number, number], scale: [number, number, number], color: pc.Color) {
    const box = new pc.Entity(name);
    box.addComponent("render", { type: "box" });
    box.setPosition(...pos);
    box.setLocalScale(...scale);
    (box.render as any).material = this.createMaterial(color, undefined, 40);
    root.addChild(box);
    return box;
  }

  addCeiling(root: pc.Entity, name: string, pos: [number, number, number], scale: [number, number, number], color: pc.Color) {
    const box = new pc.Entity(name);
    box.addComponent("render", { type: "box" });
    box.setPosition(...pos);
    box.setLocalScale(...scale);
    (box.render as any).material = this.createMaterial(color);
    root.addChild(box);
    return box;
  }

  addInteractable(entity: pc.Entity, type: string, label: string, meta?: Record<string, unknown>) {
    if (type === "evidence" && meta?.evidenceId && gameState.hasEvidence(meta.evidenceId as string)) {
      entity.destroy();
      return;
    }
    setInteractableMeta(entity, { type, label, meta });
    this.interactables.push(entity);
  }

  addCameraCone(parent: pc.Entity, _coneAngle: number, range: number) {
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

  addDoor(root: pc.Entity, name: string, pos: [number, number, number], scale: [number, number, number], color: pc.Color, meta: Record<string, unknown>) {
    const box = new pc.Entity(name);
    box.addComponent("render", { type: "box" });
    box.setPosition(...pos);
    box.setLocalScale(...scale);
    (box.render as any).material = this.createMaterial(color, undefined, 60);
    root.addChild(box);

    const aabb = entityToAABB({ x: pos[0], y: pos[1], z: pos[2] }, { x: scale[0], y: scale[1], z: scale[2] });
    const isLocked = !!meta.locked;
    const doorId = meta.doorId as string;
    const doorObj = { id: doorId, entity: box, aabb, locked: isLocked, targetOpen: false, progress: 0, speed: 2, meta, basePos: new pc.Vec3(...pos) };
    this.doors.push(doorObj);
    setDoorMeta(box, doorObj);
    if (isLocked) {
      this.walls.push(aabb);
    }
    this.addInteractable(box, "door", isLocked ? "Locked Door" : "Door", { ...meta, locked: isLocked });
    return box;
  }

  addProp(root: pc.Entity, name: string, pos: [number, number, number], scale: [number, number, number], color: pc.Color, emissive?: pc.Color) {
    const box = new pc.Entity(name);
    box.addComponent("render", { type: "box" });
    box.setPosition(...pos);
    box.setLocalScale(...scale);
    (box.render as any).material = this.createMaterial(color, emissive);
    root.addChild(box);
    return box;
  }

  addLight(root: pc.Entity, name: string, type: "point" | "directional" | "spot", pos: [number, number, number], color: [number, number, number], intensity: number, range?: number, angle?: number) {
    const light = new pc.Entity(name);
    const comp: any = { type, color: new pc.Color(...color), intensity };
    if (range) comp.range = range;
    if (angle && type === "spot") comp.spotAngle = angle;
    light.addComponent("light", comp);
    light.setPosition(...pos);
    root.addChild(light);
    return light;
  }

  addTrigger(root: pc.Entity, pos: [number, number, number], scale: [number, number, number], targetScene: string, sceneName: string) {
    const box = new pc.Entity("Trigger_" + targetScene);
    box.setPosition(...pos);
    box.setLocalScale(...scale);
    root.addChild(box);
    setTriggerMeta(box, { targetScene, sceneName });
  }

  clear() {
    this.walls = [];
    this.doors = [];
    this.interactables = [];
  }

  buildScene(id: string, root: pc.Entity) {
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
    this.addDoor(root, "Door_MainGate", [0, 2, -8], [4, 3.8, 0.25], new pc.Color(0.22, 0.22, 0.24), { doorId: "main_gate", locked: true, lockedMessage: "Gate locked. Find another way in." });
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
    setCameraMeta(cam, { id: "cam_service_01", sweepAngle: 55, sweepSpeed: 0.5 });
    this.addCameraCone(cam, 55, 14);
    this.addProp(root, "Toolbox", [2.5, 0.3, -3], [0.6, 0.6, 0.4], new pc.Color(0.18, 0.16, 0.14));
    const card = this.addProp(root, "Evidence_Keycard", [2.5, 0.7, -3], [0.22, 0.02, 0.14], new pc.Color(0.9, 0.7, 0.2));
    this.addInteractable(card, "evidence", "Staff Keycard", { evidenceId: "staff_keycard_001" });
    this.addWall(root, "DoorFrame_T", [0, 3.6, -14], [2.4, 0.4, 0.3], new pc.Color(0.22, 0.2, 0.18));
    this.addWall(root, "DoorFrame_L", [-1.1, 1.8, -14], [0.2, 3.6, 0.3], new pc.Color(0.22, 0.2, 0.18));
    this.addWall(root, "DoorFrame_R", [1.1, 1.8, -14], [0.2, 3.6, 0.3], new pc.Color(0.22, 0.2, 0.18));
    this.addDoor(root, "Door_Maintenance", [0, 1.8, -14], [2, 3.5, 0.2], new pc.Color(0.28, 0.24, 0.2), { doorId: "maintenance_door", locked: true, needsKey: "staff_keycard_001", lockedMessage: "Requires Staff Keycard" });
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
    this.addDoor(root, "Door_Security", [0, 1.8, 3], [2, 3.5, 0.2], new pc.Color(0.3, 0.26, 0.22), { doorId: "security_door", locked: true, needsKey: "staff_keycard_001", lockedMessage: "Requires Staff Keycard" });
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
      const mon = this.addProp(root, "Monitor_" + i, [i * 2.2, 2.2, -7.5], [1.8, 1.1, 0.15], new pc.Color(0.04, 0.04, 0.05), new pc.Color(0, 0.12, 0.25));
      setMonitorFlag(mon, true);
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
    this.addDoor(root, "Door_Bunker", [0, 1.8, 7], [2.4, 3.5, 0.25], new pc.Color(0.32, 0.32, 0.36), { doorId: "bunker_door", locked: true, needsCode: "7391", lockedMessage: "Requires Bunker Access Code" });
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
        const rack = this.addProp(root, "ServerRack_" + x + "_" + z, [x, 1.5, z], [0.9, 3, 1], new pc.Color(0.1, 0.1, 0.12), new pc.Color(0, 0.08, 0.18));
        setServerFlag(rack, true);
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
}
