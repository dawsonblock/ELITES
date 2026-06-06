import { useEffect, useMemo, useState } from "react";
import { gameState } from "../game/GameState";
import type { EvidenceItem } from "../types/evidence";

type Stage = "checklist" | "uploading" | "done";

type Props = {
  open: boolean;
  onComplete: () => void;
};

const UPLOAD_LOG_LINES = [
  "Establishing encrypted uplink...",
  "Routing via relay node 7...",
  "Authentication token accepted.",
  "Staging evidence archive...",
  "Uploading segment 1/4: Transport manifests",
  "Uploading segment 2/4: Security feed archive",
  "Uploading segment 3/4: Guest arrival records",
  "Uploading segment 4/4: Financial ledger fragment",
  "Verifying checksum integrity...",
  "Archive integrity confirmed.",
  "Broadcasting to journalists — 14 recipients.",
  "Signal bounced through 3 jurisdictions.",
  "Upload complete. Signal cannot be recalled.",
  "Connection terminated.",
];

export const BroadcastSequence: React.FC<Props> = ({ open, onComplete }) => {
  const [stage, setStage] = useState<Stage>("checklist");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLog, setUploadLog] = useState<string[]>([]);
  const [, setLogIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setStage("checklist");
      setUploadProgress(0);
      setUploadLog([]);
      setLogIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (stage !== "uploading") return;

    const progressInterval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return Math.min(p + 100 / UPLOAD_LOG_LINES.length, 100);
      });
    }, 500);

    let stageTimeout: ReturnType<typeof setTimeout>;
    let completeTimeout: ReturnType<typeof setTimeout>;

    const logInterval = setInterval(() => {
      setLogIndex((i) => {
        const next = i + 1;
        setUploadLog((prev) => [...prev, UPLOAD_LOG_LINES[i] ?? ""]);
        if (next >= UPLOAD_LOG_LINES.length) {
          clearInterval(logInterval);
          stageTimeout = setTimeout(() => {
            setStage("done");
            completeTimeout = setTimeout(onComplete, 1800);
          }, 1000);
        }
        return next;
      });
    }, 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
      clearTimeout(stageTimeout);
      clearTimeout(completeTimeout);
    };
  }, [stage, onComplete]);

  if (!open) return null;

  const checkItems = useMemo(() => {
    const allEvidence = gameState.allEvidence();
    return allEvidence
      .filter((e: EvidenceItem) => e.requiredForBestEnding || e.importance >= 3)
      .map((e: EvidenceItem) => ({
        id: e.id,
        label: e.title,
        required: e.requiredForBestEnding,
        has: gameState.hasEvidence(e.id),
      }));
  }, []);

  const hasMinimum = checkItems.some((c) => c.has);
  const hasRequired = checkItems.filter((c) => c.required).every((c) => c.has);
  const readyLabel = hasRequired ? "Broadcast — Full Evidence" : hasMinimum ? "Broadcast — Partial Evidence" : "Broadcast — Minimal Evidence";
  const readyClass = hasRequired ? "broadcast-ready-full" : hasMinimum ? "broadcast-ready-partial" : "broadcast-ready-minimal";

  if (stage === "done") {
    return (
      <div className="broadcast-overlay">
        <div className="broadcast-done">
          <div className="broadcast-done-marker">BROADCAST SENT</div>
          <p className="broadcast-done-note">The signal cannot be recalled.</p>
        </div>
      </div>
    );
  }

  if (stage === "uploading") {
    return (
      <div className="broadcast-overlay">
        <div className="broadcast-upload-panel">
          <div className="broadcast-upload-header">
            <span className="broadcast-upload-title">UPLINK ACTIVE</span>
            <span className="broadcast-upload-pct">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="broadcast-progress-track">
            {/* CSS variable injection — width driven by .broadcast-progress-fill in ui.css */}
            <div
              className="broadcast-progress-fill"
              style={{ "--broadcast-progress": `${uploadProgress}%` } as React.CSSProperties}
            />
          </div>
          <div className="broadcast-log">
            {uploadLog.map((line, i) => (
              <div key={i} className={`broadcast-log-line ${i === uploadLog.length - 1 ? "broadcast-log-line-active" : ""}`}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="broadcast-overlay">
      <div className="broadcast-checklist-panel">
        <div className="broadcast-checklist-header">
          <h2 className="broadcast-checklist-title">Evidence Summary</h2>
          <p className="broadcast-checklist-subtitle">
            Review your evidence before broadcasting. This cannot be undone.
          </p>
        </div>

        <div className="broadcast-checklist">
          {checkItems.map((item) => (
            <div key={item.id} className={`broadcast-item ${item.has ? "broadcast-item-have" : "broadcast-item-missing"}`}>
              <span className="broadcast-item-icon">{item.has ? "✓" : "✗"}</span>
              <span className="broadcast-item-label">{item.label}</span>
              {item.required && <span className="broadcast-item-badge">Required</span>}
            </div>
          ))}
        </div>

        <div className={`broadcast-readiness ${readyClass}`}>
          {readyLabel}
        </div>

        <div className="broadcast-checklist-actions">
          <button
            className="ui-button broadcast-confirm-btn"
            onClick={() => setStage("uploading")}
            disabled={!hasMinimum}
          >
            Initiate Broadcast
          </button>
          <button
            className="ui-button secondary"
            onClick={onComplete}
          >
            Abort
          </button>
        </div>
      </div>
    </div>
  );
};
