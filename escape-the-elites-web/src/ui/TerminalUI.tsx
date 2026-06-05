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

  const lineColor = (type: LineItem["type"]) => {
    switch (type) {
      case "error": return "#ef4444";
      case "success": return "#22c55e";
      case "warn": return "#f59e0b";
      default: return "#a0a0b0";
    }
  };

  const isLocked = term.locked && !unlocked;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(3,3,6,0.95)",
        zIndex: 70,
        display: "flex",
        flexDirection: "column",
        padding: 32,
        fontFamily: "'Courier New', monospace",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: isLocked ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
          {term.name} {isLocked && "[LOCKED]"}
        </div>
        <button className="ui-button secondary" onClick={() => { audioSystem.playClick("ui"); onClose(); }}>Disconnect</button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: "rgba(0,0,0,0.5)",
          border: "1px solid #1f1f28",
          borderRadius: 6,
          padding: 16,
          fontSize: "0.875rem",
          lineHeight: 1.6,
        }}
      >
        {lines.map((line, i) => (
          <div key={i} style={{ color: lineColor(line.type) }}>{line.text}</div>
        ))}
        {downloading && (
          <div style={{ marginTop: 8 }}>
            <div style={{ width: "100%", height: 8, background: "#1f1f28", borderRadius: 4 }}>
              <div style={{ width: `${downloadProgress}%`, height: "100%", background: "#ef4444", borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6b6b7b", marginTop: 4 }}>Downloading archive... {downloadProgress}%</div>
          </div>
        )}
        {booting && (
          <div style={{ color: "#6b6b7b", fontSize: "0.8rem", marginTop: 4 }}>_</div>
        )}
      </div>

      {isLocked && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
          <span style={{ color: "#a0a0b0", fontSize: "0.8rem" }}>Access Code:</span>
          <input
            type="text"
            value={unlockInput}
            onChange={(e) => setUnlockInput(e.target.value)}
            placeholder="ENTER CODE"
            style={{
              background: "rgba(0,0,0,0.5)",
              border: "1px solid #1f1f28",
              borderRadius: 4,
              padding: "6px 10px",
              color: "#e8e8ec",
              fontFamily: "inherit",
              fontSize: "0.875rem",
              flex: 1,
            }}
            autoFocus
          />
          <button className="ui-button" style={{ fontSize: "0.8rem", padding: "8px 14px" }} onClick={tryUnlock}>Unlock</button>
        </div>
      )}

      {!isLocked && (
        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          {term.commands.map((cmd, i) => {
            const canRun = canRunCommand(cmd);
            return (
              <button
                key={cmd.id}
                className="ui-button"
                style={{
                  fontSize: "0.8rem",
                  padding: "8px 14px",
                  outline: i === activeCmd ? "2px solid #3b82f6" : "none",
                  opacity: downloading || !canRun ? 0.4 : 1,
                  cursor: canRun ? "pointer" : "not-allowed",
                }}
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
