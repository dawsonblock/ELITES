import { inputManager } from "../game/InputManager";
import type { InputAction } from "../types/input";

function TouchButton({ label, action, style }: { label: string; action: InputAction; style?: React.CSSProperties }) {
  return (
    <button
      className="mobile-btn"
      style={style}
      onTouchStart={(e) => { e.preventDefault(); inputManager.setTouchAction(action, true); }}
      onTouchEnd={(e) => { e.preventDefault(); inputManager.setTouchAction(action, false); }}
      onMouseDown={(e) => { e.preventDefault(); inputManager.setTouchAction(action, true); }}
      onMouseUp={(e) => { e.preventDefault(); inputManager.setTouchAction(action, false); }}
      onMouseLeave={(e) => { e.preventDefault(); inputManager.setTouchAction(action, false); }}
    >
      {label}
    </button>
  );
}

export function MobileControls() {
  const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  if (!isTouch) return null;

  return (
    <div className="mobile-controls">
      {/* Movement pad - left side */}
      <div className="mobile-pad">
        <TouchButton label="W" action="moveForward" style={{ gridArea: "w" }} />
        <TouchButton label="A" action="moveLeft" style={{ gridArea: "a" }} />
        <TouchButton label="S" action="moveBackward" style={{ gridArea: "s" }} />
        <TouchButton label="D" action="moveRight" style={{ gridArea: "d" }} />
      </div>

      {/* Action buttons - right side */}
      <div className="mobile-actions">
        <TouchButton label="E" action="interact" />
        <TouchButton label="F" action="flashlight" />
        <TouchButton label="C" action="crouch" />
        <TouchButton label="Run" action="sprint" />
      </div>
    </div>
  );
}
