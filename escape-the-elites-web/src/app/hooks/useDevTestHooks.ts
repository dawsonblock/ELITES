import { useEffect } from "react";
import type { RefObject } from "react";
import type { Game } from "../../game/Game";
import { gameState } from "../../game/GameState";
import { eventBus } from "../../utils/eventBus";
import { GameEvents } from "../../game/GameEvents";
import { evidenceSystem } from "../../systems/EvidenceSystem";
import { objectiveSystem } from "../../systems/ObjectiveSystem";
import { buildSaveData, saveGame } from "../../game/SaveManager";
import { GameConfig } from "../../game/GameConfig";

export type EteTestHooks = {
  collectEvidence: (id: string) => void;
  completeObjective: (id: string) => void;
  unlockDoor: (id: string) => void;
  loadScene: (id: string) => void;
  teleport: (pos: [number, number, number], yaw?: number, pitch?: number) => void;
  triggerBroadcast: () => void;
  isReady: () => boolean;
  saveToSlot: (slot: string) => void;
  placePlayerNear: (evidenceId: string) => void;
  hasEvidence: (id: string) => boolean;
  isInteractablePresent: (evidenceId: string) => boolean;
  getState: () => {
    sceneId: string;
    evidence: string[];
    objectives: string[];
    detection: string;
    alert: string;
    lockdown: boolean;
  };
};

export function useDevTestHooks(gameRef: RefObject<Game | null>): void {
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__ETE_TEST__ = {
        collectEvidence: (id: string) => evidenceSystem.collect(id),
        completeObjective: (id: string) => objectiveSystem.complete(id),
        unlockDoor: (id: string) => {
          gameState.unlockDoor(id);
          eventBus.emit(GameEvents.DOOR_UNLOCKED, id);
        },
        loadScene: (id: string) => gameRef.current?.loadScene(id),
        teleport: (pos: [number, number, number], yaw?: number, pitch?: number) => {
          if (gameRef.current) {
            const safeY = Math.max(pos[1], GameConfig.player.radius);
            gameRef.current.loadPlayerSnapshot({
              sceneId: gameRef.current.getSceneId(),
              position: [pos[0], safeY, pos[2]],
              yaw: yaw ?? 0,
              pitch: pitch ?? 0,
            });
          }
        },
        triggerBroadcast: () => eventBus.emit(GameEvents.BROADCAST_UPLOAD),
        isReady: () => !!gameRef.current,
        saveToSlot: (slot: string) => {
          if (gameRef.current) {
            const snap = gameRef.current.getPlayerSnapshot();
            const data = buildSaveData(snap.sceneId, "test", snap.position, [snap.pitch, snap.yaw, 0]);
            saveGame(slot, data);
          }
        },
        placePlayerNear: (evidenceId: string) => {
          if (!gameRef.current) return;
          const pos = gameRef.current.getInteractablePosition(evidenceId);
          if (!pos) return;
          gameRef.current.loadPlayerSnapshot({
            sceneId: gameRef.current.getSceneId(),
            position: [pos[0], pos[1] + 0.3, pos[2] + 1.2],
            yaw: 180,
            pitch: -10,
          });
        },
        hasEvidence: (id: string) => gameState.hasEvidence(id),
        isInteractablePresent: (evidenceId: string) => !!gameRef.current?.hasInteractable(evidenceId),
        getState: () => ({
          sceneId: gameState.sceneId,
          evidence: gameState.collectedEvidence(),
          objectives: gameState.completedObjectives(),
          detection: gameState.detection,
          alert: gameState.alert,
          lockdown: gameState.lockdown,
        }),
      } as EteTestHooks;
    }
    return () => {
      if (import.meta.env.DEV) {
        delete (window as any).__ETE_TEST__;
      }
    };
  }, []);
}
