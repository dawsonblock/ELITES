import { useEffect, useState, useCallback, useRef } from "react";
import { gameState } from "../game/GameState";
import { eventBus } from "../utils/eventBus";
import { GameEvents } from "../game/GameEvents";
import { audioSystem } from "../systems/AudioSystem";
import { evidenceSystem } from "../systems/EvidenceSystem";
import { objectiveSystem } from "../systems/ObjectiveSystem";
import type { TerminalDefinition, TerminalCommand } from "../types/terminal";
import terminalsJson from "../data/terminals.json";

type Props = {
  open: boolean;
  terminalId: string | null;
  onClose: () => void;
};

type LineItem = { text: string; type: "system" | "error" | "success" | "warn" };

export const TerminalUI: React.FC<Props> = ({ open, terminalId, onClose }) => {
  const [lines, setLines] = useState<LineItem[]>([]);
  const [term, setTerm] = useState<TerminalDefinition | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [booting, setBooting] = useState(false);
  const [activeCmd, setActiveCmd] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockInput, setUnlockInput] = useState("");
  const downloadEvidenceIdRef = useRef<string | null>(null);
  const downloadCompletedRef = useRef(false);
  const activeCmdRef = useRef(activeCmd);
  activeCmdRef.current = activeCmd;

  useEffect(() => {
    if (!open || !terminalId) return;
    const def = (terminalsJson as TerminalDefinition[]).find((t) => t.id === terminalId);
    setTerm(def || null);
    setBooting(true);
    setActiveCmd(0);
    setLines([]);
    setDownloading(false);
    setDownloadProgress(0);
    setUnlockInput("");
    downloadEvidenceIdRef.current = null;

    // Check if this terminal was previously unlocked (persisted in gameState)
    const wasUnlocked = def ? !def.locked || gameState.isTerminalUnlocked(def.id) : false;
    setUnlocked(wasUnlocked);

    audioSystem.resume();
    audioSystem.playTerminalBoot();

    const bootLines: LineItem[] = [
      { text: "BIOS v2.14.6  [OK]", type: "system" },
      { text: "Memory Test     [OK]", type: "system" },
      { text: `Network: ${def?.name || "UNKNOWN"}`, type: "system" },
      { text: `STATUS: ${def?.locked && !wasUnlocked ? "RESTRICTED" : "ONLINE"}`, type: def?.locked && !wasUnlocked ? "warn" : "success" },
      { text: "", type: "system" },
      { text: "> AWAITING INPUT...", type: "system" },
      { text: "", type: "system" },
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < bootLines.length) {
        setLines((prev) => [...prev, bootLines[i]]);
        audioSystem.playTerminalType();
        i++;
      } else {
        clearInterval(interval);
        setBooting(false);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [open, terminalId]);

  useEffect(() => {
    if (!downloading) return;
    downloadCompletedRef.current = false;
    const interval = setInterval(() => {
      setDownloadProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        if (Math.random() > 0.7) audioSystem.playTerminalType();
        return p + 2;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [downloading]);

  useEffect(() => {
    if (!downloading || downloadProgress < 100 || downloadCompletedRef.current) return;
    downloadCompletedRef.current = true;
    setDownloading(false);
    addLine("> DOWNLOAD COMPLETE", "success");
    addLine("> LOCKDOWN SEQUENCE INITIATED", "error");
    addLine("", "system");
    const eid = downloadEvidenceIdRef.current;
    if (eid) {
      evidenceSystem.collect(eid);
      objectiveSystem.checkEvidenceGates();
      downloadEvidenceIdRef.current = null;
    }
    eventBus.emit(GameEvents.DOWNLOAD_COMPLETED);
    eventBus.emit(GameEvents.LOCKDOWN_TRIGGERED);
    gameState.lockdown = true;
    gameState.setAlert("full_lockdown");
  }, [downloading, downloadProgress]);

  const addLine = useCallback((text: string, type: LineItem["type"] = "system") => {
    setLines((prev) => [...prev, { text, type }]);
  }, []);

  const tryUnlock = () => {
    if (!term) return;
    const code = term.unlockCode;
    if (code && unlockInput.trim().toLowerCase() === code.toLowerCase()) {
      setUnlocked(true);
      gameState.unlockTerminal(term.id);
      addLine("> ACCESS GRANTED", "success");
      audioSystem.playTone(880, 0.2, "sine", "ui", 0.2);
      return;
    }
    // Check if any command has requiresEvidence that we have
    const hasKeyEvidence = term.commands.some((cmd) => {
      const req = cmd.requiresEvidence || [];
      return req.length > 0 && req.every((id) => gameState.hasEvidence(id));
    });
    if (hasKeyEvidence) {
      setUnlocked(true);
      gameState.unlockTerminal(term.id);
      addLine("> ACCESS GRANTED", "success");
      audioSystem.playTone(880, 0.2, "sine", "ui", 0.2);
      return;
    }
    addLine("> ACCESS DENIED", "error");
    audioSystem.playTone(200, 0.3, "square", "ui", 0.15);
  };

  const canRunCommand = (cmd: TerminalCommand): boolean => {
    const req = cmd.requiresEvidence || [];
    if (req.length > 0 && !req.every((id) => gameState.hasEvidence(id))) return false;
    return true;
  };

  const runCommand = (cmd: TerminalCommand) => {
    if (!canRunCommand(cmd)) {
      audioSystem.playTone(200, 0.2, "square", "ui", 0.1);
      addLine("> ACCESS DENIED: MISSING REQUIRED CREDENTIALS", "error");
      addLine("", "system");
      return;
    }
    audioSystem.playClick("ui");
    addLine(`> ${cmd.label}`, "system");

    if (cmd.action === "collect_evidence") {
      const id = (cmd.params as any)?.evidenceId as string;
      if (id) {
        evidenceSystem.collect(id);
        objectiveSystem.checkEvidenceGates();
        addLine(`> FILE EXTRACTED: ${gameState.getEvidence(id)?.title || id}`, "success");
        addLine("", "system");
      }
    } else if (cmd.action === "unlock_door") {
      const doorId = (cmd.params as any)?.doorId as string;
      if (doorId) {
        gameState.unlockDoor(doorId);
        eventBus.emit(GameEvents.DOOR_UNLOCKED, doorId);
        addLine(`> DOOR UNLOCKED: ${doorId}`, "success");
        addLine("", "system");
      }
    } else if (cmd.action === "disable_camera") {
      const camId = (cmd.params as any)?.cameraId as string;
      if (camId) {
        gameState.disableCamera(camId);
        eventBus.emit(GameEvents.CAMERA_DISABLED, camId);
        addLine(`> CAMERA DISABLED: ${camId}`, "success");
        addLine("", "system");
      }
    } else if (cmd.action === "start_download") {
      downloadEvidenceIdRef.current = ((cmd.params as any)?.evidenceId as string) || null;
      setDownloading(true);
      addLine("> INITIATING ENCRYPTED DOWNLOAD...", "warn");
      addLine("> ETA: 30 SECONDS", "system");
      addLine("", "system");
      eventBus.emit(GameEvents.DOWNLOAD_STARTED);
    } else if (cmd.action === "route_signal") {
      addLine("> SIGNAL ROUTED TO EXTERNAL RELAY", "success");
      addLine("", "system");
    } else if (cmd.action === "upload_broadcast") {
      const req = ((cmd.params as any)?.requiresEvidence as string[]) || [];
      const hasAll = req.every((id) => gameState.hasEvidence(id));
      if (hasAll) {
        addLine("> UPLINK ESTABLISHED", "success");
        addLine("> UPLOADING EVIDENCE ARCHIVE...", "warn");
        addLine("> COMPLETE", "success");
        addLine("", "system");
        audioSystem.playBroadcastUpload();
        eventBus.emit(GameEvents.BROADCAST_UPLOAD);
      } else {
        addLine("> ERROR: MISSING REQUIRED FILES", "error");
        addLine("", "system");
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open || !term || booting || downloading) return;
    const onKey = (e: KeyboardEvent) => {
      if (!unlocked) {
        if (e.key === "Enter") {
          e.preventDefault();
          tryUnlock();
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveCmd((i) => (i + 1) % term.commands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveCmd((i) => (i - 1 + term.commands.length) % term.commands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        runCommand(term.commands[activeCmdRef.current]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, term, booting, downloading, unlocked, unlockInput]);

  if (!open || !term) return null;

  const isLocked = term.locked && !unlocked;

  return (
    <div className="terminal-overlay">
      <div className="terminal-header">
        <div className={`terminal-status ${isLocked ? "terminal-status-locked" : "terminal-status-unlocked"}`}>
          {term.name} {isLocked && "[LOCKED]"}
        </div>
        <button className="ui-button secondary" onClick={() => { audioSystem.playClick("ui"); onClose(); }}>Disconnect</button>
      </div>

      <div className="terminal-content">
        {lines.map((line, i) => (
          <div key={i} className={`terminal-line terminal-line-${line.type}`}>{line.text}</div>
        ))}
        {downloading && (
          <div className="terminal-download">
            <div className="terminal-progress-track">
              <div className="terminal-progress-fill" style={{ width: `${downloadProgress}%` }} />
            </div>
            <div className="terminal-progress-text">Downloading archive... {downloadProgress}%</div>
          </div>
        )}
        {booting && (
          <div className="terminal-cursor">_</div>
        )}
      </div>

      {isLocked && (
        <div className="terminal-unlock-row">
          <span className="terminal-unlock-label">Access Code:</span>
          <input
            type="text"
            value={unlockInput}
            onChange={(e) => setUnlockInput(e.target.value)}
            placeholder="ENTER CODE"
            className="terminal-unlock-input"
            autoFocus
          />
          <button className="ui-button terminal-command-btn" onClick={tryUnlock}>Unlock</button>
        </div>
      )}

      {!isLocked && (
        <div className="terminal-commands">
          {term.commands.map((cmd, i) => {
            const canRun = canRunCommand(cmd);
            return (
              <button
                key={cmd.id}
                className={`ui-button terminal-command-btn ${i === activeCmd ? "active" : ""} ${downloading || !canRun ? "disabled" : ""}`}
                onClick={() => canRun && runCommand(cmd)}
                disabled={downloading || !canRun}
                onMouseEnter={() => setActiveCmd(i)}
                title={!canRun ? "Missing required credentials" : undefined}
              >
                {cmd.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
