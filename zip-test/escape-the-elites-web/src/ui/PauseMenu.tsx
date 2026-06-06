import { useState, type FC } from "react";

type Props = {
  open: boolean;
  onResume: () => void;
  onSaveSlot: (slot: string) => void;
  onLoadSlot: (slot: string) => void;
  onDeleteSlot: (slot: string) => void;
  onSettings: () => void;
  onQuit: () => void;
  slotStates: Record<string, boolean>;
};

const SLOTS = [
  { id: "AutoSave", label: "Auto Save" },
  { id: "ManualSave1", label: "Manual Slot 1" },
  { id: "ManualSave2", label: "Manual Slot 2" },
  { id: "ManualSave3", label: "Manual Slot 3" },
];

export const PauseMenu: FC<Props> = ({ open, onResume, onSaveSlot, onLoadSlot, onDeleteSlot, onSettings, onQuit, slotStates }) => {
  const [showSaves, setShowSaves] = useState(false);
  if (!open) return null;

  return (
    <div className="pause-overlay">
      <h2 className="pause-title">Paused</h2>
      {!showSaves ? (
        <div className="pause-buttons">
          <button className="ui-button" onClick={onResume}>Resume</button>
          <button className="ui-button secondary" onClick={() => setShowSaves(true)}>Save / Load</button>
          <button className="ui-button secondary" onClick={onSettings}>Settings</button>
          <button className="ui-button danger" onClick={onQuit}>Quit to Menu</button>
        </div>
      ) : (
        <div className="pause-slot-list">
          <button className="ui-button secondary" onClick={() => setShowSaves(false)}>&larr; Back</button>
          {SLOTS.map((slot) => (
            <div key={slot.id} className="pause-slot-row">
              <span className={`pause-slot-label ${slotStates[slot.id] ? "saved" : "empty"}`}>
                {slot.label} {slotStates[slot.id] ? "(saved)" : "(empty)"}
              </span>
              <button className="ui-button secondary pause-slot-btn-sm" onClick={() => onSaveSlot(slot.id)}>Save</button>
              <button className="ui-button secondary pause-slot-btn-sm" disabled={!slotStates[slot.id]} onClick={() => onLoadSlot(slot.id)}>Load</button>
              <button className="ui-button danger pause-slot-btn-sm" disabled={!slotStates[slot.id]} onClick={() => onDeleteSlot(slot.id)}>Del</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
