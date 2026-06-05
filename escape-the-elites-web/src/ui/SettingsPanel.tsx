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
    <div className="settings-overlay">
      <div className="ui-panel settings-panel">
        <h2 className="settings-title">Settings</h2>

        <div className="settings-row">
          <label className="settings-label">
            <span>Mouse Sensitivity</span>
            <span className="settings-value">{sensitivity.toFixed(0)}%</span>
          </label>
          <input type="range" min={5} max={100} step={1} value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} className="settings-range" />
        </div>

        <div className="settings-row">
          <label className="settings-label">
            <span>Brightness</span>
            <span className="settings-value">{brightness}%</span>
          </label>
          <input type="range" min={10} max={150} step={1} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="settings-range" />
        </div>

        <div className="settings-row">
          <label className="settings-label">
            <span>Master Volume</span>
            <span className="settings-value">{volume}%</span>
          </label>
          <input type="range" min={0} max={100} step={1} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="settings-range" />
        </div>

        <div className="settings-checkboxes">
          <label className="settings-checkbox-label">
            <input type="checkbox" checked={subtitles} onChange={(e) => setSubtitles(e.target.checked)} />
            Subtitles
          </label>
          <label className="settings-checkbox-label">
            <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
            High Contrast
          </label>
        </div>

        <div className="settings-actions">
          <button className="ui-button secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
