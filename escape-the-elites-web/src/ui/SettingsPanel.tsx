import { useState, useEffect, useCallback } from "react";
import { gameState } from "../game/GameState";
import { audioSystem } from "../systems/AudioSystem";
import { GameConfig } from "../game/GameConfig";
import { inputManager } from "../game/InputManager";
import type { InputAction } from "../types/input";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Tab = "graphics" | "audio" | "controls";

const STORAGE_KEY = "elites_settings";

const REMAPPABLE_ACTIONS: { action: InputAction; label: string }[] = [
  { action: "moveForward",   label: "Move Forward" },
  { action: "moveBackward",  label: "Move Backward" },
  { action: "moveLeft",      label: "Strafe Left" },
  { action: "moveRight",     label: "Strafe Right" },
  { action: "sprint",        label: "Sprint" },
  { action: "crouch",        label: "Crouch / Sneak" },
  { action: "interact",      label: "Interact" },
  { action: "flashlight",    label: "Flashlight" },
  { action: "evidenceBoard", label: "Evidence Board" },
  { action: "leanLeft",      label: "Lean Left" },
  { action: "leanRight",     label: "Lean Right" },
];

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old sensitivity values (0.01-1 range) to new 5-100 range
      if (parsed.sensitivity !== undefined && parsed.sensitivity <= 1) {
        parsed.sensitivity = Math.round(parsed.sensitivity * 100);
      }
      // Restore keybindings
      if (parsed.keybindings && typeof parsed.keybindings === "object") {
        for (const [code, action] of Object.entries(parsed.keybindings)) {
          inputManager.remapKey(code, action as import("../types/input").InputAction);
        }
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function saveSettings(s: Record<string, unknown>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

/** Returns the primary key code bound to an action, or "—" if unbound. */
function getBoundKey(action: InputAction): string {
  const bindings = inputManager.getBindings();
  const entry = Object.entries(bindings).find(([, a]) => a === action);
  if (!entry) return "—";
  // Format code → readable label
  return formatKeyCode(entry[0]);
}

function formatKeyCode(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "ControlLeft" || code === "ControlRight") return "Ctrl";
  if (code === "AltLeft" || code === "AltRight") return "Alt";
  if (code === "Space") return "Space";
  if (code === "Tab") return "Tab";
  if (code === "Escape") return "Esc";
  if (code.startsWith("Arrow")) return "↑↓←→"[["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(code)] || code;
  return code;
}

export const SettingsPanel: React.FC<Props> = ({ open, onClose }) => {
  const stored = loadSettings();
  const [tab, setTab] = useState<Tab>("graphics");
  const [sensitivity, setSensitivity] = useState<number>(stored?.sensitivity ?? GameConfig.player.lookSensitivity * 100);
  const [brightness, setBrightness] = useState<number>(stored?.brightness ?? 50);
  const [volume, setVolume] = useState<number>(stored?.volume ?? 80);
  const [subtitles, setSubtitles] = useState<boolean>(stored?.subtitles ?? true);
  const [highContrast, setHighContrast] = useState<boolean>(stored?.highContrast ?? false);
  const [reduceMotion, setReduceMotion] = useState<boolean>(stored?.reduceMotion ?? false);
  const [rebinding, setRebinding] = useState<InputAction | null>(null);
  const [, setBindingsTick] = useState(0);

  const refreshBindings = useCallback(() => setBindingsTick((t) => t + 1), []);

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

    // High contrast body class
    document.body.classList.toggle("high-contrast", highContrast);

    // Reduce motion body class
    document.body.classList.toggle("reduce-motion", reduceMotion);

    saveSettings({ sensitivity, brightness, volume, subtitles, highContrast, reduceMotion, keybindings: inputManager.getBindings() });
  }, [sensitivity, brightness, volume, subtitles, highContrast, reduceMotion]);

  // Key capture for rebinding
  useEffect(() => {
    if (!rebinding) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") {
        setRebinding(null);
        return;
      }
      // Clear old binding for this code, assign new
      inputManager.remapKey(e.code, rebinding);
      setRebinding(null);
      refreshBindings();
      // Persist updated bindings immediately
      try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        existing.keybindings = inputManager.getBindings();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      } catch { /* ignore */ }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [rebinding, refreshBindings]);

  if (!open) return null;

  return (
    <div className="settings-overlay">
      <div className="ui-panel settings-panel">
        <h2 className="settings-title">Settings</h2>

        <div className="settings-tabs">
          <button
            className={`settings-tab-btn ${tab === "graphics" ? "active" : ""}`}
            onClick={() => setTab("graphics")}
          >Graphics</button>
          <button
            className={`settings-tab-btn ${tab === "audio" ? "active" : ""}`}
            onClick={() => setTab("audio")}
          >Audio</button>
          <button
            className={`settings-tab-btn ${tab === "controls" ? "active" : ""}`}
            onClick={() => setTab("controls")}
          >Controls</button>
        </div>

        {tab === "graphics" && (
          <>
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

            <div className="settings-checkboxes">
              <label className="settings-checkbox-label">
                <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
                High Contrast UI
              </label>
              <label className="settings-checkbox-label">
                <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
                Reduce Motion
              </label>
              <label className="settings-checkbox-label">
                <input type="checkbox" checked={subtitles} onChange={(e) => setSubtitles(e.target.checked)} />
                Subtitles
              </label>
            </div>
          </>
        )}

        {tab === "audio" && (
          <div className="settings-row">
            <label className="settings-label">
              <span>Master Volume</span>
              <span className="settings-value">{volume}%</span>
            </label>
            <input type="range" min={0} max={100} step={1} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="settings-range" />
          </div>
        )}

        {tab === "controls" && (
          <div className="settings-controls-list">
            {REMAPPABLE_ACTIONS.map(({ action, label }) => (
              <div key={action} className="settings-control-row">
                <span className="settings-control-label">{label}</span>
                <button
                  className={`settings-control-key ${rebinding === action ? "rebinding" : ""}`}
                  onClick={() => setRebinding(rebinding === action ? null : action)}
                >
                  {rebinding === action ? "Press key…" : getBoundKey(action)}
                </button>
              </div>
            ))}
            <p className="settings-controls-hint">
              Click a key to rebind it. Press Esc to cancel.
            </p>
          </div>
        )}

        <div className="settings-actions">
          <button className="ui-button secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
