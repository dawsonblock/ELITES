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
      {/* Crosshair — background is dynamic based on interact state */}
      <div
        className="crosshair"
        style={{ background: interact ? "rgba(59,130,246,0.8)" : "rgba(255,255,255,0.35)" }}
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
          <div className="evidence-notification-label">Evidence acquired</div>
          <div className="evidence-notification-title">{notification.title}</div>
          {notification.corroborates && (
            <div className="evidence-notification-corroborates">Corroborates: {notification.corroborates}</div>
          )}
        </div>
      )}

      {localSceneNote && (
        <div className="scene-note">
          {localSceneNote}
        </div>
      )}
    </div>
  );
};
