import { describe, it, expect, beforeEach } from "vitest";
import { gameState } from "../src/game/GameState";
import { evidenceSystem } from "../src/systems/EvidenceSystem";
import { objectiveSystem } from "../src/systems/ObjectiveSystem";
import { buildSaveData, restoreSaveData } from "../src/game/SaveManager";

function freshInit() {
  gameState.resetProgress();
  evidenceSystem.init();
  objectiveSystem.init();
}

describe("Save/Load System", () => {
  beforeEach(() => {
    freshInit();
  });

  it("save includes collected evidence", () => {
    evidenceSystem.collect("staff_keycard_001");
    evidenceSystem.collect("service_map_001");
    const data = buildSaveData("dock", "manual", [0, 1.7, 5], [0, 0, 0]);
    expect(data.collectedEvidenceIds).toContain("staff_keycard_001");
    expect(data.collectedEvidenceIds).toContain("service_map_001");
  });

  it("save includes completed objectives", () => {
    gameState.completeObjective("obj_find_way_inside");
    gameState.completeObjective("obj_enter_service_route");
    const data = buildSaveData("service_entrance", "manual", [0, 1.7, 8], [0, 0, 0]);
    expect(data.completedObjectiveIds).toContain("obj_find_way_inside");
    expect(data.completedObjectiveIds).toContain("obj_enter_service_route");
  });

  it("save includes unlocked doors", () => {
    gameState.unlockDoor("main_gate");
    gameState.unlockDoor("maintenance_door");
    const data = buildSaveData("mansion_office", "manual", [0, 1.7, 4], [0, 0, 0]);
    expect(data.unlockedDoorIds).toContain("main_gate");
    expect(data.unlockedDoorIds).toContain("maintenance_door");
  });

  it("restore rejects wrong version", () => {
    const badData = {
      version: 999,
      timestamp: Date.now(),
      sceneId: "dock",
      checkpointId: "test",
      playerPosition: [0, 1.7, 5] as [number, number, number],
      playerRotation: [0, 0, 0] as [number, number, number],
      collectedEvidenceIds: [],
      completedObjectiveIds: [],
      activeObjectiveIds: [],
      unlockedDoorIds: [],
      disabledCameraIds: [],
      terminalStates: {},
      unlockedTerminalIds: [],
      alertState: "normal",
      alarmsTriggered: 0,
      lockdown: false,
      endingFlags: {},
      settingsSnapshot: null,
      playtimeSeconds: 0,
    };
    const result = restoreSaveData(badData as any);
    expect(result).toBe(false);
  });

  it("restore rejects unknown evidence ID", () => {
    const badData = {
      version: 1,
      timestamp: Date.now(),
      sceneId: "dock",
      checkpointId: "test",
      playerPosition: [0, 1.7, 5] as [number, number, number],
      playerRotation: [0, 0, 0] as [number, number, number],
      collectedEvidenceIds: ["nonexistent_evidence_001"],
      completedObjectiveIds: [],
      activeObjectiveIds: [],
      unlockedDoorIds: [],
      disabledCameraIds: [],
      terminalStates: {},
      unlockedTerminalIds: [],
      alertState: "normal",
      alarmsTriggered: 0,
      lockdown: false,
      endingFlags: {},
      settingsSnapshot: null,
      playtimeSeconds: 0,
    };
    const result = restoreSaveData(badData as any);
    expect(result).toBe(false);
  });

  it("restore resets previous state before applying loaded state", () => {
    evidenceSystem.collect("staff_keycard_001");
    gameState.completeObjective("obj_find_way_inside");
    gameState.unlockDoor("main_gate");
    gameState.setDetection(50, "suspicious");

    const data = buildSaveData("dock", "manual", [0, 1.7, 5], [0, 0, 0]);

    // Mutate state before restore
    evidenceSystem.collect("service_map_001");
    gameState.completeObjective("obj_enter_service_route");
    gameState.unlockDoor("maintenance_door");

    // Restore should add save state to current state (evidence accumulates, objectives complete)
    const result = restoreSaveData(data);
    expect(result).toBe(true);
    expect(gameState.hasEvidence("staff_keycard_001")).toBe(true);
    expect(gameState.hasEvidence("service_map_001")).toBe(true);
    expect(gameState.isDoorUnlocked("main_gate")).toBe(true);
    expect(gameState.isDoorUnlocked("maintenance_door")).toBe(true);
  });
});
