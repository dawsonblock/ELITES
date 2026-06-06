import React, { useState, useEffect } from "react";
import { gameState } from "../game/GameState";
import { eventBus } from "../utils/eventBus";
import { GameEvents } from "../game/GameEvents";
import type { EvidenceItem } from "../types/evidence";

type Props = {
  open: boolean;
  onClose: () => void;
  onViewEvidence?: (id: string) => void;
};

function broadcastReadiness(collected: EvidenceItem[]): number {
  const all = gameState.allEvidence();
  const required = all.filter((e) => e.requiredForBestEnding);
  const requiredCollected = required.filter((e) => collected.some((c) => c.id === e.id));
  const reqPct = required.length ? (requiredCollected.length / required.length) * 100 : 0;
  const opt = all.filter((e) => !e.requiredForBestEnding);
  const optCollected = opt.filter((e) => collected.some((c) => c.id === e.id));
  const optPct = opt.length ? (optCollected.length / opt.length) * 100 : 0;
  const corTotal = all.reduce((sum, e) => sum + e.corroborates.length, 0);
  const corMatched = collected.reduce((sum, e) => {
    return sum + e.corroborates.filter((c) => collected.some((ce) => ce.id === c)).length;
  }, 0);
  const corPct = corTotal ? (corMatched / corTotal) * 100 : 0;
  return Math.round(reqPct * 0.6 + optPct * 0.2 + corPct * 0.15 + 5); // stealth bonus placeholder
}

function readinessColorClass(pct: number): string {
  if (pct >= 75) return "readiness-high";
  if (pct >= 40) return "readiness-mid";
  return "readiness-low";
}

function importanceBorderColor(importance: number): string {
  if (importance >= 4) return "#ef4444";
  if (importance >= 3) return "#f59e0b";
  return "#3b82f6";
}

export const EvidenceBoard: React.FC<Props> = ({ open, onClose, onViewEvidence }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    const unsub1 = eventBus.on(GameEvents.EVIDENCE_COLLECTED, onChange);
    const unsub2 = eventBus.on(GameEvents.OBJECTIVE_COMPLETED, onChange);
    const unsub3 = eventBus.on(GameEvents.OBJECTIVE_UPDATED, onChange);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const collected = gameState.allEvidence().filter((e) => gameState.hasEvidence(e.id));
  const readiness = broadcastReadiness(collected);
  const missing = gameState.allEvidence().filter((e) => !gameState.hasEvidence(e.id) && e.requiredForBestEnding);

  if (!open) return null;

  return (
    <div className="evidence-board-overlay" onClick={onClose}>
      <div className="evidence-board-header">
        <h2 className="evidence-board-title">Evidence Board</h2>
        <button className="ui-button secondary" onClick={onClose}>Close</button>
      </div>

      <div className="ui-panel evidence-readiness">
        <div className="evidence-readiness-row">
          <span>Broadcast Readiness</span>
          <span className={`evidence-readiness-value ${readinessColorClass(readiness)}`}>
            {readiness}%
          </span>
        </div>
        <div className="evidence-readiness-missing">
          Missing required evidence: {missing.length > 0 ? missing.map((m) => m.title).join(", ") : "None"}
        </div>
      </div>

      <div className="evidence-grid">
        {gameState.allEvidence().map((ev) => {
          const has = gameState.hasEvidence(ev.id);
          return (
            <div
              key={ev.id}
              className={`ui-panel evidence-card ${has ? "evidence-card-collected" : "evidence-card-undiscovered"}`}
              onClick={() => has && onViewEvidence?.(ev.id)}
              style={{ borderLeft: `3px solid ${importanceBorderColor(ev.importance)}` }}
            >
              <div className="evidence-card-type">{ev.type}</div>
              <div className="evidence-card-name">{has ? ev.title : "???"}</div>
              <div className="evidence-card-summary">{has ? ev.summary : "Not yet discovered."}</div>
              {has && ev.corroborates.length > 0 && (
                <div className="evidence-card-corroborates">
                  Corroborates: {ev.corroborates.map((c) => gameState.getEvidence(c)?.title || c).join(", ")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
