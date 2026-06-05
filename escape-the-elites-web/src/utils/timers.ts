export class Timer {
  private elapsed = 0;
  private running = false;
  private duration = 0;
  private onComplete?: () => void;

  start(durationMs: number, onComplete?: () => void): void {
    this.duration = durationMs;
    this.elapsed = 0;
    this.running = true;
    this.onComplete = onComplete;
  }

  update(dtMs: number): void {
    if (!this.running) return;
    this.elapsed += dtMs;
    if (this.elapsed >= this.duration) {
      this.running = false;
      this.onComplete?.();
    }
  }

  get progress(): number {
    if (this.duration === 0) return 0;
    return clamp(this.elapsed / this.duration, 0, 1);
  }

  get remainingMs(): number {
    return Math.max(0, this.duration - this.elapsed);
  }

  stop(): void {
    this.running = false;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
