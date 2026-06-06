import { useEffect } from "react";
import type { RefObject, MutableRefObject } from "react";
import type { Game } from "../../game/Game";
import type * as pc from "playcanvas";
import { gameState } from "../../game/GameState";
import { inputManager } from "../../game/InputManager";
import { eventBus } from "../../utils/eventBus";
import { GameEvents } from "../../game/GameEvents";
import { evidenceSystem } from "../../systems/EvidenceSystem";
import { objectiveSystem } from "../../systems/ObjectiveSystem";
import type { AppScreen } from "../AppScreen";

type UseGameEventsDeps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  gameRef: MutableRefObject<Game | null>;
  screen: AppScreen;
  paused: boolean;
  terminalOpen: boolean;
  evidenceBoardOpen: boolean;
  setTerminalOpen: (v: boolean) => void;
  setActiveTerminalId: (v: string | null) => void;
  setEvidenceBoardOpen: (v: boolean) => void;
  setPaused: (v: boolean) => void;
  setBroadcastOpen: (v: boolean) => void;
  pendingBroadcastRef: MutableRefObject<boolean>;
};

export function useGameEvents(deps: UseGameEventsDeps): void {
  const {
    canvasRef,
    gameRef,
    screen,
    paused,
    terminalOpen,
    evidenceBoardOpen,
    setTerminalOpen,
    setActiveTerminalId,
    setEvidenceBoardOpen,
    setPaused,
    setBroadcastOpen,
    pendingBroadcastRef,
  } = deps;

  // Keyboard: Escape (pause/close panels), Tab (evidence board), E (interact)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (terminalOpen) {
          setTerminalOpen(false);
          gameState.terminalOpen = false;
          inputManager.requestPointerLock(canvasRef.current!);
          return;
        }
        if (evidenceBoardOpen) {
          setEvidenceBoardOpen(false);
          gameState.evidenceBoardOpen = false;
          inputManager.requestPointerLock(canvasRef.current!);
          return;
        }
        if (screen === "game") {
          const nextPaused = !paused;
          setPaused(nextPaused);
          gameState.paused = nextPaused;
          if (nextPaused) {
            inputManager.exitPointerLock();
          } else {
            inputManager.requestPointerLock(canvasRef.current!);
          }
        }
      }
      if (e.code === "Tab") {
        e.preventDefault();
        if (screen === "game" && !paused && !terminalOpen) {
          const next = !evidenceBoardOpen;
          setEvidenceBoardOpen(next);
          gameState.evidenceBoardOpen = next;
          if (next) {
            inputManager.exitPointerLock();
          } else {
            inputManager.requestPointerLock(canvasRef.current!);
          }
        }
      }
      if (e.code === "KeyE") {
        if (screen === "game" && !paused && !terminalOpen && !evidenceBoardOpen) {
          gameRef.current?.interact();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screen, paused, terminalOpen, evidenceBoardOpen, canvasRef, gameRef, setTerminalOpen, setEvidenceBoardOpen, setPaused]);

  // Interact trigger: handle evidence, door, terminal, and note interactions
  useEffect(() => {
    const onInteract = (data: unknown) => {
      const d = data as { type: string; label: string; meta?: Record<string, unknown>; entity?: pc.Entity };
      if (d.type === "evidence" && d.meta?.evidenceId) {
        const collected = evidenceSystem.collect(d.meta.evidenceId as string);
        if (collected) {
          objectiveSystem.checkEvidenceGates();
          if (d.entity) {
            gameRef.current?.removeInteractable(d.entity);
          }
        }
      } else if (d.type === "door" && d.meta?.doorId) {
        const doorId = d.meta.doorId as string;
        const needsKey = d.meta.needsKey as string | undefined;
        const needsCode = d.meta.needsCode as string | undefined;
        const locked = d.meta.locked as boolean;
        const lockedMessage = d.meta.lockedMessage as string | undefined;
        if (gameState.isDoorUnlocked(doorId) || !locked) {
          gameState.unlockDoor(doorId);
          eventBus.emit(GameEvents.DOOR_UNLOCKED, doorId);
        } else if (needsKey && gameState.hasEvidence(needsKey)) {
          gameState.unlockDoor(doorId);
          eventBus.emit(GameEvents.DOOR_UNLOCKED, doorId);
        } else if (needsCode) {
          // For simplicity in vertical slice, auto-unlock if player has access log
          if (gameState.hasEvidence("access_log_001")) {
            gameState.unlockDoor(doorId);
            eventBus.emit(GameEvents.DOOR_UNLOCKED, doorId);
          } else {
            eventBus.emit(GameEvents.SYSTEM_MESSAGE, lockedMessage ?? "Requires Bunker Access Code");
          }
        } else {
          eventBus.emit(GameEvents.SYSTEM_MESSAGE, lockedMessage ?? "Locked");
        }
      } else if (d.type === "terminal" && d.meta?.terminalId) {
        const tid = d.meta.terminalId as string;
        setActiveTerminalId(tid);
        setTerminalOpen(true);
        gameState.terminalOpen = true;
        inputManager.exitPointerLock();
      } else if (d.type === "note" && d.meta?.note) {
        eventBus.emit(GameEvents.SYSTEM_MESSAGE, d.meta.note as string);
      }
    };

    const unsub = eventBus.on(GameEvents.INTERACT_TRIGGER, onInteract);
    return () => unsub();
  }, [gameRef, setActiveTerminalId, setTerminalOpen]);

  // Download complete: mark objective done
  useEffect(() => {
    const onDownloadComplete = () => {
      objectiveSystem.complete("obj_download_archive");
      objectiveSystem.checkEvidenceGates();
    };
    const unsub = eventBus.on(GameEvents.DOWNLOAD_COMPLETED, onDownloadComplete);
    return () => unsub();
  }, []);

  // Broadcast upload event: freeze input and open broadcast sequence
  useEffect(() => {
    const onBroadcast = () => {
      if (pendingBroadcastRef.current) return;
      pendingBroadcastRef.current = true;
      setBroadcastOpen(true);
      // Freeze game input during broadcast sequence
      gameState.terminalOpen = true;
      inputManager.exitPointerLock();
    };
    const unsub = eventBus.on(GameEvents.BROADCAST_UPLOAD, onBroadcast);
    return () => unsub();
  }, [pendingBroadcastRef, setBroadcastOpen]);
}
