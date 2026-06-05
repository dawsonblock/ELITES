import { gameState } from "../game/GameState";
import { eventBus } from "../utils/eventBus";
import { GameEvents } from "../game/GameEvents";
import evidenceJson from "../data/evidence.json";
import type { EvidenceItem } from "../types/evidence";

export class EvidenceSystem {
  init() {
    const cloned = JSON.parse(JSON.stringify(evidenceJson)) as EvidenceItem[];
    gameState.registerEvidence(cloned);
  }

  collect(id: string): boolean {
    if (!gameState.collectEvidence(id)) return false;
    const item = gameState.getEvidence(id);
    if (!item) return false;

    eventBus.emit(GameEvents.EVIDENCE_COLLECTED, id);
    return true;
  }

  getBroadcastReadiness(): number {
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
    return Math.round(reqPct * 0.6 + optPct * 0.2 + corPct * 0.15 + 5);
  }

  hasAllRequiredForEnding(): boolean {
    const required = gameState.allEvidence().filter((e) => e.requiredForBestEnding);
    return required.every((e) => gameState.hasEvidence(e.id));
  }

  hasAllForSecret(): boolean {
    const secret = gameState.allEvidence().filter((e) => e.requiredForSecretEnding);
    return secret.every((e) => gameState.hasEvidence(e.id));
  }
}

export const evidenceSystem = new EvidenceSystem();
