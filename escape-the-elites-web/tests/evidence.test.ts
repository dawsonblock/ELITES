import { describe, it, expect } from "vitest";
import { EvidenceSystem } from "../src/systems/EvidenceSystem";
import { gameState } from "../src/game/GameState";

describe("EvidenceSystem", () => {
  it("initializes evidence from JSON", () => {
    const sys = new EvidenceSystem();
    sys.init();
    expect(gameState.allEvidence().length).toBeGreaterThan(0);
  });

  it("does not collect unknown evidence IDs", () => {
    const sys = new EvidenceSystem();
    sys.init();
    const result = gameState.collectEvidence("fake_evidence_id");
    expect(result).toBe(false);
    expect(gameState.hasEvidence("fake_evidence_id")).toBe(false);
    expect(gameState.collectedEvidence()).not.toContain("fake_evidence_id");
  });
});
