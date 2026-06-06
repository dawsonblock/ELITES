import * as pc from "playcanvas";
import { GameConfig } from "../GameConfig";
import { GameEvents } from "../GameEvents";
import { gameState } from "../GameState";
import { inputManager } from "../InputManager";
import { eventBus } from "../../utils/eventBus";
import { audioSystem } from "../../systems/AudioSystem";
import { clamp } from "../../utils/math";
import { getCameraMeta } from "../../utils/entityMeta";

export class StealthSystem {
  private sceneRoot: pc.Entity | null = null;
  private playerEntity: pc.Entity | null = null;

  setEntities(sceneRoot: pc.Entity | null, playerEntity: pc.Entity | null) {
    this.sceneRoot = sceneRoot;
    this.playerEntity = playerEntity;
  }

  updateSweeps(_dt: number) {
    if (!this.sceneRoot) return;
    this.sceneRoot.children.forEach((child) => {
      const cam = getCameraMeta(child as pc.Entity);
      if (!cam) return;
      if (gameState.isCameraDisabled(cam.id)) return;
      const t = performance.now() / 1000;
      const angle = Math.sin(t * cam.sweepSpeed) * cam.sweepAngle;
      child.setLocalEulerAngles(0, angle, 0);
    });
  }

  updateDetection(dt: number) {
    if (!this.playerEntity || !this.sceneRoot) return;
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
  }
}
