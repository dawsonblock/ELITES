import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react";
import type { Game } from "./game/Game";
import { gameState } from "./game/GameState";
import { inputManager } from "./game/InputManager";
import { eventBus } from "./utils/eventBus";
import { GameEvents } from "./game/GameEvents";
import { evidenceSystem } from "./systems/EvidenceSystem";
import { objectiveSystem } from "./systems/ObjectiveSystem";
import { endingSystem } from "./systems/EndingSystem";
import { MainMenu } from "./ui/MainMenu";
import { HUD } from "./ui/HUD";
const EvidenceBoard = lazy(() => import("./ui/EvidenceBoard").then(m => ({ default: m.EvidenceBoard })));
const TerminalUI = lazy(() => import("./ui/TerminalUI").then(m => ({ default: m.TerminalUI })));
import { PauseMenu } from "./ui/PauseMenu";
import { LoadingScreen } from "./ui/LoadingScreen";
import { ScreenEffects } from "./ui/ScreenEffects";

const EndingScreen = lazy(() => import("./ui/EndingScreen").then(m => ({ default: m.EndingScreen })));
const DocumentViewer = lazy(() => import("./ui/DocumentViewer").then(m => ({ default: m.DocumentViewer })));
const SettingsPanel = lazy(() => import("./ui/SettingsPanel").then(m => ({ default: m.SettingsPanel })));
const MobileControls = lazy(() => import("./ui/MobileControls").then(m => ({ default: m.MobileControls })));
import { audioSystem } from "./systems/AudioSystem";
import type { EndingType } from "./types/ending";
import { buildSaveData, saveGame, loadSave, restoreSaveData } from "./game/SaveManager";
import "./styles/global.css";
import "./styles/ui.css";

type AppScreen = "menu" | "game" | "ending" | "credits";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [screen, setScreen] = useState<AppScreen>("menu");
  const [paused, setPaused] = useState(false);
  const [evidenceBoardOpen, setEvidenceBoardOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ending, setEnding] = useState<EndingType | null>(null);
  const [endingScore, setEndingScore] = useState(0);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [loadingScene, setLoadingScene] = useState<string | null>(null);
  const [sceneNote, setSceneNote] = useState<string | null>(null);
  const [viewingEvidence, setViewingEvidence] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(() => !!loadSave("AutoSave"));
  const [slotStates, setSlotStates] = useState<Record<string, boolean>>(() => ({
    AutoSave: !!loadSave("AutoSave"),
    ManualSave1: !!loadSave("ManualSave1"),
    ManualSave2: !!loadSave("ManualSave2"),
    ManualSave3: !!loadSave("ManualSave3"),
  }));
  const [autosaveToast, setAutosaveToast] = useState(false);

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
  }, []);

  const initGame = useCallback(async () => {
    if (gameRef.current || !canvasRef.current) return;

    evidenceSystem.init();
    objectiveSystem.init();

    const { Game } = await import("./game/Game");
    const game = new Game();
    game.setCallbacks(createGameCallbacks(game));
    game.init(canvasRef.current);

    gameRef.current = game;
  }, [createGameCallbacks]);

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
  }, [screen, paused, terminalOpen, evidenceBoardOpen]);

  useEffect(() => {
    const onInteract = (data: unknown) => {
      const d = data as { type: string; label: string; meta?: Record<string, unknown> };
      if (d.type === "evidence" && d.meta?.evidenceId) {
        evidenceSystem.collect(d.meta.evidenceId as string);
        objectiveSystem.checkEvidenceGates();
      } else if (d.type === "door" && d.meta?.doorId) {
        const doorId = d.meta.doorId as string;
        const needsKey = d.meta.needsKey as string | undefined;
        const needsCode = d.meta.needsCode as string | undefined;
        const locked = d.meta.locked as boolean;
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
          }
        }
      } else if (d.type === "terminal" && d.meta?.terminalId) {
        const tid = d.meta.terminalId as string;
        setActiveTerminalId(tid);
        setTerminalOpen(true);
        gameState.terminalOpen = true;
        inputManager.exitPointerLock();
      }
    };

    const unsub = eventBus.on(GameEvents.INTERACT_TRIGGER, onInteract);
    return () => unsub();
  }, []);

  useEffect(() => {
    const onDownloadComplete = () => {
      objectiveSystem.complete("obj_download_archive");
      objectiveSystem.checkEvidenceGates();
    };
    const unsub = eventBus.on(GameEvents.DOWNLOAD_COMPLETED, onDownloadComplete);
    return () => unsub();
  }, []);

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
        triggerBroadcast: () => eventBus.emit(GameEvents.BROADCAST_UPLOAD),
        isReady: () => !!gameRef.current,
        saveToSlot: (slot: string) => {
          if (gameRef.current) {
            const snap = gameRef.current.getPlayerSnapshot();
            const data = buildSaveData(snap.sceneId, "test", snap.position, [snap.pitch, snap.yaw, 0]);
            saveGame(slot, data);
          }
        },
        getState: () => ({
          sceneId: gameState.sceneId,
          evidence: gameState.collectedEvidence(),
          objectives: gameState.completedObjectives(),
          detection: gameState.detection,
          alert: gameState.alert,
          lockdown: gameState.lockdown,
        }),
      };
    }
    return () => {
      if (import.meta.env.DEV) {
        delete (window as any).__ETE_TEST__;
      }
    };
  }, []);

  useEffect(() => {
    const onBroadcast = () => {
      gameState.setEndingFlag("broadcastComplete", true);
      const score = endingSystem.calculateScore();
      const end = endingSystem.determineEnding(score);
      setEndingScore(score.total);
      setEnding(end);
      setScreen("ending");
      setPaused(false);
      gameState.paused = false;
      inputManager.exitPointerLock();
    };
    const unsub = eventBus.on(GameEvents.BROADCAST_UPLOAD, onBroadcast);
    return () => unsub();
  }, []);

  const startGame = () => {
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
    // Reset for fresh play in vertical slice
    setTimeout(async () => {
      await initGame();
      inputManager.requestPointerLock(canvasRef.current!);
    }, 0);
  };

  const resumeGame = () => {
    setPaused(false);
    gameState.paused = false;
    inputManager.requestPointerLock(canvasRef.current!);
  };

  const continueGame = () => {
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
      const { Game } = await import("./game/Game");
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
  };

  const quitToMenu = () => {
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
  };

  return (
    <div className="app-root">
      <div id="brightness-overlay" className="brightness-overlay" />
      <canvas
        ref={canvasRef}
        className={`game-canvas ${screen === "game" || screen === "ending" ? "visible" : ""}`}
      />

      {screen === "menu" && (
        <MainMenu
          onStart={startGame}
          onContinue={continueGame}
          onSettings={() => setSettingsOpen(true)}
          onCredits={() => setCreditsOpen(true)}
          hasSave={hasSave}
        />
      )}

      {screen === "game" && (
        <>
          {loadingScene && <LoadingScreen sceneName={loadingScene} />}
          <ScreenEffects />
          <HUD sceneNote={sceneNote} />
          <Suspense fallback={null}>
            <EvidenceBoard open={evidenceBoardOpen} onClose={() => { setEvidenceBoardOpen(false); gameState.evidenceBoardOpen = false; inputManager.requestPointerLock(canvasRef.current!); }} onViewEvidence={(id) => setViewingEvidence(id)} />
          </Suspense>
          <Suspense fallback={null}>
            {!!viewingEvidence && (
              <DocumentViewer
                evidence={viewingEvidence ? gameState.getEvidence(viewingEvidence) || null : null}
                open={!!viewingEvidence}
                onClose={() => setViewingEvidence(null)}
              />
            )}
          </Suspense>
          <Suspense fallback={null}>
            <TerminalUI open={terminalOpen} terminalId={activeTerminalId} onClose={() => { setTerminalOpen(false); gameState.terminalOpen = false; inputManager.requestPointerLock(canvasRef.current!); }} />
          </Suspense>
          <Suspense fallback={null}>
            <MobileControls />
          </Suspense>
          <PauseMenu
            open={paused}
            onResume={resumeGame}
            onSaveSlot={(slot) => {
              if (gameRef.current) {
                const snap = gameRef.current.getPlayerSnapshot();
                const data = buildSaveData(snap.sceneId, "manual", snap.position, [snap.pitch, snap.yaw, 0]);
                saveGame(slot, data);
                setSlotStates((prev) => ({ ...prev, [slot]: true }));
              }
            }}
            onLoadSlot={(slot) => {
              const data = loadSave(slot);
              if (data && gameRef.current) {
                evidenceSystem.init();
                objectiveSystem.init();
                restoreSaveData(data);
                gameRef.current.loadPlayerSnapshot({
                  sceneId: data.sceneId,
                  position: data.playerPosition,
                  yaw: data.playerRotation[1],
                  pitch: data.playerRotation[0],
                });
                setPaused(false);
                gameState.paused = false;
                inputManager.requestPointerLock(canvasRef.current!);
              }
            }}
            onDeleteSlot={(slot) => {
              localStorage.removeItem(`ete_save_v1_${slot}`);
              setSlotStates((prev) => ({ ...prev, [slot]: false }));
            }}
            onSettings={() => setSettingsOpen(true)}
            onQuit={quitToMenu}
            slotStates={slotStates}
          />
          {settingsOpen && (
            <Suspense fallback={null}>
              <SettingsPanel open onClose={() => { setSettingsOpen(false); if (screen === "game" && !paused) inputManager.requestPointerLock(canvasRef.current!); }} />
            </Suspense>
          )}
          {autosaveToast && (
            <div className="autosave-toast">
              Saved
            </div>
          )}
        </>
      )}

      {screen === "ending" && ending && (
        <Suspense fallback={null}>
          <EndingScreen
            ending={ending}
            score={endingScore}
            onRestart={startGame}
            onMenu={quitToMenu}
          />
        </Suspense>
      )}

      {creditsOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(5,5,8,0.95)",
            zIndex: 120,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <h2 style={{ marginBottom: 24 }}>Credits</h2>
          <p style={{ color: "#a0a0b0", maxWidth: 480, textAlign: "center", lineHeight: 1.6 }}>
            Escape the Elites: The Broadcast is a fictional investigative thriller.
            <br /><br />
            Design, Engineering, and Direction by the development team.
            <br /><br />
            Built with PlayCanvas, React, TypeScript, and Vite.
          </p>
          <button className="ui-button" style={{ marginTop: 32 }} onClick={() => setCreditsOpen(false)}>Close</button>
        </div>
      )}

      {settingsOpen && screen === "menu" && (
        <Suspense fallback={null}>
          <SettingsPanel open onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
