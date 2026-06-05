import { gameState } from "../game/GameState";

export type AppPhase = "menu" | "playing" | "paused" | "ending";

export const AppState = {
  phase: "menu" as AppPhase,
  get isPlaying() { return this.phase === "playing"; },
  get isPaused() { return this.phase === "paused"; },
  get gameState() { return gameState; },
};
