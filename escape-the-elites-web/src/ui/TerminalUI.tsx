import { useEffect, useState, useCallback } from "react";
import { gameState } from "../game/GameState";
import { eventBus } from "../utils/eventBus";
import { GameEvents } from "../game/GameEvents";
import { audioSystem } from "../systems/AudioSystem";
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

  useEffect(() => {
    if (!open || !terminalId) return;
    const def = (terminalsJson as TerminalDefinition[]).find((t) => t.id === terminalId);
    setTerm(def || null);
    setBooting(true);
    setActiveCmd(0);
    setLines([]);
    setDownloading(false);
    setDownloadProgress(0);

    audioSystem.resume();
    audioSystem.playTerminalBoot();

    // Boot sequence
    const bootLines: LineItem[] = [
      { text: "BIOS v2.14.6  [OK]", type: "system" },
      { text: "Memory Test     [OK]", type: "system" },
      { text: `Network: ${def?.name || "UNKNOWN"}`, type: "system" },
      { text: `STATUS: ${def?.locked ? "RESTRICTED" : "ONLINE"}`, type: def?.locked ? "warn" : "success" },
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
    const interval = setInterval(() => {
      setDownloadProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setDownloading(false);
          addLine("> DOWNLOAD COMPLETE", "success");
          addLine("> LOCKDOWN SEQUENCE INITIATED", "error");
          addLine("", "system");
          eventBus.emit(GameEvents.DOWNLOAD_COMPLETED);
          eventBus.emit(GameEvents.LOCKDOWN_TRIGGERED);
          gameState.lockdown = true;
          gameState.setAlert("full_lockdown");
          return 100;
        }
        if (Math.random() > 0.7) audioSystem.playTerminalType();
        return p + 2;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [downloading]);

  const addLine = useCallback((text: string, type: LineItem["type"] = "system") => {
    setLines((prev) => [...prev, { text, type }]);
  }, []);

  const runCommand = (cmd: TerminalCommand) => {
    audioSystem.playClick("ui");
    addLine(`> ${cmd.label}`, "system");

    if (cmd.action === "collect_evidence") {
      const id = (cmd.params as any)?.evidenceId as string;
      if (id) {
        gameState.collectEvidence(id);
        eventBus.emit(GameEvents.EVIDENCE_COLLECTED, id);
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

  // Keyboard navigation for commands
  useEffect(() => {
    if (!open || !term || booting || downloading) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveCmd((i) => (i + 1) % term.commands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveCmd((i) => (i - 1 + term.commands.length) % term.commands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        runCommand(term.commands[activeCmd]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, term, booting, downloading, activeCmd]);

  if (!open || !term) return null;

  const lineColor = (type: LineItem["type"]) => {
    switch (type) {
      case "error": return "#ef4444";
      case "success": return "#22c55e";
      case "warn": return "#f59e0b";
      default: return "#a0a0b0";
    }
  };

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
        <div style={{ color: term.locked ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
          {term.name} {term.locked && "[LOCKED]"}
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

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        {term.commands.map((cmd, i) => (
          <button
            key={cmd.id}
            className="ui-button"
            style={{
              fontSize: "0.8rem",
              padding: "8px 14px",
              outline: i === activeCmd ? "2px solid #3b82f6" : "none",
              opacity: downloading ? 0.5 : 1,
            }}
            onClick={() => runCommand(cmd)}
            disabled={downloading}
            onMouseEnter={() => setActiveCmd(i)}
          >
            {cmd.label}
          </button>
        ))}
      </div>
    </div>
  );
};
