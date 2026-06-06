import { useEffect, useState } from "react";
import { gameState } from "../game/GameState";
import { eventBus } from "../utils/eventBus";
import { GameEvents } from "../game/GameEvents";
import { audioSystem } from "../systems/AudioSystem";

export const ScreenEffects: React.FC = () => {
  const [alertState, setAlertState] = useState(gameState.alert);
  const [detectionState, setDetectionState] = useState(gameState.detection);
  const [detectionValue, setDetectionValue] = useState(gameState.detectionValue);
  const [lockdownPulse, setLockdownPulse] = useState(false);
  const [evidenceFlash, setEvidenceFlash] = useState(false);

  useEffect(() => {
    const onAlert = (s: unknown) => setAlertState(s as typeof alertState);
    const onDetection = () => {
      setDetectionState(gameState.detection);
      setDetectionValue(gameState.detectionValue);
    };
    const onLockdown = () => {
      setLockdownPulse(true);
      audioSystem.playLockdownAlarm();
      setTimeout(() => setLockdownPulse(false), 3000);
    };
    const onEvidence = () => {
      setEvidenceFlash(true);
      audioSystem.playEvidenceCollect();
      setTimeout(() => setEvidenceFlash(false), 400);
    };
    const onDoor = () => audioSystem.playDoorOpen();
    const onDownload = () => audioSystem.playTerminalBoot();

    const unsub1 = eventBus.on(GameEvents.ALERT_CHANGED, onAlert);
    const unsub2 = eventBus.on(GameEvents.DETECTION_CHANGED, onDetection);
    const unsub3 = eventBus.on(GameEvents.LOCKDOWN_TRIGGERED, onLockdown);
    const unsub4 = eventBus.on(GameEvents.EVIDENCE_COLLECTED, onEvidence);
    const unsub5 = eventBus.on(GameEvents.DOOR_UNLOCKED, onDoor);
    const unsub6 = eventBus.on(GameEvents.DOWNLOAD_STARTED, onDownload);

    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6();
    };
  }, []);

  // Detection-based vignette intensity
  const vignetteOpacity = Math.min(detectionValue / 120, 0.55);
  const alertTint = alertState === "full_lockdown" ? "rgba(180, 20, 20," :
    alertState === "local_alert" ? "rgba(180, 100, 20," :
    alertState === "suspicious" ? "rgba(180, 160, 20," :
    "rgba(20, 20, 40,";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 5,
        mixBlendMode: "multiply",
      }}
    >
      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at center, transparent 50%, rgba(0,0,0,${0.4 + vignetteOpacity}) 100%)`,
          transition: "background 0.3s ease",
        }}
      />

      {/* Alert tint overlay */}
      {(alertState !== "normal" || detectionValue > 30) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `${alertTint}${Math.min(detectionValue / 100, 0.25)})`,
            transition: "background 0.4s ease",
            mixBlendMode: "overlay",
          }}
        />
      )}

      {/* Lockdown pulse */}
      {lockdownPulse && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(180, 20, 20, 0.15)",
            animation: "lockdownPulse 0.5s ease-in-out 6",
          }}
        />
      )}

      {/* Evidence collection flash */}
      {evidenceFlash && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(59, 130, 246, 0.08)",
            transition: "opacity 0.15s ease",
          }}
        />
      )}

      {/* Detection edge warning */}
      {detectionState === "critical" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: "inset 0 0 60px rgba(220, 40, 40, 0.4)",
            animation: "pulseBorder 0.6s ease-in-out infinite",
          }}
        />
      )}

      {/* Detected red flash */}
      {detectionState === "detected" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(180, 20, 20, 0.2)",
            animation: "detectedFlash 0.3s ease-in-out infinite",
          }}
        />
      )}

      <style>{`
        @keyframes lockdownPulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes pulseBorder {
          0%, 100% { box-shadow: inset 0 0 40px rgba(220, 40, 40, 0.3); }
          50% { box-shadow: inset 0 0 80px rgba(220, 40, 40, 0.6); }
        }
        @keyframes detectedFlash {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
};
