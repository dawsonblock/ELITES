/**
 * commandBus.ts
 *
 * Lightweight command pattern for game state mutations.
 * All mutations that previously spread across App.tsx, hooks, and event handlers
 * should route through dispatchGameCommand so they are:
 *   - centrally logged in dev mode
 *   - easy to trace for debugging
 *   - testable without React context
 *
 * This is intentionally minimal. No undo/redo, no replay. A simple typed union
 * is enough for Alpha 0.7; expand as needed after one polished route proves
 * which commands are actually needed.
 */

import { gameState } from "../game/GameState";
import { eventBus } from "./eventBus";
import { GameEvents } from "../game/GameEvents";
import { evidenceSystem } from "../systems/EvidenceSystem";
import { objectiveSystem } from "../systems/ObjectiveSystem";
import { saveGame, buildSaveData } from "../game/SaveManager";
import type { Game } from "../game/Game";

// ─── Command types ──────────────────────────────────────────────────────────

export type GameCommand =
  | { type: "COLLECT_EVIDENCE"; evidenceId: string; entity?: import("playcanvas").Entity }
  | { type: "COMPLETE_OBJECTIVE"; objectiveId: string }
  | { type: "UNLOCK_DOOR"; doorId: string }
  | { type: "SET_LOCKDOWN"; value: boolean; source?: string }
  | { type: "SET_ALERT"; state: "normal" | "suspicious" | "local_alert" | "full_lockdown" | "final_lockdown"; source?: string }
  | { type: "START_BROADCAST" }
  | { type: "COMPLETE_BROADCAST" }
  | { type: "SAVE_GAME"; slot: string; game: Game; label: string }
  | { type: "LOAD_GAME"; slot: string; game: Game; onLoaded?: () => void }
  | { type: "OPEN_TERMINAL"; terminalId: string }
  | { type: "CLOSE_TERMINAL" }
  | { type: "SYSTEM_MESSAGE"; message: string };

// ─── Dispatch ───────────────────────────────────────────────────────────────

/**
 * Dispatch a game command. All state mutations go through here.
 * The optional `gameRef` parameter is used for commands that need to call
 * methods on the Game instance (e.g. removeInteractable).
 */
export function dispatchGameCommand(
  command: GameCommand,
  gameRef?: { current: Game | null }
): void {
  if (import.meta.env.DEV) {
    console.debug("[command]", command.type, command);
  }

  switch (command.type) {
    case "COLLECT_EVIDENCE": {
      const collected = evidenceSystem.collect(command.evidenceId);
      if (collected) {
        objectiveSystem.checkEvidenceGates();
        if (command.entity && gameRef?.current) {
          gameRef.current.removeInteractable(command.entity);
        }
      }
      break;
    }

    case "COMPLETE_OBJECTIVE": {
      objectiveSystem.complete(command.objectiveId);
      objectiveSystem.checkEvidenceGates();
      break;
    }

    case "UNLOCK_DOOR": {
      gameState.unlockDoor(command.doorId);
      eventBus.emit(GameEvents.DOOR_UNLOCKED, command.doorId);
      break;
    }

    case "SET_LOCKDOWN": {
      gameState.lockdown = command.value;
      if (command.value) {
        gameState.setAlert("full_lockdown");
        eventBus.emit(GameEvents.ALERT_CHANGED, "full_lockdown");
        eventBus.emit(GameEvents.LOCKDOWN_TRIGGERED);
      }
      break;
    }

    case "SET_ALERT": {
      gameState.setAlert(command.state);
      eventBus.emit(GameEvents.ALERT_CHANGED, command.state);
      break;
    }

    case "START_BROADCAST": {
      eventBus.emit(GameEvents.BROADCAST_UPLOAD);
      break;
    }

    case "COMPLETE_BROADCAST": {
      gameState.setEndingFlag("broadcastComplete", true);
      break;
    }

    case "SAVE_GAME": {
      const snap = command.game.getPlayerSnapshot();
      const data = buildSaveData(snap.sceneId, command.label, snap.position, [snap.pitch, snap.yaw, 0]);
      saveGame(command.slot, data);
      break;
    }

    case "OPEN_TERMINAL": {
      gameState.terminalOpen = true;
      eventBus.emit(GameEvents.TERMINAL_OPENED, command.terminalId);
      break;
    }

    case "CLOSE_TERMINAL": {
      gameState.terminalOpen = false;
      eventBus.emit(GameEvents.TERMINAL_CLOSED);
      break;
    }

    case "SYSTEM_MESSAGE": {
      eventBus.emit(GameEvents.SYSTEM_MESSAGE, command.message);
      break;
    }

    // LOAD_GAME and COMPLETE_BROADCAST are handled at call sites because they
    // require React state setters — they are listed here for type completeness
    // and logging, but the caller performs the actual work after dispatch.
    case "LOAD_GAME":
    case "COMPLETE_BROADCAST":
      break;
  }
}
