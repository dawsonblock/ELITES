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

  // Detection-based vignette intensity — runtime value, kept as inline style
  const vignetteOpacity = Math.min(detectionValue / 120, 0.55);

  // Alert tint — runtime value based on alert state
  const alertTint = alertState === "full_lockdown" ? "rgba(180, 20, 20," :
    alertState === "local_alert" ? "rgba(180, 100, 20," :
    alertState === "suspicious" ? "rgba(180, 160, 20," :
    "rgba(20, 20, 40,";

  return (
    <div className="screen-effects">
      {/* Vignette — opacity is runtime */}
      <div
        className="screen-vignette"
        style={{
          background: `radial-gradient(circle at center, transparent 50%, rgba(0,0,0,${0.4 + vignetteOpacity}) 100%)`,
        }}
      />

      {/* Alert tint — color and opacity are runtime */}
      {(alertState !== "normal" || detectionValue > 30) && (
        <div
          className="screen-alert-tint"
          style={{
            background: `${alertTint}${Math.min(detectionValue / 100, 0.25)})`,
          }}
        />
      )}

      {lockdownPulse && <div className="screen-lockdown-pulse" />}
      {evidenceFlash && <div className="screen-evidence-flash" />}
      {detectionState === "critical" && <div className="screen-detection-critical" />}
      {detectionState === "detected" && <div className="screen-detection-detected" />}
    </div>
  );
};
