import type { SaveData } from "../types/save";
import { gameState } from "./GameState";
import { objectiveSystem } from "../systems/ObjectiveSystem";
import { eventBus } from "../utils/eventBus";
import { GameEvents } from "./GameEvents";
import { loadSave, saveGame, listSaveSlots, deleteSave } from "../utils/storage";
import scenes from "../data/scenes.json";

export const CURRENT_VERSION = 1;

export function buildSaveData(sceneId: string, checkpointId: string, position: [number, number, number], rotation: [number, number, number]): SaveData {
  return {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    sceneId,
    checkpointId,
    playerPosition: position,
    playerRotation: rotation,
    collectedEvidenceIds: gameState.collectedEvidence(),
    completedObjectiveIds: gameState.completedObjectives(),
    activeObjectiveIds: gameState.activeObjectives(),
    unlockedDoorIds: gameState.unlockedDoors(),
    disabledCameraIds: gameState.disabledCameras(),
    terminalStates: {},
    unlockedTerminalIds: gameState.unlockedTerminals(),
    alertState: gameState.alert,
    alarmsTriggered: 0,
    lockdown: gameState.lockdown,
    endingFlags: gameState.endingFlags,
    settingsSnapshot: gameState.getSettings(),
    playtimeSeconds: gameState.playtimeSeconds,
  };
}

const validSceneIds = new Set((scenes as any[]).map((s) => s.id));

export function restoreSaveData(data: SaveData): boolean {
  if (data.version !== CURRENT_VERSION) return false;

  // Validate scene ID
  if (!validSceneIds.has(data.sceneId)) return false;

  // Validate evidence IDs before restoring
  for (const id of data.collectedEvidenceIds) {
    if (!gameState.getEvidence(id)) return false;
  }
  for (const id of data.completedObjectiveIds) {
    if (!gameState.getObjective(id)) return false;
  }
  for (const id of data.activeObjectiveIds) {
    if (!gameState.getObjective(id)) return false;
  }

  gameState.resetProgress(true);

  gameState.sceneId = data.sceneId;
  gameState.playtimeSeconds = data.playtimeSeconds;
  data.collectedEvidenceIds.forEach((id) => gameState.collectEvidence(id));
  data.completedObjectiveIds.forEach((id) => gameState.completeObjective(id));
  data.activeObjectiveIds.forEach((id) => gameState.activateObjective(id));
  data.unlockedDoorIds.forEach((id) => gameState.unlockDoor(id));
  data.disabledCameraIds.forEach((id) => gameState.disableCamera(id));
  data.unlockedTerminalIds?.forEach((id) => gameState.unlockTerminal(id));
  gameState.setAlert(data.alertState as any);
  gameState.lockdown = data.lockdown ?? false;
  Object.entries(data.endingFlags).forEach(([k, v]) => gameState.setEndingFlag(k, v));
  if (data.settingsSnapshot) gameState.setSettings(data.settingsSnapshot);
  objectiveSystem.checkEvidenceGates();

  // Refresh UI subscribers
  eventBus.emit(GameEvents.EVIDENCE_COLLECTED);
  eventBus.emit(GameEvents.OBJECTIVE_UPDATED);
  eventBus.emit(GameEvents.ALERT_CHANGED, gameState.alert);
  eventBus.emit(GameEvents.DETECTION_CHANGED);
  eventBus.emit(GameEvents.SCENE_LOAD, gameState.sceneId);

  return true;
}

export function getSaveSlots(): string[] {
  return ["AutoSave", "ManualSave1", "ManualSave2", "ManualSave3"];
}

export { loadSave, saveGame, listSaveSlots, deleteSave };
