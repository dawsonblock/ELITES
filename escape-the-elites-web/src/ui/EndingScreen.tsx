import type { FC } from "react";
import type { EndingType, EndingDefinition } from "../types/ending";
import endingsJson from "../data/endings.json";

type Props = {
  ending: EndingType;
  score: number;
  onRestart: () => void;
  onMenu: () => void;
};

export const EndingScreen: FC<Props> = ({ ending, score, onRestart, onMenu }) => {
  const def = (endingsJson as EndingDefinition[]).find((e) => e.id === ending);
  if (!def) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#020205",
        zIndex: 110,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 640, width: "100%" }}>
        <div style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>BREAKING</div>
        <h1 style={{ fontSize: "2rem", marginBottom: 16 }}>{def.title}</h1>
        <p style={{ color: "#a0a0b0", lineHeight: 1.6, marginBottom: 32 }}>{def.description}</p>

        <div className="ui-panel" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: "0.875rem", color: "#6b6b7b", marginBottom: 8 }}>Evidence Score</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{Math.round(score)}%</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
          {def.newsSegments.map((seg, i) => (
            <div key={i} style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 6, borderLeft: "3px solid #ef4444" }}>
              <div style={{ fontSize: "0.875rem" }}>{seg}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="ui-button" onClick={onRestart}>Replay</button>
          <button className="ui-button secondary" onClick={onMenu}>Main Menu</button>
        </div>
      </div>
    </div>
  );
};
