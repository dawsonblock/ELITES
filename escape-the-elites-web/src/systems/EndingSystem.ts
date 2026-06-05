import { gameState } from "../game/GameState";
import type { EndingType, EndingScore } from "../types/ending";
import { evidenceSystem } from "./EvidenceSystem";

export class EndingSystem {
  calculateScore(): EndingScore {
    const all = gameState.allEvidence();
    const collected = all.filter((e) => gameState.hasEvidence(e.id));
    const required = all.filter((e) => e.requiredForBestEnding);
    const reqCollected = required.filter((e) => gameState.hasEvidence(e.id));
    const reqPct = required.length ? (reqCollected.length / required.length) * 100 : 0;
    const opt = all.filter((e) => !e.requiredForBestEnding);
    const optCollected = opt.filter((e) => gameState.hasEvidence(e.id));
    const optPct = opt.length ? (optCollected.length / opt.length) * 100 : 0;
    const corTotal = all.reduce((sum, e) => sum + e.corroborates.length, 0);
    const corMatched = collected.reduce((sum, e) => {
      return sum + e.corroborates.filter((c) => collected.some((ce) => ce.id === c)).length;
    }, 0);
    const corPct = corTotal ? (corMatched / corTotal) * 100 : 0;
    const stealthBonus = gameState.alert === "normal" ? 5 : gameState.alert === "suspicious" ? 3 : 0;
    return {
      requiredEvidencePercent: reqPct,
      optionalEvidencePercent: optPct,
      corroborationPercent: corPct,
      stealthBonus,
      total: reqPct * 0.6 + optPct * 0.2 + corPct * 0.15 + stealthBonus,
    };
  }

  determineEnding(score: EndingScore): EndingType {
    const broadcastComplete = gameState.endingFlags["broadcastComplete"] || false;
    if (!broadcastComplete || score.requiredEvidencePercent < 40) return "bad";
    if (score.requiredEvidencePercent < 75) return "partial";
    const hasSecret = evidenceSystem.hasAllForSecret();
    const allCorroboration = score.corroborationPercent >= 95;
    if (hasSecret && allCorroboration) return "secret";
    return "best";
  }
}

export const endingSystem = new EndingSystem();
