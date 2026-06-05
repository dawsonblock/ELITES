import * as pc from "playcanvas";
import { GameConfig } from "./GameConfig";
import { GameEvents } from "./GameEvents";
import { gameState } from "./GameState";
import { inputManager } from "./InputManager";
import { eventBus } from "../utils/eventBus";
import { Timer } from "../utils/timers";
import { clamp, lerp } from "../utils/math";
import type { AABB } from "../utils/collision";
import { resolveCircleAABB } from "../utils/collision";
import { audioSystem } from "../systems/AudioSystem";
import { SceneBuilder } from "../scenes/SceneBuilder";
import { progressionSystem } from "./ProgressionSystem";

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
  private doors: { id: string; entity: pc.Entity; aabb: AABB; locked: boolean; targetOpen: boolean; progress: number; speed: number; meta: Record<string, unknown>; basePos: pc.Vec3 }[] = [];
  private moveTime = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private currentFov: number = GameConfig.camera.fov;
  private unsubDoorListener: (() => void) | null = null;
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

    this.createPlayer();
    this.loadScene("dock");

    app.on("update", (dt) => this.update(dt));

    this.unsubDoorListener = eventBus.on(GameEvents.DOOR_UNLOCKED, (doorId) => {
      const door = this.doors.find((d) => d.id === doorId);
      if (door) {
        door.locked = false;
        door.targetOpen = true;
        audioSystem.playDoorOpen();
        // Sync interactable metadata so App.tsx sees the door as unlocked
        const ent = door.entity as any;
        if (ent.__interactable && ent.__interactable.meta) {
          ent.__interactable.meta.locked = false;
        }
      }
    });

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

    const builder = new SceneBuilder(this.app);
    builder.buildScene(sceneId, root);
    this.walls = builder.walls;
    this.doors = builder.doors;
    this.interactables = builder.interactables;

    // Restore unlocked door states after scene rebuild
    for (const door of this.doors) {
      if (gameState.isDoorUnlocked(door.id)) {
        door.locked = false;
        door.targetOpen = true;
        const idx = this.walls.indexOf(door.aabb);
        if (idx >= 0) this.walls.splice(idx, 1);
        const ent = door.entity as any;
        if (ent.__interactable && ent.__interactable.meta) {
          ent.__interactable.meta.locked = false;
        }
      }
    }

    const spawns = {
      dock: [0, 1.7, 5], service_entrance: [0, 1.7, 8], mansion_office: [0, 1.7, 4],
      security_wing: [0, 1.7, 6], bunker_server_room: [0, 1.7, 6], broadcast_tower: [0, 1.7, 3],
    } as Record<string, [number, number, number]>;
    const spawn = spawns[sceneId];
    if (spawn && this.playerEntity) {
      this.playerEntity.setPosition(spawn[0], GameConfig.player.height / 2, spawn[2]);
      this.targetYaw = 0;
      this.targetPitch = 0;
      if (this.cameraEntity) this.cameraEntity.setLocalEulerAngles(0, 0, 0);
    }

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
      const target = door.targetOpen ? 1 : 0;
      if (Math.abs(door.progress - target) > 0.001) {
        const dir = target > door.progress ? 1 : -1;
        door.progress = clamp(door.progress + dir * door.speed * dt, 0, 1);
        const bx = door.basePos.x;
        door.entity.setPosition(bx + 1.5 * door.progress, door.basePos.y, door.basePos.z);
        // Sync collision with animation
        const idx = this.walls.indexOf(door.aabb);
        if (door.progress > 0.5 && idx >= 0 && door.targetOpen) {
          this.walls.splice(idx, 1);
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
        progressionSystem.handleSceneTransition(trig.targetScene);
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
    const prevValue = gameState.detectionValue;
    gameState.setDetection(current, state);
    if (state !== prevState || current !== prevValue) {
      eventBus.emit(GameEvents.DETECTION_CHANGED);
    }

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

  getPlayerSnapshot() {
    const pos = this.playerEntity?.getPosition();
    const rot = this.cameraEntity?.getLocalEulerAngles();
    return {
      sceneId: this.currentSceneId,
      position: pos ? ([pos.x, pos.y, pos.z] as [number, number, number]) : ([0, 1.7, 0] as [number, number, number]),
      yaw: rot?.y ?? 0,
      pitch: rot?.x ?? 0,
    };
  }

  loadPlayerSnapshot(snapshot: { sceneId: string; position: [number, number, number]; yaw: number; pitch: number }) {
    if (snapshot.sceneId !== this.currentSceneId) {
      this.loadScene(snapshot.sceneId);
    }
    if (this.playerEntity) {
      this.playerEntity.setPosition(snapshot.position[0], snapshot.position[1], snapshot.position[2]);
    }
    this.targetYaw = snapshot.yaw;
    this.targetPitch = snapshot.pitch;
    if (this.cameraEntity) {
      this.cameraEntity.setLocalEulerAngles(snapshot.pitch, snapshot.yaw, 0);
    }
  }

  dispose() {
    this.unsubDoorListener?.();
    this.unsubDoorListener = null;
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
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
