// Web Audio API-based sound engine — no external dependencies
// Generates procedural sound effects and manages ambient layers

export type SoundCategory = "ambient" | "sfx" | "ui" | "alarm" | "footstep";

class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private categoryGains: Map<SoundCategory, GainNode> = new Map();
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;

  private masterVolume = 0.8;
  private sfxVolume = 1.0;
  private ambientVolume = 0.6;
  private uiVolume = 0.7;
  private alarmVolume = 1.0;

  init() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      for (const cat of ["ambient", "sfx", "ui", "alarm", "footstep"] as SoundCategory[]) {
        const g = this.ctx.createGain();
        g.connect(this.masterGain);
        this.categoryGains.set(cat, g);
      }
    } catch {
      // Audio not supported
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setVolumes(master: number, sfx: number, ambient: number, ui: number, alarm: number) {
    this.masterVolume = master;
    this.sfxVolume = sfx;
    this.ambientVolume = ambient;
    this.uiVolume = ui;
    this.alarmVolume = alarm;
    if (this.masterGain) this.masterGain.gain.value = master;
    this.updateCategoryGains();
  }

  private updateCategoryGains() {
    const map: Record<SoundCategory, number> = {
      ambient: this.ambientVolume,
      sfx: this.sfxVolume,
      ui: this.uiVolume,
      alarm: this.alarmVolume,
      footstep: this.sfxVolume,
    };
    for (const [cat, gain] of this.categoryGains) {
      gain.gain.value = map[cat] ?? 1;
    }
  }

  // === Procedural SFX ===
  playTone(freq: number, duration: number, type: OscillatorType = "sine", category: SoundCategory = "sfx", vol = 0.3) {
    if (!this.ctx || !this.categoryGains.has(category)) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.categoryGains.get(category)!);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playNoise(duration: number, category: SoundCategory = "sfx", vol = 0.3, filterFreq = 1000) {
    if (!this.ctx || !this.categoryGains.has(category)) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.categoryGains.get(category)!);
    source.start();
    source.stop(this.ctx.currentTime + duration);
  }

  playBeep(freq = 880, duration = 0.1, category: SoundCategory = "ui") {
    this.playTone(freq, duration, "square", category, 0.15);
  }

  playClick(category: SoundCategory = "ui") {
    this.playNoise(0.05, category, 0.2, 3000);
  }

  playFootstep(surface: "concrete" | "metal" | "wood" = "concrete") {
    if (!this.ctx) return;
    const freqs = surface === "metal" ? [200, 400] : surface === "wood" ? [150, 300] : [100, 250];
    const vol = surface === "metal" ? 0.15 : 0.1;
    this.playNoise(0.08, "footstep", vol, freqs[1]);
    setTimeout(() => this.playTone(freqs[0], 0.08, "sine", "footstep", vol * 0.5), 20);
  }

  playDoorOpen() {
    this.playNoise(0.4, "sfx", 0.2, 600);
    this.playTone(80, 0.4, "sawtooth", "sfx", 0.08);
  }

  playDoorLocked() {
    this.playTone(150, 0.15, "square", "sfx", 0.2);
    setTimeout(() => this.playTone(120, 0.15, "square", "sfx", 0.2), 80);
  }

  playEvidenceCollect() {
    this.playTone(880, 0.08, "sine", "ui", 0.2);
    setTimeout(() => this.playTone(1100, 0.15, "sine", "ui", 0.15), 80);
  }

  playCameraSweep() {
    this.playNoise(0.15, "sfx", 0.04, 800);
  }

  playDetectionBeep(state: "watched" | "suspicious" | "critical" | "detected") {
    const freqs = { watched: 400, suspicious: 550, critical: 750, detected: 1000 };
    const rate = { watched: 1.5, suspicious: 0.8, critical: 0.35, detected: 0.15 };
    this.playTone(freqs[state], 0.08, "square", "alarm", 0.12);
    // Schedule repeating beeps
    if (state !== "watched" && this.ctx) {
      for (let i = 1; i < 3; i++) {
        const t = this.ctx.currentTime + rate[state] * i;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freqs[state], t);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(g);
        g.connect(this.categoryGains.get("alarm")!);
        osc.start(t);
        osc.stop(t + 0.08);
      }
    }
  }

  playLockdownAlarm() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      const t = now + i * 0.25;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.linearRampToValueAtTime(400, t + 0.12);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g);
      g.connect(this.categoryGains.get("alarm")!);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  }

  playTerminalBoot() {
    this.playNoise(0.3, "ui", 0.1, 2000);
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.playTone(200 + i * 100, 0.05, "square", "ui", 0.05), i * 40);
    }
  }

  playTerminalType() {
    this.playNoise(0.03, "ui", 0.08, 4000);
  }

  playBroadcastUpload() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 20; i++) {
      const t = now + i * 0.1;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440 + Math.sin(i * 0.5) * 200, t);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(g);
      g.connect(this.categoryGains.get("ui")!);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  // === Noise Events ===
  // Emits a noise event from a world position with given radius and strength.
  // Guards/cameras can consume this via the NOISE_EMITTED game event.
  // surface multipliers: concrete=1.0, metal=1.6, wood=1.1, carpet=0.5, water=1.8
  // stance multipliers: walk=1.0, sprint=2.5, crouch=0.25
  emitNoise(_position: { x: number; y: number; z: number }, _radius: number, strength: number) {
    if (!this.ctx) return;
    // Audible feedback: faint low-frequency thump scaled by strength
    if (strength > 0.4) {
      const vol = Math.min(strength * 0.04, 0.08);
      this.playNoise(0.06, "footstep", vol, 200 + strength * 80);
    }
  }

  playGuardAlert(state: "suspicious" | "investigate" | "alert") {
    if (state === "suspicious") {
      // Two rising tones — guard notices something
      this.playTone(320, 0.12, "square", "alarm", 0.09);
      setTimeout(() => this.playTone(420, 0.1, "square", "alarm", 0.07), 150);
    } else if (state === "investigate") {
      // Three rapid ticks — guard is moving to investigate
      for (let i = 0; i < 3; i++) {
        setTimeout(() => this.playTone(500, 0.06, "square", "alarm", 0.1), i * 100);
      }
    } else {
      // Full alert — rapid descending pulses
      for (let i = 0; i < 5; i++) {
        setTimeout(() => this.playTone(800 - i * 60, 0.08, "sawtooth", "alarm", 0.14), i * 80);
      }
    }
  }

  // === Ambient Layers ===
  startAmbient(type: "storm" | "indoor" | "bunker" | "tower") {
    if (!this.ctx) return;
    this.stopAmbient();
    const duration = 4;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < bufferSize; i++) {
        let sample = Math.random() * 2 - 1;
        if (type === "storm") {
          // Wind + distant thunder rumble
          sample *= 0.3;
          sample += Math.sin(i * 0.001) * 0.1;
          sample += Math.sin(i * 0.0003 + ch) * 0.05;
        } else if (type === "bunker") {
          // Low hum + server fans
          sample *= 0.15;
          sample += Math.sin(i * 0.005) * 0.03;
          sample += Math.sin(i * 0.01) * 0.02;
        } else if (type === "tower") {
          // Wind on metal
          sample *= 0.4;
          sample += Math.sin(i * 0.002) * 0.08;
        } else {
          // Generic indoor hum
          sample *= 0.2;
          sample += Math.sin(i * 0.003) * 0.04;
        }
        data[i] = sample;
      }
    }

    this.ambientSource = this.ctx.createBufferSource();
    this.ambientSource.buffer = buffer;
    this.ambientSource.loop = true;
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = this.ambientVolume * 0.5;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = type === "bunker" ? 400 : type === "storm" ? 800 : 600;

    this.ambientSource.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.categoryGains.get("ambient")!);
    this.ambientSource.start();
  }

  stopAmbient() {
    if (this.ambientSource) {
      try { this.ambientSource.stop(); } catch { /* */ }
      this.ambientSource = null;
    }
  }

  fadeAmbient(toVolume: number, duration = 1) {
    if (!this.ctx || !this.ambientGain) return;
    this.ambientGain.gain.linearRampToValueAtTime(toVolume, this.ctx.currentTime + duration);
  }

  dispose() {
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioSystem = new AudioSystem();
