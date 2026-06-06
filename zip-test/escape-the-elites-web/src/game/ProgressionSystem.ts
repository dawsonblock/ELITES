
import { gameState } from "./GameState";
import { eventBus } from "../utils/eventBus";
import { GameEvents } from "./GameEvents";

export class ProgressionSystem {
  handleSceneTransition(targetScene: string) {
    const completions: Record<string, { complete?: string[]; activate?: string[] }> = {
      service_entrance: { complete: ["obj_find_way_inside"], activate: ["obj_enter_service_route", "obj_avoid_first_camera", "obj_unlock_maintenance_door"] },
      mansion_office: { complete: ["obj_enter_service_route", "obj_unlock_maintenance_door"], activate: ["obj_find_office_evidence"] },
      security_wing: { complete: ["obj_find_office_evidence"], activate: ["obj_find_bunker_access", "obj_enter_bunker"] },
      bunker_server_room: { complete: ["obj_enter_bunker"], activate: ["obj_download_archive"] },
      broadcast_tower: { complete: ["obj_escape_lockdown", "obj_reach_broadcast_tower"], activate: ["obj_upload_broadcast"] },
    };
    const actions = completions[targetScene];
    if (actions) {
      actions.complete?.forEach((id) => {
        if (gameState.completeObjective(id)) {
          eventBus.emit(GameEvents.OBJECTIVE_UPDATED);
        }
      });
      actions.activate?.forEach((id) => {
        const obj = gameState.getObjective(id);
        if (!obj || obj.status !== "locked") return;
        const evidenceMet = !obj.evidenceGate || obj.evidenceGate.every((eid) => gameState.hasEvidence(eid));
        if (evidenceMet && gameState.activateObjective(id)) {
          eventBus.emit(GameEvents.OBJECTIVE_UPDATED);
        }
      });
    }
  }
}

export const progressionSystem = new ProgressionSystem();
