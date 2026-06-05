import { describe, it, expect } from "vitest";
import { EvidenceSystem } from "../src/systems/EvidenceSystem";
import { gameState } from "../src/game/GameState";

describe("EvidenceSystem", () => {
  it("initializes evidence from JSON", () => {
    const sys = new EvidenceSystem();
    sys.init();
    expect(gameState.allEvidence().length).toBeGreaterThan(0);
  });
});
