import { describe, it, expect } from "vitest";
import { ObjectiveSystem } from "../src/systems/ObjectiveSystem";
import { gameState } from "../src/game/GameState";

describe("ObjectiveSystem", () => {
  it("initializes objectives from JSON", () => {
    const sys = new ObjectiveSystem();
    sys.init();
    expect(gameState.allObjectives().length).toBeGreaterThan(0);
  });
});
