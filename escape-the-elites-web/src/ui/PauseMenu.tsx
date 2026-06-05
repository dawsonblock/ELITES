import type { FC } from "react";

type Props = {
  open: boolean;
  onResume: () => void;
  onSave: () => void;
  onLoad: () => void;
  onSettings: () => void;
  onQuit: () => void;
};

export const PauseMenu: FC<Props> = ({ open, onResume, onSave, onLoad, onSettings, onQuit }) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(5,5,8,0.85)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h2 style={{ marginBottom: 32 }}>Paused</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 240 }}>
        <button className="ui-button" onClick={onResume}>Resume</button>
        <button className="ui-button secondary" onClick={onSave}>Save</button>
        <button className="ui-button secondary" onClick={onLoad}>Load</button>
        <button className="ui-button secondary" onClick={onSettings}>Settings</button>
        <button className="ui-button danger" onClick={onQuit}>Quit to Menu</button>
      </div>
    </div>
  );
};
