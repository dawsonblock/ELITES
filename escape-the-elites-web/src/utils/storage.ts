import type { SaveData } from "../types/save";

const SAVE_KEY = "ete_save_v1";
const SETTINGS_KEY = "ete_settings_v1";

export function loadSave(slot: string): SaveData | null {
  try {
    const raw = localStorage.getItem(`${SAVE_KEY}_${slot}`);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

export function saveGame(slot: string, data: SaveData): void {
  try {
    localStorage.setItem(`${SAVE_KEY}_${slot}`, JSON.stringify(data));
  } catch {
    // Storage full or blocked
  }
}

export function listSaveSlots(): string[] {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(SAVE_KEY))
      .map((k) => k.replace(`${SAVE_KEY}_`, ""));
  } catch {
    return [];
  }
}

export function deleteSave(slot: string): void {
  localStorage.removeItem(`${SAVE_KEY}_${slot}`);
}

export function loadSettings(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSettings(settings: Record<string, unknown>): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
