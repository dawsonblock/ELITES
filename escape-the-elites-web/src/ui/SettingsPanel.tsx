import { useState, useEffect } from "react";
import { gameState } from "../game/GameState";
import { audioSystem } from "../systems/AudioSystem";
import { GameConfig } from "../game/GameConfig";

type Props = {
  open: boolean;
  onClose: () => void;
};

const STORAGE_KEY = "elites_settings";

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old sensitivity values (0.01-1 range) to new 5-100 range
      if (parsed.sensitivity !== undefined && parsed.sensitivity <= 1) {
        parsed.sensitivity = Math.round(parsed.sensitivity * 100);
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function saveSettings(s: Record<string, number | boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

export const SettingsPanel: React.FC<Props> = ({ open, onClose }) => {
  const stored = loadSettings();
  const [sensitivity, setSensitivity] = useState(stored?.sensitivity ?? GameConfig.player.lookSensitivity * 100);
  const [brightness, setBrightness] = useState(stored?.brightness ?? 50);
  const [volume, setVolume] = useState(stored?.volume ?? 80);
  const [subtitles, setSubtitles] = useState(stored?.subtitles ?? true);
  const [highContrast, setHighContrast] = useState(stored?.highContrast ?? false);

  useEffect(() => {
    // Apply settings immediately when changed
    GameConfig.player.lookSensitivity = sensitivity / 100;
    const vol = volume / 100;
    audioSystem.setVolumes(vol, vol, vol * 0.6, vol * 0.7, vol);
    gameState.setSettings({ subtitles, highContrast });

    // Apply brightness via CSS on root
    const b = brightness / 50;
    const overlay = document.getElementById("brightness-overlay");
    if (overlay) {
      overlay.style.background = b < 1
        ? `rgba(0,0,0,${1 - b})`
        : `rgba(255,255,255,${(b - 1) * 0.3})`;
    }

    saveSettings({ sensitivity, brightness, volume, subtitles, highContrast });
  }, [sensitivity, brightness, volume, subtitles, highContrast]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(5,5,8,0.9)",
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="ui-panel" style={{ width: 400, maxWidth: "90vw" }}>
        <h2 style={{ marginBottom: 20 }}>Settings</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.875rem" }}>
            <span>Mouse Sensitivity</span>
            <span style={{ color: "#6b6b7b" }}>{sensitivity.toFixed(0)}%</span>
          </label>
          <input type="range" min={5} max={100} step={1} value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.875rem" }}>
            <span>Brightness</span>
            <span style={{ color: "#6b6b7b" }}>{brightness}%</span>
          </label>
          <input type="range" min={10} max={150} step={1} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.875rem" }}>
            <span>Master Volume</span>
            <span style={{ color: "#6b6b7b" }}>{volume}%</span>
          </label>
          <input type="range" min={0} max={100} step={1} value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ width: "100%" }} />
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", cursor: "pointer" }}>
            <input type="checkbox" checked={subtitles} onChange={(e) => setSubtitles(e.target.checked)} />
            Subtitles
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", cursor: "pointer" }}>
            <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
            High Contrast
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button className="ui-button secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
