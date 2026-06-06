import * as pc from "playcanvas";
import { GameConfig } from "../GameConfig";
import { GameEvents } from "../GameEvents";
import { eventBus } from "../../utils/eventBus";
import { getInteractableMeta } from "../../utils/entityMeta";

export class InteractionSystem {
  cameraEntity: pc.Entity | null = null;
  interactables: pc.Entity[] = [];

  updateRay() {
    if (!this.cameraEntity) return;
    const from = this.cameraEntity.getPosition();
    let best: pc.Entity | null = null;
    let bestDist = Infinity;

    for (const ent of this.interactables) {
      const pos = ent.getPosition();
      const dist = pos.distance(from);
      if (dist > GameConfig.interaction.rayLength) continue;
      const dir = pos.clone().sub(from).normalize();
      const dot = dir.dot(this.cameraEntity.forward);
      if (dot > 0.82 && dist < bestDist) {
        best = ent;
        bestDist = dist;
      }
    }

    if (best) {
      const data = getInteractableMeta(best);
      if (data) {
        eventBus.emit(GameEvents.INTERACT_TARGET, { type: data.type, label: data.label });
      }
    } else {
      eventBus.emit(GameEvents.INTERACT_TARGET, null);
    }
  }

  interact() {
    if (!this.cameraEntity) return;
    const from = this.cameraEntity.getPosition();
    let best: pc.Entity | null = null;
    let bestDist = Infinity;

    for (const ent of this.interactables) {
      const pos = ent.getPosition();
      const dist = pos.distance(from);
      if (dist > GameConfig.interaction.rayLength) continue;
      const dir = pos.clone().sub(from).normalize();
      const dot = dir.dot(this.cameraEntity.forward);
      if (dot > 0.82 && dist < bestDist) {
        best = ent;
        bestDist = dist;
      }
    }

    if (!best) return;
    const data = getInteractableMeta(best);
    eventBus.emit(GameEvents.INTERACT_TRIGGER, data);
  }

  dispose() {
    this.cameraEntity = null;
    this.interactables = [];
  }
}
