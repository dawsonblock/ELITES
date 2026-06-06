import { useCallback, useRef, useState, lazy, Suspense } from "react";
import type { Game } from "./game/Game";
import { gameState } from "./game/GameState";
import { inputManager } from "./game/InputManager";
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
const BroadcastSequence = lazy(() => import("./ui/BroadcastSequence").then(m => ({ default: m.BroadcastSequence })));
import type { EndingType } from "./types/ending";
import { buildSaveData, saveGame, loadSave, restoreSaveData } from "./game/SaveManager";
import { evidenceSystem } from "./systems/EvidenceSystem";
import { objectiveSystem } from "./systems/ObjectiveSystem";
import "./styles/global.css";
import "./styles/ui.css";

import { useGameLifecycle } from "./app/hooks/useGameLifecycle";
import { useGameEvents } from "./app/hooks/useGameEvents";
import { useDevTestHooks } from "./app/hooks/useDevTestHooks";
import { CreditsOverlay } from "./app/CreditsOverlay";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [screen, setScreen] = useState<"menu" | "game" | "ending" | "credits">("menu");
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
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const pendingBroadcastRef = useRef(false);

  const { startGame, continueGame, quitToMenu, resumeGame } = useGameLifecycle({
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
  });

  useGameEvents({
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
  });

  useDevTestHooks(gameRef);

  const completeBroadcast = useCallback(() => {
    gameState.setEndingFlag("broadcastComplete", true);
    const score = endingSystem.calculateScore();
    const end = endingSystem.determineEnding(score);
    setEndingScore(score.total);
    setEnding(end);
    setBroadcastOpen(false);
    setScreen("ending");
    setPaused(false);
    gameState.paused = false;
    inputManager.exitPointerLock();
  }, []);

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
          <Suspense fallback={null}>
            <BroadcastSequence
              open={broadcastOpen}
              onComplete={() => {
                pendingBroadcastRef.current = false;
                completeBroadcast();
              }}
            />
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

      {creditsOpen && <CreditsOverlay onClose={() => setCreditsOpen(false)} />}

      {settingsOpen && screen === "menu" && (
        <Suspense fallback={null}>
          <SettingsPanel open onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
