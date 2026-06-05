import type { InputAction, InputMap } from "../types/input";

const defaultKeyboardMap: InputMap = {
  KeyW: "moveForward",
  KeyS: "moveBackward",
  KeyA: "moveLeft",
  KeyD: "moveRight",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
  ControlLeft: "crouch",
  ControlRight: "crouch",
  KeyF: "flashlight",
  KeyE: "interact",
  KeyQ: "leanLeft",
  KeyR: "leanRight",
  Escape: "pause",
  Tab: "evidenceBoard",
  ArrowUp: "lookUp",
  ArrowDown: "lookDown",
  ArrowLeft: "lookLeft",
  ArrowRight: "lookRight",
};

export class InputManager {
  private actions: Map<InputAction, boolean> = new Map();
  private lookDelta: [number, number] = [0, 0];
  private keyboardMap: InputMap = { ...defaultKeyboardMap };
  private pointerLocked = false;
  private onPointerLockChange?: () => void;

  constructor() {
    this.bindEvents();
  }

  private bindEvents() {
    window.addEventListener("keydown", (e) => this.onKey(e, true));
    window.addEventListener("keyup", (e) => this.onKey(e, false));
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));
    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement !== null;
      this.onPointerLockChange?.();
    });
  }

  private onKey(e: KeyboardEvent, pressed: boolean) {
    const action = this.keyboardMap[e.code];
    if (action) {
      this.actions.set(action, pressed);
      if (["Tab", "Escape"].includes(e.code)) {
        e.preventDefault();
      }
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (this.pointerLocked) {
      this.lookDelta[0] += e.movementX;
      this.lookDelta[1] += e.movementY;
    }
  }

  isActive(action: InputAction): boolean {
    return this.actions.get(action) || false;
  }

  consumeLook(): [number, number] {
    const d = [...this.lookDelta] as [number, number];
    this.lookDelta[0] = 0;
    this.lookDelta[1] = 0;
    return d;
  }

  requestPointerLock(canvas: HTMLCanvasElement) {
    canvas.requestPointerLock();
  }

  exitPointerLock() {
    document.exitPointerLock();
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  setPointerLockCallback(cb: () => void) {
    this.onPointerLockChange = cb;
  }

  remapKey(code: string, action: InputAction | null) {
    if (action === null) {
      delete this.keyboardMap[code];
    } else {
      this.keyboardMap[code] = action;
    }
  }

  getBindings(): InputMap {
    return { ...this.keyboardMap };
  }
}

export const inputManager = new InputManager();
