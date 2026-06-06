import * as pc from "playcanvas";
import { GameConfig } from "../GameConfig";
import { GameEvents } from "../GameEvents";
import { gameState } from "../GameState";
import { inputManager } from "../InputManager";
import { eventBus } from "../../utils/eventBus";
import { audioSystem } from "../../systems/AudioSystem";
import { clamp } from "../../utils/math";
import { getCameraMeta } from "../../utils/entityMeta";

// Colors for camera cone states
const CONE_COLOR_SAFE       = new pc.Color(0.8, 0.6, 0.1);  // dim yellow
const CONE_COLOR_SUSPICIOUS = new pc.Color(0.9, 0.45, 0.05); // orange
const CONE_COLOR_DETECTING  = new pc.Color(0.9, 0.1, 0.05);  // red

const CONE_OPACITY_SAFE       = 0.10;
const CONE_OPACITY_SUSPICIOUS = 0.18;
const CONE_OPACITY_DETECTING  = 0.28;

export class StealthSystem {
  private sceneRoot: pc.Entity | null = null;
  private playerEntity: pc.Entity | null = null;
  private hidingZones: pc.Entity[] = [];
  private patrolEntities: PatrolEnemy[] = [];

  setEntities(sceneRoot: pc.Entity | null, playerEntity: pc.Entity | null) {
    this.sceneRoot = sceneRoot;
    this.playerEntity = playerEntity;
    this.hidingZones = [];
    this.patrolEntities = [];
  }

  registerHidingZone(entity: pc.Entity) {
    this.hidingZones.push(entity);
  }

  registerPatrolEnemy(enemy: PatrolEnemy) {
    this.patrolEntities.push(enemy);
  }

  /** Returns true if the player is currently inside any hiding zone. */
  private isPlayerHiding(): boolean {
    if (!this.playerEntity || this.hidingZones.length === 0) return false;
    const ppos = this.playerEntity.getPosition();
    for (const zone of this.hidingZones) {
      const zpos = zone.getPosition();
      const zscale = zone.getLocalScale();
      if (
        ppos.x > zpos.x - zscale.x / 2 && ppos.x < zpos.x + zscale.x / 2 &&
        ppos.y > zpos.y - zscale.y / 2 && ppos.y < zpos.y + zscale.y / 2 &&
        ppos.z > zpos.z - zscale.z / 2 && ppos.z < zpos.z + zscale.z / 2
      ) {
        return true;
      }
    }
    return false;
  }

  updateSweeps(dt: number) {
    if (!this.sceneRoot) return;
    const ppos = this.playerEntity?.getPosition();

    this.sceneRoot.children.forEach((child) => {
      const cam = getCameraMeta(child as pc.Entity);
      if (!cam) return;
      if (gameState.isCameraDisabled(cam.id)) return;

      const t = performance.now() / 1000;
      const angle = Math.sin(t * cam.sweepSpeed) * cam.sweepAngle;
      child.setLocalEulerAngles(0, angle, 0);

      // Update cone material color based on player proximity
      if (ppos) {
        const cone = child.findByName("CameraCone") as pc.Entity | null;
        if (cone?.render) {
          const dist = (child as pc.Entity).getPosition().distance(ppos);
          const dir = ppos.clone().sub((child as pc.Entity).getPosition()).normalize();
          const forward = (child as pc.Entity).forward;
          const coneAngle = Math.acos(clamp(dir.dot(forward), -1, 1)) * (180 / Math.PI);
          const inRange = dist < GameConfig.stealth.cameraDetectionRange;
          const inCone = coneAngle < cam.sweepAngle;

          const mat = (cone.render as any).material as pc.StandardMaterial;
          if (inRange && inCone) {
            const proximity = 1 - dist / GameConfig.stealth.cameraDetectionRange;
            if (proximity > 0.5) {
              mat.diffuse = CONE_COLOR_DETECTING;
              mat.opacity = CONE_OPACITY_DETECTING;
            } else {
              mat.diffuse = CONE_COLOR_SUSPICIOUS;
              mat.opacity = CONE_OPACITY_SUSPICIOUS;
            }
          } else {
            mat.diffuse = CONE_COLOR_SAFE;
            mat.opacity = CONE_OPACITY_SAFE;
          }
          mat.update();
        }
      }
    });

    // Update patrol enemies
    for (const enemy of this.patrolEntities) {
      enemy.update(dt);
    }
  }

  updateDetection(dt: number) {
    if (!this.playerEntity || !this.sceneRoot) return;

    // Hiding zones reduce detection gain significantly
    const hidingMultiplier = this.isPlayerHiding() ? 0.05 : 1.0;

    const ppos = this.playerEntity.getPosition();
    let detectionDelta = 0;

    this.sceneRoot.children.forEach((child) => {
      const cam = getCameraMeta(child as pc.Entity);
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
      let mod = hidingMultiplier;
      if (inputManager.isActive("crouch")) mod *= 0.4;
      if (inputManager.isActive("flashlight")) mod *= 1.5;
      detectionDelta += distFactor * angleFactor * mod * dt * 40;
    });

    // Patrol enemy detection
    for (const enemy of this.patrolEntities) {
      const contrib = enemy.getDetectionContribution(ppos, hidingMultiplier, dt);
      detectionDelta += contrib;
    }

    let current = gameState.detectionValue;
    if (detectionDelta > 0) {
      current += detectionDelta;
    } else {
      current -= GameConfig.stealth.detectionDecayRate * dt;
    }
    current = clamp(current, 0, 100);

    let state: import("../../types/stealth").DetectionState = "hidden";
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

  dispose() {
    this.sceneRoot = null;
    this.playerEntity = null;
    this.hidingZones = [];
    this.patrolEntities = [];
  }
}

/** FSM guard with Patrol → Investigate → Alert → ReturnToPatrol states. */
export class PatrolEnemy {
  entity: pc.Entity;
  private waypoints: pc.Vec3[];
  private waypointIndex = 0;
  private readonly visionRange: number;
  private readonly visionAngle: number;
  private readonly hearingRange: number;

  // FSM state
  private _state: 'patrol' | 'investigate' | 'alert' | 'returnToPatrol' = 'patrol';

  // Speeds
  private readonly PATROL_SPEED = 1.8;
  private readonly INVESTIGATE_SPEED = 2.4;

  // Timers
  private _waypointPauseTimer = 0;    // pause at waypoint in patrol
  private _investigateTimer = 0;      // how long we've been investigating
  private _alertTimer = 0;            // how long we've been in alert

  // Detection thresholds
  private readonly INVESTIGATE_THRESHOLD = 25; // detection value to trigger investigate
  private readonly DETECTED_THRESHOLD = 100;   // detection value to trigger alert

  // Last-known player position (used in investigate / alert)
  _lastKnownPlayerPos: pc.Vec3 | null = null;

  // Accumulated time (for sinusoidal look-around in investigate)
  private _elapsedTime = 0;

  // Vision cone entity reference (for colour updates)
  private _cone: pc.Entity;

  constructor(
    app: pc.Application,
    name: string,
    waypoints: [number, number, number][],
    options: { visionRange?: number; visionAngle?: number; hearingRange?: number } = {}
  ) {
    this.visionRange = options.visionRange ?? GameConfig.stealth.guardVisionRange;
    this.visionAngle = options.visionAngle ?? GameConfig.stealth.guardConeAngle;
    this.hearingRange = options.hearingRange ?? GameConfig.stealth.guardHearingRange;
    this.waypoints = waypoints.map(([x, y, z]) => new pc.Vec3(x, y, z));

    // Create enemy entity — simple capsule shape
    this.entity = new pc.Entity(name);
    this.entity.addComponent("render", { type: "capsule" });
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(0.55, 0.12, 0.08);
    mat.update();
    (this.entity.render as any).material = mat;
    this.entity.setLocalScale(0.5, 0.9, 0.5);
    this.entity.setPosition(this.waypoints[0].x, this.waypoints[0].y, this.waypoints[0].z);
    app.root.addChild(this.entity);

    // Vision cone — forward-facing
    const cone = new pc.Entity("PatrolCone");
    cone.addComponent("render", { type: "cone" });
    cone.setLocalScale(this.visionRange * 0.4, this.visionRange, this.visionRange * 0.4);
    cone.setLocalPosition(0, 0, this.visionRange * 0.4);
    cone.setLocalEulerAngles(-90, 0, 0);
    const coneMat = new pc.StandardMaterial();
    coneMat.diffuse = CONE_COLOR_SAFE;
    coneMat.opacity = CONE_OPACITY_SAFE;
    coneMat.blendType = pc.BLEND_NORMAL;
    (coneMat as any).depthWrite = false;
    coneMat.update();
    (cone.render as any).material = coneMat;
    this.entity.addChild(cone);
    this._cone = cone;
  }

  // ─── helpers ──────────────────────────────────────────────────────────────

  /** Move the entity toward `target` at `speed`. Returns true when arrived. */
  private _moveTo(target: pc.Vec3, speed: number, dt: number): boolean {
    const pos = this.entity.getPosition();
    const diff = target.clone().sub(pos);
    diff.y = 0;
    const dist = diff.length();
    if (dist < 0.3) return true;

    const dir = diff.normalize();
    const step = dir.clone().mulScalar(speed * dt);
    const newPos = pos.clone().add(step);
    newPos.y = target.y;
    this.entity.setPosition(newPos.x, newPos.y, newPos.z);

    // Face direction of travel
    const angle = Math.atan2(dir.x, dir.z) * (180 / Math.PI);
    this.entity.setLocalEulerAngles(0, angle, 0);
    return false;
  }

  /** Find index of the waypoint nearest to `pos`. */
  private _nearestWaypointIndex(pos: pc.Vec3): number {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.waypoints.length; i++) {
      const d = this.waypoints[i].distance(pos);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  /** Update the vision cone colour to reflect current FSM state. */
  private _updateConeColor() {
    const cone = this._cone;
    if (!cone?.render) return;
    const mat = (cone.render as any).material as pc.StandardMaterial;
    switch (this._state) {
      case 'patrol':
        mat.diffuse = CONE_COLOR_SAFE;
        mat.opacity = CONE_OPACITY_SAFE;
        break;
      case 'investigate':
        mat.diffuse = CONE_COLOR_SUSPICIOUS;
        mat.opacity = CONE_OPACITY_SUSPICIOUS;
        break;
      case 'alert':
      case 'returnToPatrol':
        mat.diffuse = CONE_COLOR_DETECTING;
        mat.opacity = CONE_OPACITY_DETECTING;
        break;
    }
    mat.update();
  }

  /** Transition to a new state, emit bark, update cone colour. */
  private _transition(next: 'patrol' | 'investigate' | 'alert' | 'returnToPatrol') {
    if (this._state === next) return;
    const prev = this._state;
    this._state = next;

    // Bark text
    if (prev === 'patrol' && next === 'investigate') {
      eventBus.emit(GameEvents.SYSTEM_MESSAGE, "Guard: I heard something...");
    } else if (prev === 'investigate' && next === 'alert') {
      eventBus.emit(GameEvents.SYSTEM_MESSAGE, "Guard: THERE! Initiating lockdown.");
    } else if (prev === 'alert' && next === 'returnToPatrol') {
      eventBus.emit(GameEvents.SYSTEM_MESSAGE, "Guard: Searching the area.");
    } else if (prev === 'returnToPatrol' && next === 'patrol') {
      eventBus.emit(GameEvents.SYSTEM_MESSAGE, "Guard: Must have been nothing.");
    }

    // Reset per-state timers
    if (next === 'investigate') {
      this._investigateTimer = 0;
    } else if (next === 'alert') {
      this._alertTimer = 0;
    } else if (next === 'returnToPatrol') {
      // Snap nearest waypoint as return target
      this.waypointIndex = this._nearestWaypointIndex(this.entity.getPosition());
    }

    this._updateConeColor();
  }

  // ─── public API ───────────────────────────────────────────────────────────

  update(dt: number) {
    if (this.waypoints.length < 2) return;
    this._elapsedTime += dt;

    const detection = gameState.detectionValue;

    switch (this._state) {
      // ── PATROL ────────────────────────────────────────────────────────────
      case 'patrol': {
        // Check transitions first
        if (detection >= this.DETECTED_THRESHOLD) {
          this._transition('alert');
          break;
        }
        if (detection >= this.INVESTIGATE_THRESHOLD) {
          this._transition('investigate');
          break;
        }

        // Pause at waypoint
        if (this._waypointPauseTimer > 0) {
          this._waypointPauseTimer -= dt;
          break;
        }

        const target = this.waypoints[this.waypointIndex];
        const arrived = this._moveTo(target, this.PATROL_SPEED, dt);
        if (arrived) {
          this._waypointPauseTimer = 1.2 + Math.random() * 0.8;
          this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
        }
        break;
      }

      // ── INVESTIGATE ───────────────────────────────────────────────────────
      case 'investigate': {
        this._investigateTimer += dt;

        // Transition to alert if fully detected
        if (detection >= this.DETECTED_THRESHOLD) {
          this._transition('alert');
          break;
        }

        // Give up after 6 seconds
        if (this._investigateTimer > 6) {
          this._transition('returnToPatrol');
          break;
        }

        // Move toward last-known position if we have one
        if (this._lastKnownPlayerPos) {
          this._moveTo(this._lastKnownPlayerPos, this.INVESTIGATE_SPEED, dt);
        }

        // Sinusoidal look-around: modulate Y rotation
        const lookYaw = Math.sin(this._elapsedTime * 1.8) * 45;
        const cur = this.entity.getLocalEulerAngles();
        this.entity.setLocalEulerAngles(cur.x, cur.y + lookYaw * dt * 2, cur.z);
        break;
      }

      // ── ALERT ─────────────────────────────────────────────────────────────
      case 'alert': {
        this._alertTimer += dt;

        // Stay at last-known position (already there or close) — no movement
        // Trigger lockdown (idempotent via gameState guard)
        if (gameState.alert !== "full_lockdown") {
          gameState.setAlert("full_lockdown");
          eventBus.emit(GameEvents.ALERT_CHANGED, "full_lockdown");
          eventBus.emit(GameEvents.LOCKDOWN_TRIGGERED);
          gameState.lockdown = true;
        }

        if (this._alertTimer > 4) {
          this._transition('returnToPatrol');
        }
        break;
      }

      // ── RETURN TO PATROL ──────────────────────────────────────────────────
      case 'returnToPatrol': {
        // Check if detection spiked again
        if (detection >= this.DETECTED_THRESHOLD) {
          this._transition('alert');
          break;
        }
        if (detection >= this.INVESTIGATE_THRESHOLD) {
          this._transition('investigate');
          break;
        }

        const target = this.waypoints[this.waypointIndex];
        const arrived = this._moveTo(target, this.PATROL_SPEED, dt);
        if (arrived) {
          this._transition('patrol');
        }
        break;
      }
    }

    this._updateConeColor();
  }

  getDetectionContribution(playerPos: pc.Vec3, hidingMult: number, dt: number): number {
    const pos = this.entity.getPosition();
    const dist = pos.distance(playerPos);

    // Hearing — proximity-based noise check.
    // Sprinting generates noise; use stance multiplier.
    const stanceMult = inputManager.isActive("sprint") ? 1.0 : 0.3;
    const noiseStrength = inputManager.isActive("sprint") ? 1.0 : 0.0;
    const effectiveHearingDist = this.hearingRange * noiseStrength * stanceMult;
    if (effectiveHearingDist > 0 && dist < effectiveHearingDist) {
      const factor = 1 - dist / effectiveHearingDist;
      // Store last-known for FSM use
      this._lastKnownPlayerPos = playerPos.clone();
      return factor * hidingMult * dt * 15;
    }

    // Vision — within range and in cone
    if (dist > this.visionRange) return 0;
    const dir = playerPos.clone().sub(pos).normalize();
    const forward = this.entity.forward;
    const angle = Math.acos(clamp(dir.dot(forward), -1, 1)) * (180 / Math.PI);
    if (angle > this.visionAngle) return 0;

    const distFactor = 1 - dist / this.visionRange;
    const angleFactor = 1 - angle / this.visionAngle;
    let mod = hidingMult;
    if (inputManager.isActive("crouch")) mod *= 0.35;
    const contrib = distFactor * angleFactor * mod * dt * 30;

    // Update last-known if we can see the player
    if (contrib > 0) {
      this._lastKnownPlayerPos = playerPos.clone();
    }

    return contrib;
  }

  destroy() {
    this.entity.destroy();
  }
}
