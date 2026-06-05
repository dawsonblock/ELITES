export type DetectionState = "hidden" | "watched" | "suspicious" | "critical" | "detected";

export type AlertState = "normal" | "suspicious" | "local_alert" | "full_lockdown" | "final_lockdown";

export type VisibilityFactors = {
  distance: number;
  coneAngle: number;
  isCrouching: boolean;
  flashlightOn: boolean;
  lightingZone: "dark" | "dim" | "lit";
  movementSpeed: number;
};

export type StealthConfig = {
  cameraSweepSpeed: number;
  cameraDetectionRange: number;
  cameraConeAngle: number;
  guardVisionRange: number;
  guardHearingRange: number;
  guardConeAngle: number;
  detectionDecayRate: number;
  alertCooldownSeconds: number;
};
