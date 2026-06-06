import * as pc from "playcanvas";
import { GameConfig } from "../GameConfig";
import { inputManager } from "../InputManager";
import { audioSystem } from "../../systems/AudioSystem";
import { clamp, lerp } from "../../utils/math";
import { resolveCircleAABB } from "../../utils/collision";
import type { AABB } from "../../utils/collision";

export class PlayerController {
  playerEntity: pc.Entity | null = null;
  cameraEntity: pc.Entity | null = null;
  flashlightEntity: pc.Entity | null = null;
  private app: pc.Application;
  private targetYaw = 0;
  private targetPitch = 0;
  private currentFov: number = GameConfig.camera.fov;
  private moveTime = 0;

  constructor(app: pc.Application) {
    this.app = app;
    this.createPlayer();
  }

  private createPlayer() {
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

  update(dt: number, walls: AABB[]) {
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
      const [newX] = resolveCircleAABB(pos.x, pos.z, radius, walls, speedDt * move.x, 0);
      const [, newZ] = resolveCircleAABB(newX, pos.z, radius, walls, 0, speedDt * move.z);
      pos.x = newX;
      pos.z = newZ;
      this.playerEntity.setPosition(pos);
      this.moveTime += dt;
      const stepRate = speed > GameConfig.player.walkSpeed ? 0.35 : 0.55;
      if (this.moveTime > 0 && Math.floor(this.moveTime / stepRate) !== Math.floor((this.moveTime - dt) / stepRate)) {
        audioSystem.playFootstep("concrete");
      }
      // Emit noise event for stealth detection
      // surface multipliers: concrete=1.0 (default), metal=1.6, carpet=0.5
      const stanceMult = inputManager.isActive("sprint") ? 2.5
        : inputManager.isActive("crouch") ? 0.25
        : 1.0;
      const noiseStrength = stanceMult; // surfaceMult=1.0 until surface detection added
      audioSystem.emitNoise({ x: pos.x, y: pos.y, z: pos.z }, 6 * stanceMult, noiseStrength);
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
  }

  getSnapshot(sceneId: string) {
    const pos = this.playerEntity?.getPosition();
    const rot = this.cameraEntity?.getLocalEulerAngles();
    return {
      sceneId,
      position: pos ? ([pos.x, pos.y, pos.z] as [number, number, number]) : ([0, GameConfig.player.height / 2, 0] as [number, number, number]),
      yaw: rot?.y ?? 0,
      pitch: rot?.x ?? 0,
    };
  }

  loadSnapshot(snapshot: { sceneId: string; position: [number, number, number]; yaw: number; pitch: number }) {
    if (this.playerEntity) {
      this.playerEntity.setPosition(snapshot.position[0], snapshot.position[1], snapshot.position[2]);
    }
    this.targetYaw = snapshot.yaw;
    this.targetPitch = snapshot.pitch;
    if (this.cameraEntity) {
      this.cameraEntity.setLocalEulerAngles(snapshot.pitch, snapshot.yaw, 0);
    }
  }

  resetPosition(sceneId: string) {
    const spawns: Record<string, [number, number, number]> = {
      dock: [0, GameConfig.player.height / 2, 5],
      service_entrance: [0, GameConfig.player.height / 2, 8],
      mansion_office: [0, GameConfig.player.height / 2, 4],
      security_wing: [0, GameConfig.player.height / 2, 6],
      bunker_server_room: [0, GameConfig.player.height / 2, 6],
      broadcast_tower: [0, GameConfig.player.height / 2, 3],
    };
    const spawn = spawns[sceneId];
    if (spawn && this.playerEntity) {
      this.playerEntity.setPosition(spawn[0], spawn[1], spawn[2]);
      this.targetYaw = 0;
      this.targetPitch = 0;
      if (this.cameraEntity) this.cameraEntity.setLocalEulerAngles(0, 0, 0);
    }
  }

  getPosition() {
    return this.playerEntity?.getPosition() ?? new pc.Vec3(0, GameConfig.player.height / 2, 0);
  }
}
