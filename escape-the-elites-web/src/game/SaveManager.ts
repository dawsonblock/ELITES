import type { SaveData } from "../types/save";
import { gameState } from "./GameState";
import { loadSave, saveGame, listSaveSlots, deleteSave } from "../utils/storage";

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
    unlockedDoorIds: Array.from((gameState as any)._unlockedDoors as Set<string>),
    disabledCameraIds: Array.from((gameState as any)._disabledCameras as Set<string>),
    terminalStates: {},
    alertState: gameState.alert,
    alarmsTriggered: 0,
    endingFlags: gameState.endingFlags,
    settingsSnapshot: gameState.getSettings(),
    playtimeSeconds: gameState.playtimeSeconds,
  };
}

export function restoreSaveData(data: SaveData): boolean {
  if (data.version !== CURRENT_VERSION) return false;
  gameState.sceneId = data.sceneId;
  gameState.playtimeSeconds = data.playtimeSeconds;
  data.collectedEvidenceIds.forEach((id) => gameState.collectEvidence(id));
  data.completedObjectiveIds.forEach((id) => gameState.completeObjective(id));
  data.activeObjectiveIds.forEach((id) => gameState.activateObjective(id));
  data.unlockedDoorIds.forEach((id) => gameState.unlockDoor(id));
  data.disabledCameraIds.forEach((id) => gameState.disableCamera(id));
  gameState.setAlert(data.alertState as any);
  Object.entries(data.endingFlags).forEach(([k, v]) => gameState.setEndingFlag(k, v));
  if (data.settingsSnapshot) gameState.setSettings(data.settingsSnapshot);
  return true;
}

export function getSaveSlots(): string[] {
  return ["AutoSave", "ManualSave1", "ManualSave2", "ManualSave3"];
}

export { loadSave, saveGame, listSaveSlots, deleteSave };
