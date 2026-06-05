import type { EvidenceItem } from "../types/evidence";
import type { Objective } from "../types/objective";
import type { DetectionState, AlertState } from "../types/stealth";

class GameStateManager {
  private _evidence: Map<string, EvidenceItem> = new Map();
  private _objectives: Map<string, Objective> = new Map();
  private _collectedEvidence: Set<string> = new Set();
  private _completedObjectives: Set<string> = new Set();
  private _activeObjectives: Set<string> = new Set();
  private _unlockedDoors: Set<string> = new Set();
  private _disabledCameras: Set<string> = new Set();
  private _detection: DetectionState = "hidden";
  private _alert: AlertState = "normal";
  private _detectionValue = 0;
  private _sceneId = "dock";
  private _paused = false;
  private _terminalOpen = false;
  private _evidenceBoardOpen = false;
  private _lockdown = false;
  private _playtimeSeconds = 0;
  private _settings: Record<string, unknown> = {};
  private _endingFlags: Record<string, boolean> = {};
  private _unlockedTerminals: Set<string> = new Set();

  get sceneId() { return this._sceneId; }
  set sceneId(v: string) { this._sceneId = v; }

  get paused() { return this._paused; }
  set paused(v: boolean) { this._paused = v; }

  get terminalOpen() { return this._terminalOpen; }
  set terminalOpen(v: boolean) { this._terminalOpen = v; }

  get evidenceBoardOpen() { return this._evidenceBoardOpen; }
  set evidenceBoardOpen(v: boolean) { this._evidenceBoardOpen = v; }

  get lockdown() { return this._lockdown; }
  set lockdown(v: boolean) { this._lockdown = v; }

  get detection() { return this._detection; }
  get alert() { return this._alert; }
  get detectionValue() { return this._detectionValue; }

  get playtimeSeconds() { return this._playtimeSeconds; }
  set playtimeSeconds(v: number) { this._playtimeSeconds = v; }

  setDetection(value: number, state: DetectionState) {
    this._detectionValue = value;
    this._detection = state;
  }

  setAlert(state: AlertState) {
    this._alert = state;
  }

  registerEvidence(items: EvidenceItem[]) {
    items.forEach((i) => this._evidence.set(i.id, i));
  }

  getEvidence(id: string): EvidenceItem | undefined {
    return this._evidence.get(id);
  }

  allEvidence(): EvidenceItem[] {
    return Array.from(this._evidence.values());
  }

  collectEvidence(id: string): boolean {
    if (this._collectedEvidence.has(id)) return false;
    this._collectedEvidence.add(id);
    const item = this._evidence.get(id);
    if (item) item.discovered = true;
    return true;
  }

  hasEvidence(id: string): boolean {
    return this._collectedEvidence.has(id);
  }

  collectedEvidence(): string[] {
    return Array.from(this._collectedEvidence);
  }

  registerObjectives(objs: Objective[]) {
    objs.forEach((o) => this._objectives.set(o.id, o));
  }

  getObjective(id: string): Objective | undefined {
    return this._objectives.get(id);
  }

  allObjectives(): Objective[] {
    return Array.from(this._objectives.values());
  }

  completeObjective(id: string): boolean {
    const obj = this._objectives.get(id);
    if (!obj || obj.status === "completed") return false;
    obj.status = "completed";
    this._completedObjectives.add(id);
    this._activeObjectives.delete(id);
    return true;
  }

  activateObjective(id: string): boolean {
    const obj = this._objectives.get(id);
    if (!obj || obj.status !== "locked") return false;
    obj.status = "active";
    this._activeObjectives.add(id);
    return true;
  }

  activeObjectives(): string[] {
    return Array.from(this._activeObjectives);
  }

  completedObjectives(): string[] {
    return Array.from(this._completedObjectives);
  }

  unlockDoor(id: string) {
    this._unlockedDoors.add(id);
  }

  isDoorUnlocked(id: string): boolean {
    return this._unlockedDoors.has(id);
  }

  disableCamera(id: string) {
    this._disabledCameras.add(id);
  }

  isCameraDisabled(id: string): boolean {
    return this._disabledCameras.has(id);
  }

  getSettings(): Record<string, unknown> {
    return { ...this._settings };
  }

  setSettings(s: Record<string, unknown>) {
    this._settings = { ...this._settings, ...s };
  }

  get endingFlags(): Record<string, boolean> {
    return this._endingFlags;
  }

  setEndingFlag(key: string, value: boolean) {
    this._endingFlags[key] = value;
  }

  unlockTerminal(id: string) {
    this._unlockedTerminals.add(id);
  }

  isTerminalUnlocked(id: string): boolean {
    return this._unlockedTerminals.has(id);
  }

  resetProgress() {
    this._collectedEvidence.clear();
    this._completedObjectives.clear();
    this._activeObjectives.clear();
    this._unlockedDoors.clear();
    this._disabledCameras.clear();
    this._unlockedTerminals.clear();
    this._detectionValue = 0;
    this._detection = "hidden";
    this._alert = "normal";
    this._lockdown = false;
    this._playtimeSeconds = 0;
    this._endingFlags = {};
    this._settings = {};
  }
}

export const gameState = new GameStateManager();
