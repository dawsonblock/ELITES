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
    <div className="ending-overlay">
      <div className="ending-content">
        <div className="ending-breaking">BREAKING</div>
        <h1 className="ending-title">{def.title}</h1>
        <p className="ending-description">{def.description}</p>

        <div className="ui-panel ending-score-panel">
          <div className="ending-score-label">Evidence Score</div>
          <div className="ending-score-value">{Math.round(score)}%</div>
        </div>

        <div className="ending-segments">
          {def.newsSegments.map((seg, i) => (
            <div key={i} className="ending-segment">
              <div className="ending-segment-text">{seg}</div>
            </div>
          ))}
        </div>

        <div className="ending-actions">
          <button className="ui-button" onClick={onRestart}>Replay</button>
          <button className="ui-button secondary" onClick={onMenu}>Main Menu</button>
        </div>
      </div>
    </div>
  );
};
