import type { FC } from "react";

type Props = {
  onStart: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onCredits: () => void;
  hasSave: boolean;
};

export const MainMenu: FC<Props> = ({ onStart, onContinue, onSettings, onCredits, hasSave }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #020205 0%, #0a0a10 60%, #050508 100%)",
        zIndex: 100,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: "#e8e8ec",
            margin: 0,
            textShadow: "0 0 40px rgba(59,130,246,0.15)",
          }}
        >
          ESCAPE THE ELITES
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "#6b6b7b",
            marginTop: 8,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          The Broadcast
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 240 }}>
        <button className="ui-button" onClick={onStart}>
          Start
        </button>
        <button className="ui-button secondary" onClick={onContinue} disabled={!hasSave} style={{ opacity: hasSave ? 1 : 0.4 }}>
          Continue
        </button>
        <button className="ui-button secondary" onClick={onSettings}>
          Settings
        </button>
        <button className="ui-button secondary" onClick={onCredits}>
          Credits
        </button>
      </div>

      <div style={{ position: "absolute", bottom: 24, fontSize: "0.7rem", color: "#444", textAlign: "center" }}>
        <p>Fictional investigative thriller. All content is fictional.</p>
        <p style={{ marginTop: 4 }}>Episode 1 — Vertical Slice</p>
      </div>
    </div>
  );
};
