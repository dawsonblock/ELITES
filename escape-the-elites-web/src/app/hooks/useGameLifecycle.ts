import { useCallback } from "react";
import type { RefObject, MutableRefObject, Dispatch, SetStateAction } from "react";
import type { Game } from "../../game/Game";
import { gameState } from "../../game/GameState";
import { inputManager } from "../../game/InputManager";
import { eventBus } from "../../utils/eventBus";
import { GameEvents } from "../../game/GameEvents";
import { evidenceSystem } from "../../systems/EvidenceSystem";
import { objectiveSystem } from "../../systems/ObjectiveSystem";
import { audioSystem } from "../../systems/AudioSystem";
import { buildSaveData, saveGame, loadSave, restoreSaveData } from "../../game/SaveManager";
import type { AppScreen } from "../AppScreen";

type UseGameLifecycleDeps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  gameRef: MutableRefObject<Game | null>;
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;
  setLoadingScene: (s: string | null) => void;
  setHasSave: (v: boolean) => void;
  setSlotStates: Dispatch<SetStateAction<Record<string, boolean>>>;
  setAutosaveToast: (v: boolean) => void;
  setSceneNote: (s: string | null) => void;
  setPaused: (v: boolean) => void;
  setEvidenceBoardOpen: (v: boolean) => void;
  setTerminalOpen: (v: boolean) => void;
  setEnding: (v: null) => void;
  setBroadcastOpen: (v: boolean) => void;
  pendingBroadcastRef: MutableRefObject<boolean>;
};

type UseGameLifecycleReturn = {
  initGame: () => Promise<void>;
  startGame: () => void;
  continueGame: () => void;
  quitToMenu: () => void;
  resumeGame: () => void;
  createGameCallbacks: (gameInstance?: Game) => {
    onReady: () => void;
    onSceneChange: (sceneId: string) => void;
    onInteractTarget: (target: { type: string; label: string } | null) => void;
    onSceneEnter: (_sceneId: string, sceneName: string) => void;
  };
};

export function useGameLifecycle(deps: UseGameLifecycleDeps): UseGameLifecycleReturn {
  const {
    canvasRef,
    gameRef,
    screen,
    setScreen,
    setLoadingScene,
    setHasSave,
    setSlotStates,
    setAutosaveToast,
    setSceneNote,
    setPaused,
    setEvidenceBoardOpen,
    setTerminalOpen,
    setEnding,
    setBroadcastOpen,
    pendingBroadcastRef,
  } = deps;

  const createGameCallbacks = useCallback((gameInstance?: Game) => {
    return {
      onReady: () => {
        inputManager.requestPointerLock(canvasRef.current!);
      },
      onSceneChange: (sceneId: string) => {
        gameState.sceneId = sceneId;
        setLoadingScene(sceneId);
        setTimeout(() => setLoadingScene(null), 800);
        if (gameInstance) {
          const snap = gameInstance.getPlayerSnapshot();
          const saveData = buildSaveData(snap.sceneId, "checkpoint", snap.position, [snap.pitch, snap.yaw, 0]);
          saveGame("AutoSave", saveData);
          setHasSave(true);
          setSlotStates((prev) => ({ ...prev, AutoSave: true }));
        }
        setAutosaveToast(true);
        setTimeout(() => setAutosaveToast(false), 1500);
      },
      onInteractTarget: (target: { type: string; label: string } | null) => {
        eventBus.emit(GameEvents.INTERACT_TARGET, target);
      },
      onSceneEnter: (_sceneId: string, sceneName: string) => {
        setSceneNote(sceneName);
      },
    };
  }, [canvasRef, setLoadingScene, setHasSave, setSlotStates, setAutosaveToast, setSceneNote]);

  const initGame = useCallback(async () => {
    if (gameRef.current || !canvasRef.current) return;

    evidenceSystem.init();
    objectiveSystem.init();

    const { Game } = await import("../../game/Game");
    const game = new Game();
    game.setCallbacks(createGameCallbacks(game));
    game.init(canvasRef.current);

    gameRef.current = game;
  }, [canvasRef, gameRef, createGameCallbacks]);

  const startGame = useCallback(() => {
    setScreen("game");
    setPaused(false);
    setEvidenceBoardOpen(false);
    setTerminalOpen(false);
    setBroadcastOpen(false);
    pendingBroadcastRef.current = false;
    setEnding(null);
    gameState.resetProgress();
    gameState.paused = false;
    gameState.evidenceBoardOpen = false;
    gameState.terminalOpen = false;
    gameState.lockdown = false;
    audioSystem.init();
    audioSystem.resume();
    if (gameRef.current) {
      gameRef.current.dispose();
      gameRef.current = null;
    }
    // Reset for fresh play in vertical slice
    setTimeout(async () => {
      await initGame();
      inputManager.requestPointerLock(canvasRef.current!);
    }, 0);
  }, [setScreen, setPaused, setEvidenceBoardOpen, setTerminalOpen, setBroadcastOpen, pendingBroadcastRef, setEnding, gameRef, initGame, canvasRef]);

  const resumeGame = useCallback(() => {
    setPaused(false);
    gameState.paused = false;
    inputManager.requestPointerLock(canvasRef.current!);
  }, [setPaused, canvasRef]);

  const continueGame = useCallback(() => {
    const data = loadSave("AutoSave");
    if (!data) return;
    setScreen("game");
    setPaused(false);
    setEvidenceBoardOpen(false);
    setTerminalOpen(false);
    setEnding(null);
    gameState.resetProgress();
    gameState.paused = false;
    gameState.evidenceBoardOpen = false;
    gameState.terminalOpen = false;
    gameState.lockdown = false;
    audioSystem.init();
    audioSystem.resume();
    if (gameRef.current) {
      gameRef.current.dispose();
      gameRef.current = null;
    }
    setTimeout(async () => {
      if (!canvasRef.current) return;
      evidenceSystem.init();
      objectiveSystem.init();
      restoreSaveData(data);
      const { Game } = await import("../../game/Game");
      const game = new Game();
      game.setCallbacks(createGameCallbacks(game));
      game.init(canvasRef.current);
      gameRef.current = game;
      game.loadPlayerSnapshot({
        sceneId: data.sceneId,
        position: data.playerPosition,
        yaw: data.playerRotation[1],
        pitch: data.playerRotation[0],
      });
    }, 0);
  }, [setScreen, setPaused, setEvidenceBoardOpen, setTerminalOpen, setEnding, gameRef, canvasRef, createGameCallbacks]);

  const quitToMenu = useCallback(() => {
    // Auto-save before quitting
    if (gameRef.current && screen === "game") {
      const snap = gameRef.current.getPlayerSnapshot();
      const data = buildSaveData(snap.sceneId, "quit", snap.position, [snap.pitch, snap.yaw, 0]);
      saveGame("AutoSave", data);
      setHasSave(true);
    }
    setScreen("menu");
    setPaused(false);
    gameState.paused = false;
    gameRef.current?.dispose();
    gameRef.current = null;
  }, [gameRef, screen, setHasSave, setScreen, setPaused]);

  return {
    initGame,
    startGame,
    continueGame,
    quitToMenu,
    resumeGame,
    createGameCallbacks,
  };
}
