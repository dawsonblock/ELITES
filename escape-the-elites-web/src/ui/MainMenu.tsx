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
    <div className="main-menu-overlay">
      <div className="main-menu-title-block">
        <h1 className="main-menu-title">ESCAPE THE ELITES</h1>
        <p className="main-menu-subtitle">The Broadcast</p>
      </div>

      <div className="main-menu-buttons">
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

      <div className="main-menu-footer">
        <p>Fictional investigative thriller. All content is fictional.</p>
        <p className="main-menu-footer-episode">Episode 1 — Vertical Slice</p>
      </div>
    </div>
  );
};
