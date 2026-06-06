export type SceneId =
  | "dock"
  | "service_entrance"
  | "mansion_office"
  | "security_wing"
  | "bunker_server_room"
  | "broadcast_tower";

export type SceneDefinition = {
  id: SceneId;
  name: string;
  description: string;
  purpose: string;
  tone: string;
  spawnPosition: [number, number, number];
  lightingPreset: "storm" | "mansion" | "security" | "bunker" | "tower";
  nextScene?: SceneId;
};
