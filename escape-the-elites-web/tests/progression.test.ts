import { describe, it, expect, beforeEach } from "vitest";
import { evidenceSystem } from "../src/systems/EvidenceSystem";
import { objectiveSystem } from "../src/systems/ObjectiveSystem";
import { EndingSystem } from "../src/systems/EndingSystem";
import { gameState } from "../src/game/GameState";
import terminals from "../src/data/terminals.json";

function freshInit() {
  gameState.resetProgress();
  evidenceSystem.init();
  objectiveSystem.init();
}

describe("Progression System", () => {
  beforeEach(() => {
    freshInit();
  });

  it("collecting staff keycard unlocks the maintenance door objective", () => {
    // Pre-complete prerequisite objectives
    gameState.completeObjective("obj_find_way_inside");
    gameState.completeObjective("obj_enter_service_route");
    objectiveSystem.checkEvidenceGates();

    evidenceSystem.collect("staff_keycard_001");
    objectiveSystem.checkEvidenceGates();

    expect(gameState.hasEvidence("staff_keycard_001")).toBe(true);
    expect(gameState.getObjective("obj_unlock_maintenance_door")?.status).toBe("active");
  });

  it("collecting access log with prerequisites met unlocks bunker access", () => {
    // Complete chain up to bunker access
    gameState.completeObjective("obj_find_way_inside");
    gameState.completeObjective("obj_enter_service_route");
    gameState.completeObjective("obj_unlock_maintenance_door");
    gameState.completeObjective("obj_find_office_evidence");
    gameState.completeObjective("obj_find_bunker_access");
    objectiveSystem.checkEvidenceGates();

    evidenceSystem.collect("access_log_001");
    objectiveSystem.checkEvidenceGates();

    expect(gameState.hasEvidence("access_log_001")).toBe(true);
    expect(gameState.getObjective("obj_enter_bunker")?.status).toBe("active");
  });

  it("collecting server archive unlocks reach broadcast tower objective", () => {
    // Complete chain up to escape lockdown
    gameState.completeObjective("obj_find_way_inside");
    gameState.completeObjective("obj_enter_service_route");
    gameState.completeObjective("obj_unlock_maintenance_door");
    gameState.completeObjective("obj_find_office_evidence");
    gameState.completeObjective("obj_find_bunker_access");
    gameState.completeObjective("obj_enter_bunker");
    gameState.completeObjective("obj_download_archive");
    gameState.completeObjective("obj_escape_lockdown");
    objectiveSystem.checkEvidenceGates();

    evidenceSystem.collect("server_archive_001");
    objectiveSystem.checkEvidenceGates();

    expect(gameState.hasEvidence("server_archive_001")).toBe(true);
    expect(gameState.getObjective("obj_reach_broadcast_tower")?.status).toBe("active");
  });

  it("having broadcast key and server archive enables ending", () => {
    evidenceSystem.collect("server_archive_001");
    evidenceSystem.collect("broadcast_key_001");

    const endingSystem = new EndingSystem();
    gameState.setEndingFlag("broadcastComplete", true);
    const score = endingSystem.calculateScore();
    const end = endingSystem.determineEnding(score);

    expect(end).not.toBe("bad");
    expect(score.requiredEvidencePercent).toBeGreaterThan(0);
  });

  it("restart resets all state cleanly", () => {
    evidenceSystem.collect("staff_keycard_001");
    gameState.completeObjective("obj_find_way_inside");
    gameState.unlockDoor("maintenance_door");
    gameState.unlockTerminal("terminal_office_001");
    gameState.setDetection(50, "suspicious");
    gameState.setAlert("local_alert");
    gameState.lockdown = true;

    freshInit();

    expect(gameState.hasEvidence("staff_keycard_001")).toBe(false);
    expect(gameState.collectedEvidence().length).toBe(0);
    expect(gameState.completedObjectives().length).toBe(0);
    expect(gameState.isDoorUnlocked("maintenance_door")).toBe(false);
    expect(gameState.isTerminalUnlocked("terminal_office_001")).toBe(false);
    expect(gameState.detectionValue).toBe(0);
    expect(gameState.detection).toBe("hidden");
    expect(gameState.alert).toBe("normal");
    expect(gameState.lockdown).toBe(false);

    // Verify definitions are fresh (not mutated from previous run)
    expect(gameState.getEvidence("staff_keycard_001")?.discovered).toBe(false);
    expect(gameState.getObjective("obj_find_way_inside")?.status).toBe("active");
    expect(gameState.getObjective("obj_find_office_evidence")?.status).toBe("locked");
  });

  it("bunker terminal unlock code is the player-visible 7391", () => {
    const bunkerTerminal = (terminals as any[]).find((t) => t.id === "terminal_server_001");
    expect(bunkerTerminal).toBeDefined();
    expect(bunkerTerminal.unlockCode).toBe("7391");
  });

  it("terminal start_download command references server_archive_001", () => {
    const serverTerm = (terminals as any[]).find((t) => t.id === "terminal_server_001");
    const downloadCmd = serverTerm?.commands?.find((c: any) => c.id === "cmd_download_server_archive");
    expect(downloadCmd).toBeDefined();
    expect(downloadCmd.params?.evidenceId).toBe("server_archive_001");
  });
});
