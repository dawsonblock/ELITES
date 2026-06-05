export type SaveData = {
  version: number;
  timestamp: number;
  sceneId: string;
  checkpointId: string;
  playerPosition: [number, number, number];
  playerRotation: [number, number, number];
  collectedEvidenceIds: string[];
  completedObjectiveIds: string[];
  activeObjectiveIds: string[];
  unlockedDoorIds: string[];
  disabledCameraIds: string[];
  terminalStates: Record<string, unknown>;
  alertState: string;
  alarmsTriggered: number;
  endingFlags: Record<string, boolean>;
  settingsSnapshot?: Record<string, unknown>;
  playtimeSeconds: number;
};
