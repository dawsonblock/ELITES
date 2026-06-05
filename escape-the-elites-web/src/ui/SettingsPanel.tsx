import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const SettingsPanel: React.FC<Props> = ({ open, onClose }) => {
  const [sensitivity, setSensitivity] = useState(0.15);
  const [brightness, setBrightness] = useState(50);
  const [volume, setVolume] = useState(80);
  const [subtitles, setSubtitles] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

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
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem" }}>Mouse Sensitivity</label>
          <input type="range" min={0.01} max={1} step={0.01} value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem" }}>Brightness</label>
          <input type="range" min={0} max={100} step={1} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem" }}>Master Volume</label>
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
