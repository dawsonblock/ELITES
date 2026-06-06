import type { AABB } from "../utils/collision";

export type InteractableMeta = {
  type: string;
  label: string;
  meta?: Record<string, unknown>;
};

export type DoorRuntime = {
  id: string;
  entity: import("playcanvas").Entity;
  aabb: AABB;
  locked: boolean;
  targetOpen: boolean;
  progress: number;
  speed: number;
  meta: Record<string, unknown>;
  basePos: import("playcanvas").Vec3;
};

export type CameraRuntime = {
  id: string;
  sweepAngle: number;
  sweepSpeed: number;
};

export type TriggerRuntime = {
  targetScene: string;
  sceneName: string;
};
