import type { InteractableMeta, CameraRuntime, TriggerRuntime } from "../types/entityMetadata";

const INTERACTABLE_KEY = "__interactable";
const CAMERA_KEY = "__camera";
const TRIGGER_KEY = "__trigger";
const DOOR_KEY = "__door";
const MONITOR_KEY = "__monitor";
const SERVER_KEY = "__server";

export function setInteractableMeta(entity: import("playcanvas").Entity, data: InteractableMeta) {
  (entity as any)[INTERACTABLE_KEY] = data;
}

export function getInteractableMeta(entity: import("playcanvas").Entity): InteractableMeta | undefined {
  return (entity as any)[INTERACTABLE_KEY];
}

export function setCameraMeta(entity: import("playcanvas").Entity, data: CameraRuntime) {
  (entity as any)[CAMERA_KEY] = data;
}

export function getCameraMeta(entity: import("playcanvas").Entity): CameraRuntime | undefined {
  return (entity as any)[CAMERA_KEY];
}

export function setTriggerMeta(entity: import("playcanvas").Entity, data: TriggerRuntime) {
  (entity as any)[TRIGGER_KEY] = data;
}

export function getTriggerMeta(entity: import("playcanvas").Entity): TriggerRuntime | undefined {
  return (entity as any)[TRIGGER_KEY];
}

export function setDoorMeta(entity: import("playcanvas").Entity, data: unknown) {
  (entity as any)[DOOR_KEY] = data;
}

export function getDoorMeta(entity: import("playcanvas").Entity): unknown {
  return (entity as any)[DOOR_KEY];
}

export function setMonitorFlag(entity: import("playcanvas").Entity, value: boolean) {
  (entity as any)[MONITOR_KEY] = value;
}

export function getMonitorFlag(entity: import("playcanvas").Entity): boolean {
  return !!(entity as any)[MONITOR_KEY];
}

export function setServerFlag(entity: import("playcanvas").Entity, value: boolean) {
  (entity as any)[SERVER_KEY] = value;
}

export function getServerFlag(entity: import("playcanvas").Entity): boolean {
  return !!(entity as any)[SERVER_KEY];
}
