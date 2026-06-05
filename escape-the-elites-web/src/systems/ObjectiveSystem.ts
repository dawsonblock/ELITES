import { gameState } from "../game/GameState";
import { eventBus } from "../utils/eventBus";
import { GameEvents } from "../game/GameEvents";
import objectivesJson from "../data/objectives.json";
import type { Objective } from "../types/objective";

export class ObjectiveSystem {
  init() {
    const cloned = JSON.parse(JSON.stringify(objectivesJson)) as Objective[];
    gameState.registerObjectives(cloned);
    // Activate first objective
    gameState.activateObjective("obj_find_way_inside");
  }

  complete(id: string): boolean {
    if (!gameState.completeObjective(id)) return false;
    eventBus.emit(GameEvents.OBJECTIVE_COMPLETED, id);

    // Check dependents and unlock
    gameState.allObjectives().forEach((obj) => {
      if (obj.status !== "locked") return;
      if (!obj.dependsOn) return;
      const depsMet = obj.dependsOn.every((dep) => gameState.completedObjectives().includes(dep));
      const evidenceMet = !obj.evidenceGate || obj.evidenceGate.every((eid) => gameState.hasEvidence(eid));
      if (depsMet && evidenceMet) {
        gameState.activateObjective(obj.id);
        eventBus.emit(GameEvents.OBJECTIVE_UPDATED, obj.id);
      }
    });

    return true;
  }

  checkEvidenceGates() {
    gameState.allObjectives().forEach((obj) => {
      if (obj.status !== "locked") return;
      const depsMet = !obj.dependsOn || obj.dependsOn.every((dep) => gameState.completedObjectives().includes(dep));
      const evidenceMet = !obj.evidenceGate || obj.evidenceGate.every((eid) => gameState.hasEvidence(eid));
      if (depsMet && evidenceMet) {
        gameState.activateObjective(obj.id);
        eventBus.emit(GameEvents.OBJECTIVE_UPDATED, obj.id);
      }
    });
  }
}

export const objectiveSystem = new ObjectiveSystem();
