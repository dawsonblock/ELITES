import React from "react";
import { gameState } from "../game/GameState";
import type { EvidenceItem } from "../types/evidence";

type Props = {
  open: boolean;
  onClose: () => void;
  onViewEvidence?: (id: string) => void;
};

function broadcastReadiness(collected: EvidenceItem[]): number {
  const all = gameState.allEvidence();
  const required = all.filter((e) => e.requiredForBestEnding);
  const requiredCollected = required.filter((e) => collected.includes(e));
  const reqPct = required.length ? (requiredCollected.length / required.length) * 100 : 0;
  const opt = all.filter((e) => !e.requiredForBestEnding);
  const optCollected = opt.filter((e) => collected.includes(e));
  const optPct = opt.length ? (optCollected.length / opt.length) * 100 : 0;
  const corTotal = all.reduce((sum, e) => sum + e.corroborates.length, 0);
  const corMatched = collected.reduce((sum, e) => {
    return sum + e.corroborates.filter((c) => collected.some((ce) => ce.id === c)).length;
  }, 0);
  const corPct = corTotal ? (corMatched / corTotal) * 100 : 0;
  return Math.round(reqPct * 0.6 + optPct * 0.2 + corPct * 0.15 + 5); // stealth bonus placeholder
}

export const EvidenceBoard: React.FC<Props> = ({ open, onClose, onViewEvidence }) => {
  const collected = gameState.allEvidence().filter((e) => gameState.hasEvidence(e.id));
  const readiness = broadcastReadiness(collected);
  const missing = gameState.allEvidence().filter((e) => !gameState.hasEvidence(e.id) && e.requiredForBestEnding);

  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(5,5,8,0.92)",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        padding: 32,
        overflow: "auto",
      }}
      onClick={onClose}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Evidence Board</h2>
        <button className="ui-button secondary" onClick={onClose}>Close</button>
      </div>

      <div className="ui-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Broadcast Readiness</span>
          <span style={{ fontSize: "1.25rem", fontWeight: 700, color: readiness >= 75 ? "#22c55e" : readiness >= 40 ? "#f59e0b" : "#ef4444" }}>
            {readiness}%
          </span>
        </div>
        <div style={{ marginTop: 8, fontSize: "0.875rem", color: "#6b6b7b" }}>
          Missing required evidence: {missing.length > 0 ? missing.map((m) => m.title).join(", ") : "None"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {gameState.allEvidence().map((ev) => {
          const has = gameState.hasEvidence(ev.id);
          return (
            <div
              key={ev.id}
              className="ui-panel"
              onClick={() => has && onViewEvidence?.(ev.id)}
              style={{
                opacity: has ? 1 : 0.4,
                borderLeft: `3px solid ${
                  ev.importance >= 4 ? "#ef4444" : ev.importance >= 3 ? "#f59e0b" : "#3b82f6"
                }`,
                cursor: has ? "pointer" : "default",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => has && (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => has && (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div style={{ fontSize: "0.75rem", color: "#6b6b7b", textTransform: "uppercase", marginBottom: 4 }}>{ev.type}</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{has ? ev.title : "???"}</div>
              <div style={{ fontSize: "0.8rem", color: "#90909e" }}>{has ? ev.summary : "Not yet discovered."}</div>
              {has && ev.corroborates.length > 0 && (
                <div style={{ marginTop: 8, fontSize: "0.75rem", color: "#3b82f6" }}>
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
