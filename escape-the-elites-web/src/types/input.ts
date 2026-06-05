export type InputAction =
  | "moveForward"
  | "moveBackward"
  | "moveLeft"
  | "moveRight"
  | "sprint"
  | "crouch"
  | "flashlight"
  | "interact"
  | "pause"
  | "evidenceBoard"
  | "lookUp"
  | "lookDown"
  | "lookLeft"
  | "lookRight"
  | "leanLeft"
  | "leanRight";

export type InputMap = Record<string, InputAction>;

export type ControllerBindings = {
  keyboard: InputMap;
  gamepad?: Record<number, InputAction>;
};
