/**
 * levelSchema.ts
 *
 * TypeScript types for the JSON level format.
 *
 * Design principle: start minimal. Only add fields after one polished route
 * proves what the schema actually needs. Do not build a custom editor yet —
 * JSON + these types + TypeScript validation is enough for Alpha 0.7.
 */

export type Vec3 = [number, number, number];
export type Color3 = [number, number, number]; // 0–1 linear

// ─── Entity types ────────────────────────────────────────────────────────────

export type LevelPropEntity = {
  type: "prop";
  id: string;
  model?: string;           // GLB asset key from AssetLoader manifest (optional — fallback to box)
  position: Vec3;
  rotation?: Vec3;          // euler degrees, optional
  scale: Vec3;
  color: Color3;
  emissive?: Color3;
  gloss?: number;
};

export type LevelWallEntity = {
  type: "wall";
  id: string;
  position: Vec3;
  scale: Vec3;
  color: Color3;
};

export type LevelFloorEntity = {
  type: "floor";
  id: string;
  position: Vec3;
  scale: Vec3;
  color: Color3;
};

export type LevelCeilingEntity = {
  type: "ceiling";
  id: string;
  position: Vec3;
  scale: Vec3;
  color: Color3;
};

export type LevelDoorEntity = {
  type: "door";
  id: string;
  position: Vec3;
  scale: Vec3;
  color: Color3;
  doorId: string;
  locked: boolean;
  needsKey?: string;        // evidenceId required to unlock
  needsCode?: string;       // code string required to unlock
  lockedMessage?: string;
};

export type LevelEvidenceEntity = {
  type: "evidence";
  id: string;
  position: Vec3;
  scale: Vec3;
  color: Color3;
  emissive?: Color3;
  evidenceId: string;
  label: string;
};

export type LevelTerminalEntity = {
  type: "terminal";
  id: string;
  position: Vec3;
  scale: Vec3;
  color: Color3;
  emissive?: Color3;
  terminalId: string;
  label: string;
};

export type LevelNoteEntity = {
  type: "note";
  id: string;
  position: Vec3;
  scale: Vec3;
  color: Color3;
  label: string;
  text: string;
};

export type LevelCameraEntity = {
  type: "camera";
  id: string;
  mountPosition: Vec3;
  bodyPosition: Vec3;
  cameraId: string;
  sweepAngle: number;
  sweepSpeed: number;
  coneRange: number;
};

export type LevelHidingZoneEntity = {
  type: "hiding_zone";
  id: string;
  position: Vec3;
  scale: Vec3;
};

export type LevelLightEntity = {
  type: "light";
  id: string;
  lightType: "point" | "directional" | "spot";
  position: Vec3;
  color: Color3;
  intensity: number;
  range?: number;
  spotAngle?: number;
};

export type LevelTriggerEntity = {
  type: "trigger";
  id: string;
  position: Vec3;
  scale: Vec3;
  targetScene: string;
  sceneName: string;
};

export type LevelEntity =
  | LevelPropEntity
  | LevelWallEntity
  | LevelFloorEntity
  | LevelCeilingEntity
  | LevelDoorEntity
  | LevelEvidenceEntity
  | LevelTerminalEntity
  | LevelNoteEntity
  | LevelCameraEntity
  | LevelHidingZoneEntity
  | LevelLightEntity
  | LevelTriggerEntity;

// ─── Scene definition ─────────────────────────────────────────────────────────

export type LevelFog = {
  color: Color3;
  density: number;
};

export type LevelSpawn = {
  position: Vec3;
  yaw: number;
};

export type LevelSchema = {
  id: string;
  name: string;
  ambient: "storm" | "indoor" | "bunker" | "tower";
  fog: LevelFog;
  spawn: LevelSpawn;
  entities: LevelEntity[];
};
