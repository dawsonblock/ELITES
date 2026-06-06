import * as pc from "playcanvas";
import { GameEvents } from "../GameEvents";
import { gameState } from "../GameState";
import { eventBus } from "../../utils/eventBus";
import { audioSystem } from "../../systems/AudioSystem";
import { clamp } from "../../utils/math";
import type { AABB } from "../../utils/collision";
import { getInteractableMeta } from "../../utils/entityMeta";

export type DoorRuntime = {
  id: string;
  entity: pc.Entity;
  aabb: AABB;
  locked: boolean;
  targetOpen: boolean;
  progress: number;
  speed: number;
  meta: Record<string, unknown>;
  basePos: pc.Vec3;
};

export class DoorSystem {
  doors: DoorRuntime[] = [];
  private walls: AABB[] = [];
  private unsub: (() => void) | null = null;

  constructor(walls: AABB[]) {
    this.walls = walls;
    this.unsub = eventBus.on(GameEvents.DOOR_UNLOCKED, (doorId: unknown) => {
      const door = this.doors.find((d) => d.id === doorId);
      if (door) {
        door.locked = false;
        door.targetOpen = true;
        audioSystem.playDoorOpen();
        const meta = getInteractableMeta(door.entity);
        if (meta?.meta) {
          meta.meta.locked = false;
        }
      }
    });
  }

  setDoors(doors: DoorRuntime[], walls: AABB[]) {
    this.doors = doors;
    this.walls = walls;
    // Restore unlocked door states after scene rebuild
    for (const door of this.doors) {
      if (gameState.isDoorUnlocked(door.id)) {
        door.locked = false;
        door.targetOpen = true;
        const idx = this.walls.indexOf(door.aabb);
        if (idx >= 0) this.walls.splice(idx, 1);
        const meta = getInteractableMeta(door.entity);
        if (meta?.meta) {
          meta.meta.locked = false;
        }
      }
    }
  }

  update(dt: number) {
    for (const door of this.doors) {
      const target = door.targetOpen ? 1 : 0;
      if (Math.abs(door.progress - target) > 0.001) {
        const dir = target > door.progress ? 1 : -1;
        door.progress = clamp(door.progress + dir * door.speed * dt, 0, 1);
        const bx = door.basePos.x;
        door.entity.setPosition(bx + 1.5 * door.progress, door.basePos.y, door.basePos.z);
        const idx = this.walls.indexOf(door.aabb);
        if (door.progress > 0.5 && idx >= 0 && door.targetOpen) {
          this.walls.splice(idx, 1);
        } else if (door.progress <= 0.5 && idx < 0 && !door.targetOpen) {
          this.walls.push(door.aabb);
        }
      }
    }
  }

  dispose() {
    this.unsub?.();
    this.unsub = null;
  }
}
