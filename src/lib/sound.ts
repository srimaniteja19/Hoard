/**
 * High-performance, zero-latency Web Audio sound synthesizer for HOARD
 * Generates tactile mechanical clicks, typewriter stamps, pops, and chimes
 * without downloading external audio files (0 KB network overhead).
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private ambienceEnabled = false;
  private ambienceNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private ambienceScratchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hoard_sfx_enabled");
      if (stored !== null) {
        this.enabled = stored === "true";
      }
      const storedAmbience = localStorage.getItem("hoard_ambience_enabled");
      if (storedAmbience !== null) {
        this.ambienceEnabled = storedAmbience === "true";
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== "undefined") {
      localStorage.setItem("hoard_sfx_enabled", String(val));
    }
  }

  public toggle(): boolean {
    const next = !this.enabled;
    this.setEnabled(next);
    if (next) {
      this.playClick();
    }
    return next;
  }

  public isAmbienceEnabled(): boolean {
    return this.ambienceEnabled;
  }

  public toggleAmbience(): boolean {
    const next = !this.ambienceEnabled;
    this.ambienceEnabled = next;
    if (typeof window !== "undefined") {
      localStorage.setItem("hoard_ambience_enabled", String(next));
    }
    if (next) {
      this.startAmbience();
    } else {
      this.stopAmbience();
    }
    return next;
  }

  /**
   * Loops a very quiet filtered-noise "paper rustle" bed and schedules
   * occasional synthesized pen-scratch ticks at randomized intervals.
   * Pure Web Audio synthesis — no audio assets, no network overhead.
   */
  public startAmbience() {
    if (!this.ambienceEnabled) return;
    const ctx = this.getContext();
    if (!ctx || this.ambienceNodes) return;

    const bufferSeconds = 4;
    const bufferSize = Math.floor(ctx.sampleRate * bufferSeconds);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      // Brownian-ish noise: integrate white noise for a soft "room paper" texture
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, ctx.currentTime);
    filter.Q.setValueAtTime(0.6, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 1.5);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    this.ambienceNodes = { source, gain };
    this.scheduleAmbienceScratch();
  }

  public stopAmbience() {
    if (this.ambienceScratchTimer) {
      clearTimeout(this.ambienceScratchTimer);
      this.ambienceScratchTimer = null;
    }
    if (this.ambienceNodes && this.ctx) {
      const { source, gain } = this.ambienceNodes;
      const t = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);
      setTimeout(() => {
        try {
          source.stop();
        } catch (_) {
          // already stopped
        }
      }, 450);
      this.ambienceNodes = null;
    }
  }

  private scheduleAmbienceScratch() {
    const delay = 8000 + Math.random() * 12000;
    this.ambienceScratchTimer = setTimeout(() => {
      if (this.ambienceEnabled && this.ambienceNodes) {
        this.playPenScratch();
      }
      this.scheduleAmbienceScratch();
    }, delay);
  }

  /**
   * Short filtered noise burst standing in for a pen scratching paper.
   * Independent of the tactile-click SFX toggle — part of the ambience bed.
   */
  private playPenScratch(volume = 0.05) {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const duration = 0.15 + Math.random() * 0.2;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(2200, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + duration);
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Crisp tactile mechanical switch click (Cherry MX style)
   */
  public playClick(volume = 0.35) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. High frequency mechanical snap
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.025);

    gain.gain.setValueAtTime(volume * 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.03);

    // 2. Micro noise tick
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.008);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "highpass";
      noiseFilter.frequency.setValueAtTime(3500, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(volume * 0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.008);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(t);
      noise.stop(t + 0.01);
    } catch (_) {
      // ignore
    }
  }

  /**
   * Satisfying punchy typewriter stamp / paper file thud
   */
  public playFileIt(volume = 0.5) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // Bass body thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);

    // Mechanical snap on top
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();

    clickOsc.type = "square";
    clickOsc.frequency.setValueAtTime(900, t);
    clickOsc.frequency.exponentialRampToValueAtTime(200, t + 0.02);

    clickGain.gain.setValueAtTime(volume * 0.4, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);

    clickOsc.start(t);
    clickOsc.stop(t + 0.025);
  }

  /**
   * Ascending bright chime when promoted to TIL or Todo
   */
  public playPromote(volume = 0.4) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(volume * 0.7, noteTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
    });
  }

  /**
   * Playful bubble pop for tag and pill clicks
   */
  public playPop(volume = 0.3) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(950, t + 0.04);

    gain.gain.setValueAtTime(volume * 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.045);
  }

  /**
   * Crisp double-click tick for copy action
   */
  public playCopy(volume = 0.35) {
    if (!this.enabled) return;
    this.playClick(volume);
    setTimeout(() => {
      this.playClick(volume * 0.85);
    }, 60);
  }

  /**
   * Low drop crumble when burying/deleting a scrap
   */
  public playBury(volume = 0.35) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, t);

    gain.gain.setValueAtTime(volume * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * Snappy toggle click for drawer open/close
   */
  public playToggle(isOpen = true, volume = 0.3) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const startFreq = isOpen ? 400 : 700;
    const endFreq = isOpen ? 800 : 350;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.03);

    gain.gain.setValueAtTime(volume * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Tactile pushpin tack sound for pinning/unpinning scratch notes
   */
  public playPin(isPinned = true, volume = 0.4) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // High metallic ping
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(isPinned ? 2400 : 1200, t);
    osc1.frequency.exponentialRampToValueAtTime(isPinned ? 3600 : 600, t + 0.04);
    gain1.gain.setValueAtTime(volume * 0.7, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.06);

    // Low corkboard / tack thud
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(isPinned ? 160 : 220, t);
    osc2.frequency.exponentialRampToValueAtTime(60, t + 0.05);
    gain2.gain.setValueAtTime(volume * 0.9, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.07);
  }
}

export const sound = new SoundEngine();

export const playSound = {
  click: (vol?: number) => sound.playClick(vol),
  fileIt: (vol?: number) => sound.playFileIt(vol),
  promote: (vol?: number) => sound.playPromote(vol),
  pop: (vol?: number) => sound.playPop(vol),
  copy: (vol?: number) => sound.playCopy(vol),
  bury: (vol?: number) => sound.playBury(vol),
  toggle: (isOpen?: boolean, vol?: number) => sound.playToggle(isOpen, vol),
  pin: (isPinned?: boolean, vol?: number) => sound.playPin(isPinned, vol),
};

export const ambience = {
  isEnabled: () => sound.isAmbienceEnabled(),
  toggle: () => sound.toggleAmbience(),
  start: () => sound.startAmbience(),
  stop: () => sound.stopAmbience(),
};
