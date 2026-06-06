import { useEffect, useState } from "react";
import { gameState } from "../game/GameState";
import { eventBus } from "../utils/eventBus";
import { GameEvents } from "../game/GameEvents";
import type { DetectionState } from "../types/stealth";

type Props = {
  sceneNote?: string | null;
};

export const HUD: React.FC<Props> = ({ sceneNote }) => {
  const [objective, setObjective] = useState(gameState.allObjectives().find((o) => o.status === "active"));
  const [detection, setDetection] = useState(gameState.detectionValue);
  const [detectionState, setDetectionState] = useState<DetectionState>(gameState.detection);
  const [interact, setInteract] = useState<{ type: string; label: string } | null>(null);
  const [notification, setNotification] = useState<{ title: string; corroborates?: string } | null>(null);
  const [localSceneNote, setLocalSceneNote] = useState<string | null>(null);

  useEffect(() => {
    const onObj = () => setObjective(gameState.allObjectives().find((o) => o.status === "active"));
    const onDetection = () => {
      setDetection(gameState.detectionValue);
      setDetectionState(gameState.detection);
    };
    const onInteract = (t: unknown) => setInteract(t as { type: string; label: string } | null);
    const onEvidence = (data: unknown) => {
      const d = data as { type: string; label: string; meta?: { evidenceId: string } };
      if (d.meta?.evidenceId) {
        const ev = gameState.getEvidence(d.meta.evidenceId);
        if (ev) {
          setNotification({ title: ev.title, corroborates: ev.corroborates[0] ? gameState.getEvidence(ev.corroborates[0])?.title : undefined });
          setTimeout(() => setNotification(null), 5000);
        }
      }
    };

    const onEvidenceCollected = (id: unknown) => {
      const ev = gameState.getEvidence(id as string);
      if (ev) {
        setNotification({ title: ev.title, corroborates: ev.corroborates[0] ? gameState.getEvidence(ev.corroborates[0])?.title : undefined });
        setTimeout(() => setNotification(null), 5000);
      }
    };

    const unsubObj = eventBus.on(GameEvents.OBJECTIVE_UPDATED, onObj);
    const unsubDet = eventBus.on(GameEvents.DETECTION_CHANGED, onDetection);
    const unsubInt = eventBus.on(GameEvents.INTERACT_TARGET, onInteract);
    const unsubEv = eventBus.on(GameEvents.INTERACT_TRIGGER, onEvidence);
    const unsubEvCol = eventBus.on(GameEvents.EVIDENCE_COLLECTED, onEvidenceCollected);
    return () => {
      unsubObj();
      unsubDet();
      unsubInt();
      unsubEv();
      unsubEvCol();
    };
  }, []);

  useEffect(() => {
    if (sceneNote) {
      setLocalSceneNote(sceneNote);
      const t = setTimeout(() => setLocalSceneNote(null), 3000);
      return () => clearTimeout(t);
    }
  }, [sceneNote]);

  const detectionClass =
    detectionState === "hidden"
      ? "detection-hidden"
      : detectionState === "watched"
      ? "detection-watched"
      : detectionState === "suspicious"
      ? "detection-suspicious"
      : detectionState === "critical"
      ? "detection-critical"
      : "detection-detected";

  return (
    <div className="ui-overlay">
      {/* Crosshair */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 4,
          height: 4,
          marginLeft: -2,
          marginTop: -2,
          borderRadius: "50%",
          background: interact ? "rgba(59,130,246,0.8)" : "rgba(255,255,255,0.35)",
          transition: "background 0.15s ease",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      {objective && (
        <div className="ui-panel objective-hud">
          <div className="objective-title">{objective.title}</div>
          <div className="objective-desc">{objective.description}</div>
        </div>
      )}

      <div className="detection-meter">
        <div className={`detection-fill ${detectionClass}`} style={{ width: `${detection}%` }} />
      </div>

      {interact && (
        <div className="interact-prompt">
          <span className="interact-key">E</span>
          <span>{interact.label}</span>
        </div>
      )}

      {notification && (
        <div className="ui-panel evidence-notification">
          <div style={{ fontSize: "0.75rem", color: "#6b6b7b", marginBottom: 4 }}>Evidence acquired</div>
          <div style={{ fontWeight: 600 }}>{notification.title}</div>
          {notification.corroborates && (
            <div style={{ fontSize: "0.75rem", color: "#3b82f6", marginTop: 4 }}>Corroborates: {notification.corroborates}</div>
          )}
        </div>
      )}

      {localSceneNote && (
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(5,5,8,0.8)",
            border: "1px solid #1f1f28",
            borderRadius: 6,
            padding: "10px 20px",
            fontSize: "0.875rem",
            color: "#a0a0b0",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            animation: "fadeInOut 3s ease forwards",
            pointerEvents: "none",
          }}
        >
          {localSceneNote}
        </div>
      )}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(8px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
        }
      `}</style>
    </div>
  );
};
