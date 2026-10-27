// Audio sintetizado con WebAudio: efectos originales y música chiptune generativa (sin archivos externos).
import { S } from '../state';

type Mood = 'town' | 'field' | 'forest' | 'cave' | 'night' | 'volcano' | 'snow' | 'boss' | 'spooky' | 'menu';

const SCALES: Record<Mood, { root: number; scale: number[]; bpm: number; lead: OscillatorType; bass: OscillatorType }> = {
  menu: { root: 60, scale: [0, 2, 4, 7, 9], bpm: 100, lead: 'square', bass: 'triangle' },
  town: { root: 62, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 96, lead: 'square', bass: 'triangle' },
  field: { root: 60, scale: [0, 2, 4, 7, 9], bpm: 118, lead: 'square', bass: 'triangle' },
  forest: { root: 57, scale: [0, 2, 3, 5, 7, 10], bpm: 104, lead: 'triangle', bass: 'triangle' },
  cave: { root: 52, scale: [0, 3, 5, 7, 10], bpm: 84, lead: 'triangle', bass: 'sine' },
  night: { root: 57, scale: [0, 3, 5, 7, 10], bpm: 80, lead: 'triangle', bass: 'sine' },
  volcano: { root: 55, scale: [0, 1, 4, 5, 7, 8, 10], bpm: 128, lead: 'sawtooth', bass: 'square' },
  snow: { root: 64, scale: [0, 2, 4, 7, 9], bpm: 90, lead: 'sine', bass: 'triangle' },
  boss: { root: 50, scale: [0, 1, 3, 5, 7, 8, 10], bpm: 150, lead: 'sawtooth', bass: 'square' },
  spooky: { root: 53, scale: [0, 1, 3, 6, 7, 10], bpm: 78, lead: 'triangle', bass: 'sine' },
};

class AudioSys {
  ctx: AudioContext | null = null;
  master!: GainNode; sfx!: GainNode; music!: GainNode;
  noiseBuf!: AudioBuffer;
  mood: Mood = 'menu';
  nextNoteT = 0; step = 0; pattern: number[] = []; bassPat: number[] = [];
  timer: any = null;
  lastPlay = new Map<string, number>();

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.music = c.createGain(); this.music.connect(this.master);
    this.applyVolumes();
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.setMood(this.mood, true);
    this.timer = setInterval(() => this.schedule(), 60);
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.sfx.gain.value = S.settings.sfx * 0.55;
    this.music.gain.value = S.settings.music * 0.22;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, t0 = 0, slide = 0, dest?: AudioNode) {
    const c = this.ctx!; const t = c.currentTime + t0;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.02);
  }
  private noise(dur: number, vol: number, t0 = 0, filter: BiquadFilterType = 'lowpass', freq = 2000, q = 1) {
    const c = this.ctx!; const t = c.currentTime + t0;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t); s.stop(t + dur + 0.02);
  }

  play(name: string, opt: { vol?: number; pitch?: number } = {}) {
    if (!this.ctx || S.settings.sfx <= 0) return;
    const now = performance.now();
    const last = this.lastPlay.get(name) || 0;
    if (now - last < 45) return; // evita saturar
    this.lastPlay.set(name, now);
    const v = opt.vol ?? 1, p = opt.pitch ?? 1;
    switch (name) {
      case 'hit': this.noise(0.08, 0.35 * v, 0, 'lowpass', 1800); this.tone(140 * p, 0.09, 'sine', 0.35 * v, 0, 0.5); break;
      case 'crit': this.noise(0.14, 0.45 * v, 0, 'lowpass', 3000); this.tone(220 * p, 0.16, 'square', 0.18 * v, 0, 0.4); this.tone(880, 0.06, 'square', 0.08 * v, 0.02); break;
      case 'fire': this.noise(0.22, 0.3 * v, 0, 'bandpass', 900, 0.8); this.tone(180, 0.2, 'sawtooth', 0.06 * v, 0, 0.6); break;
      case 'water': this.tone(500 * p, 0.12, 'sine', 0.2 * v, 0, 1.8); this.tone(700 * p, 0.1, 'sine', 0.12 * v, 0.06, 1.6); break;
      case 'electric': for (let i = 0; i < 4; i++) this.tone(900 + Math.random() * 1200, 0.03, 'square', 0.07 * v, i * 0.025); break;
      case 'grass': this.noise(0.1, 0.22 * v, 0, 'highpass', 3000); this.tone(660, 0.08, 'triangle', 0.08 * v, 0, 1.3); break;
      case 'psychic': this.tone(400, 0.3, 'sine', 0.15 * v, 0, 2.2); this.tone(410, 0.3, 'sine', 0.1 * v, 0, 2.1); break;
      case 'ghost': this.tone(300, 0.35, 'sawtooth', 0.07 * v, 0, 0.4); this.tone(305, 0.35, 'triangle', 0.1 * v, 0, 0.42); break;
      case 'rock': this.noise(0.16, 0.4 * v, 0, 'lowpass', 600); this.tone(90, 0.15, 'sine', 0.3 * v, 0, 0.6); break;
      case 'ice': this.tone(1400, 0.12, 'triangle', 0.1 * v, 0, 1.2); this.noise(0.12, 0.15 * v, 0, 'highpass', 5000); break;
      case 'dragon': this.tone(160, 0.3, 'sawtooth', 0.12 * v, 0, 1.6); this.noise(0.25, 0.2 * v, 0, 'bandpass', 600); break;
      case 'boom': this.noise(0.5, 0.6 * v, 0, 'lowpass', 500); this.tone(70, 0.45, 'sine', 0.45 * v, 0, 0.4); break;
      case 'throw': this.noise(0.18, 0.18 * v, 0, 'bandpass', 2400, 2); this.tone(500, 0.15, 'triangle', 0.08 * v, 0, 2); break;
      case 'shake': this.tone(320, 0.05, 'square', 0.1 * v); this.noise(0.04, 0.15 * v, 0, 'highpass', 2000); break;
      case 'catch': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'square', 0.1 * v, i * 0.09)); break;
      case 'escape': this.tone(600, 0.2, 'square', 0.1 * v, 0, 0.3); this.noise(0.1, 0.2 * v, 0.02, 'highpass', 1500); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'square', 0.09 * v, i * 0.07)); this.tone(1318, 0.3, 'square', 0.08 * v, 0.3); break;
      case 'tlevel': [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.16, 'square', 0.1 * v, i * 0.08)); break;
      case 'evolve': for (let i = 0; i < 16; i++) this.tone(300 + i * 60, 0.12, 'triangle', 0.08 * v, i * 0.11); break;
      case 'evodone': [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.25, 'square', 0.09 * v, i * 0.1)); break;
      case 'chest': [880, 1108, 1318, 1760].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.12 * v, i * 0.05)); break;
      case 'coin': this.tone(988, 0.06, 'square', 0.08 * v); this.tone(1318, 0.14, 'square', 0.08 * v, 0.06); break;
      case 'ui': this.tone(660, 0.04, 'square', 0.06 * v); break;
      case 'uiopen': this.tone(520, 0.05, 'square', 0.06 * v); this.tone(780, 0.06, 'square', 0.06 * v, 0.04); break;
      case 'error': this.tone(220, 0.12, 'square', 0.08 * v); this.tone(180, 0.15, 'square', 0.08 * v, 0.1); break;
      case 'boss': this.tone(60, 1.2, 'sawtooth', 0.25 * v, 0, 0.7); this.noise(1, 0.3 * v, 0, 'lowpass', 300); break;
      case 'shiny': [1568, 2093, 2637, 3136].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.1 * v, i * 0.06)); break;
      case 'faint': this.tone(500, 0.4, 'square', 0.07 * v, 0, 0.3); break;
      case 'heal': [523, 659, 784].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.12 * v, i * 0.08)); break;
      case 'dash': this.noise(0.15, 0.25 * v, 0, 'bandpass', 1600, 1.5); break;
      case 'warn': this.tone(880, 0.08, 'square', 0.06 * v); this.tone(660, 0.1, 'square', 0.06 * v, 0.1); break;
      case 'quest': [659, 784, 988, 1318].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.12 * v, i * 0.08)); break;
      case 'event': [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.18, 'square', 0.08 * v, i * 0.12)); break;
      case 'step': this.noise(0.03, 0.05 * v, 0, 'lowpass', 900); break;
      case 'fight': this.noise(0.08, 0.4 * v, 0, 'lowpass', 1500); this.tone(120, 0.1, 'sawtooth', 0.22 * v, 0, 0.5); break;
      case 'wind': this.noise(0.14, 0.25 * v, 0, 'bandpass', 2400, 1.8); this.tone(480, 0.12, 'sine', 0.12 * v, 0, 1.8); break;
      case 'steel': this.tone(1100, 0.1, 'square', 0.12 * v); this.tone(740, 0.14, 'sawtooth', 0.08 * v); this.noise(0.06, 0.22 * v, 0, 'highpass', 4500); break;
      case 'victory': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.16, 'square', 0.11 * v, i * 0.09)); break;
      case 'sparkle': [1760, 2200, 2640, 3520].forEach((f, i) => this.tone(f, 0.1, 'sine', 0.1 * v, i * 0.05)); break;
      case 'statup': [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.1 * v, i * 0.07)); break;
      case 'statdown': [659, 554, 440, 370].forEach((f, i) => this.tone(f, 0.14, 'sawtooth', 0.08 * v, i * 0.08)); break;
    }
  }

  playType(type: string, crit = false) {
    const map: Record<string, string> = {
      fire: 'fire', water: 'water', electric: 'electric', grass: 'grass', bug: 'grass',
      psychic: 'psychic', ghost: 'ghost', dark: 'ghost', rock: 'rock', ground: 'rock',
      ice: 'ice', dragon: 'dragon', steel: 'steel', fairy: 'psychic', poison: 'grass',
      fighting: 'fight', flying: 'wind', normal: 'hit',
    };
    this.play(crit ? 'crit' : (map[type] || 'hit'), { vol: 0.7 });
  }

  // ---------------- música
  setMood(m: Mood, force = false) {
    if (m === this.mood && !force) return;
    this.mood = m;
    // patrón generativo de 32 pasos (se repite)
    const sc = SCALES[m];
    let deg = 0;
    this.pattern = [];
    for (let i = 0; i < 32; i++) {
      if (i % 2 === 1 && Math.random() < 0.45) { this.pattern.push(-1); continue; }
      deg = Math.max(-2, Math.min(9, deg + Math.floor(Math.random() * 5) - 2));
      this.pattern.push(i % 8 === 0 ? 0 : deg);
    }
    const prog = [0, 3, 4, 0, 5, 3, 4, 4].map(d => d % sc.scale.length);
    this.bassPat = prog;
    this.step = 0;
    if (this.ctx) this.nextNoteT = this.ctx.currentTime + 0.1;
  }

  private midi(n: number) { return 440 * Math.pow(2, (n - 69) / 12); }

  private schedule() {
    if (!this.ctx || S.settings.music <= 0 || document.hidden) return;
    const sc = SCALES[this.mood];
    const stepDur = 60 / sc.bpm / 2;
    while (this.nextNoteT < this.ctx.currentTime + 0.25) {
      const t0 = this.nextNoteT - this.ctx.currentTime;
      const i = this.step % 32;
      const d = this.pattern[i];
      if (d >= 0 && t0 >= 0) {
        const oct = Math.floor(d / sc.scale.length), deg = ((d % sc.scale.length) + sc.scale.length) % sc.scale.length;
        const note = sc.root + 12 + sc.scale[deg] + oct * 12;
        this.tone(this.midi(note), stepDur * 0.9, sc.lead, 0.07, t0, 0, this.music);
      }
      if (i % 4 === 0 && t0 >= 0) {
        const b = this.bassPat[Math.floor(this.step / 4) % this.bassPat.length];
        this.tone(this.midi(sc.root - 12 + sc.scale[b]), stepDur * 3.6, sc.bass, 0.12, t0, 0, this.music);
      }
      if (this.mood === 'boss' || this.mood === 'volcano' || this.mood === 'field') {
        if (i % 2 === 0 && t0 >= 0) {
          const c = this.ctx!; const t = c.currentTime + t0;
          const s = c.createBufferSource(); s.buffer = this.noiseBuf;
          const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
          const g = c.createGain(); g.gain.setValueAtTime(i % 8 === 0 ? 0.05 : 0.025, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
          s.connect(f); f.connect(g); g.connect(this.music); s.start(t); s.stop(t + 0.06);
        }
      }
      this.nextNoteT += stepDur;
      this.step++;
    }
  }
}

export const audio = new AudioSys();
export type { Mood };
