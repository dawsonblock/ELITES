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

  private touchLookStart: [number, number] | null = null;
  private touchLookDelta: [number, number] = [0, 0];
  private touchLookId: number | null = null;

  private bindEvents() {
    window.addEventListener("keydown", (e) => this.onKey(e, true));
    window.addEventListener("keyup", (e) => this.onKey(e, false));
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));
    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement !== null;
      this.onPointerLockChange?.();
    });
    window.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
    window.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener("touchend", (e) => this.onTouchEnd(e), { passive: false });
    window.addEventListener("touchcancel", (e) => this.onTouchEnd(e), { passive: false });
  }

  private onTouchStart(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const x = t.clientX;
      const y = t.clientY;
      const w = window.innerWidth;
      // Ignore touches on mobile control buttons
      const target = e.target as HTMLElement | null;
      if (target?.closest?.(".mobile-controls")) continue;
      // Left half = movement pad zone (handled by UI), right half = look zone
      if (x > w / 2 && this.touchLookId === null) {
        this.touchLookId = t.identifier;
        this.touchLookStart = [x, y];
      }
    }
  }

  private onTouchMove(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.touchLookId && this.touchLookStart) {
        const dx = t.clientX - this.touchLookStart[0];
        const dy = t.clientY - this.touchLookStart[1];
        this.touchLookDelta[0] += dx * 0.3;
        this.touchLookDelta[1] += dy * 0.3;
        this.touchLookStart = [t.clientX, t.clientY];
      }
    }
  }

  private onTouchEnd(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.touchLookId) {
        this.touchLookId = null;
        this.touchLookStart = null;
      }
    }
  }

  setTouchAction(action: InputAction, active: boolean) {
    this.actions.set(action, active);
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
    const d: [number, number] = [
      this.lookDelta[0] + this.touchLookDelta[0],
      this.lookDelta[1] + this.touchLookDelta[1],
    ];
    this.lookDelta[0] = 0;
    this.lookDelta[1] = 0;
    this.touchLookDelta[0] = 0;
    this.touchLookDelta[1] = 0;
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
