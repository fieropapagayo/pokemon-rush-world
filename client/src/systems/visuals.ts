// Capa visual ambiental: gradación de color por hora y clima, viñeta, sombras de nubes, rayos de sol,
// luces de color nocturnas, destellos en el agua y huellas en arena/nieve. Se desactiva en Ajustes.
import Phaser from 'phaser';
import { DAY_LENGTH_MS, T, TILE } from '../../../shared/constants';
import { ZONES } from '../../../shared/zones';
import { weatherAt } from '../../../shared/weather';
import { S } from '../state';
import { net } from '../networking/net';

const PX = TILE;
type Grade = { r: number; g: number; b: number; s: number; c: number; v: number };
const KEYS = ['r', 'g', 'b', 's', 'c', 'v'] as const;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const hourNow = () => ((net.serverNow() % DAY_LENGTH_MS) / DAY_LENGTH_MS) * 24;

export class Visuals {
  cm: any = null;
  vig: any = null;
  cur: Grade = { r: 1, g: 1, b: 1, s: 0, c: 0, v: 0.16 };
  clouds: { img: Phaser.GameObjects.Image; x: number; y: number; sx: number }[] = [];
  cloudsReady = false; cloudA = 0;
  rays: Phaser.GameObjects.Image[] = []; rayA = 0;
  glows: Phaser.GameObjects.Image[] = []; glowN = 0;
  feet: Phaser.GameObjects.Image[] = []; footI = 0; footSide = 0;
  gradeAt = 0;

  constructor(private sc: any) {
    const scene = sc as Phaser.Scene;
    if (!scene.textures.exists('ray')) {
      const c = document.createElement('canvas'); c.width = 32; c.height = 192;
      const g = c.getContext('2d')!;
      const hz = g.createLinearGradient(0, 0, 32, 0);
      hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(0.5, 'rgba(255,255,255,1)'); hz.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = hz; g.fillRect(0, 0, 32, 192);
      g.globalCompositeOperation = 'destination-in';
      const vt = g.createLinearGradient(0, 0, 0, 192);
      vt.addColorStop(0, 'rgba(0,0,0,0)'); vt.addColorStop(0.3, 'rgba(0,0,0,1)'); vt.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = vt; g.fillRect(0, 0, 32, 192);
      scene.textures.addCanvas('ray', c);
    }
    for (let i = 0; i < 6; i++) this.clouds.push({ img: scene.add.image(0, 0, 'glow').setTint(0x0c1a24).setDepth(19980).setVisible(false), x: 0, y: 0, sx: 2 });
    for (let i = 0; i < 4; i++) this.rays.push(scene.add.image(0, 0, 'ray').setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff2c0).setDepth(19985).setRotation(-0.42).setVisible(false));
    for (let i = 0; i < 28; i++) this.feet.push(scene.add.image(0, 0, 'dot').setDepth(-31).setVisible(false));
    this.applyPost();
  }

  get on() { return S.settings.vfx !== false; }

  /** Gradación de color + viñeta como post-proceso de cámara (solo WebGL). */
  applyPost() {
    const scene = this.sc as Phaser.Scene;
    if (scene.game.renderer.type !== Phaser.WEBGL) return;
    const cam = scene.cameras.main as any;
    if (this.on && !this.cm) {
      this.cm = cam.postFX.addColorMatrix();
      this.vig = cam.postFX.addVignette(0.5, 0.5, 0.95, 0.16);
    } else if (!this.on && this.cm) {
      cam.postFX.remove(this.cm); if (this.vig) cam.postFX.remove(this.vig);
      this.cm = null; this.vig = null;
    }
  }

  target(): Grade {
    const z = ZONES[this.sc.zoneId] || ZONES[0];
    if (z.kind === 'dungeon') return { r: 0.94, g: 0.96, b: 1.06, s: -0.22, c: 0.08, v: 0.3 };
    if (z.id === 21) return { r: 1.04, g: 1.0, b: 0.95, s: 0.06, c: 0.03, v: 0.24 };
    const h = hourNow();
    const g: Grade = { r: 1.02, g: 1.01, b: 0.99, s: 0.12, c: 0.05, v: 0.16 };
    const gold = h >= 5 && h < 7.5 ? 1 - Math.abs(h - 6.25) / 1.25 : h >= 16.5 && h < 19.5 ? 1 - Math.abs(h - 18) / 1.5 : 0;
    const night = h >= 19.5 || h < 4.5 ? 1 : h >= 18.5 ? h - 18.5 : h < 6 ? (6 - h) / 1.5 : 0;
    g.r += gold * 0.1 - night * 0.12; g.g -= gold * 0.01 + night * 0.05; g.b += night * 0.12 - gold * 0.14;
    g.s += gold * 0.1 - night * 0.32; g.v += night * 0.1;
    const w = weatherAt(z.id, net.serverNow(), z.kind);
    if (w === 'rain' || w === 'storm') { g.r -= 0.06; g.g -= 0.03; g.b += 0.03; g.s -= 0.22; g.c += 0.03; g.v += 0.06; }
    else if (w === 'fog') { g.s -= 0.3; g.c -= 0.08; g.b += 0.02; }
    else if (w === 'snow') { g.b += 0.06; g.r -= 0.02; g.s -= 0.08; }
    else if (w === 'sun') { g.r += 0.04; g.b -= 0.05; g.s += 0.1; }
    else if (w === 'ash') { g.r += 0.08; g.g -= 0.03; g.b -= 0.1; g.s -= 0.12; }
    return g;
  }

  update(time: number, dt: number) {
    const sc = this.sc;
    const wv = sc.cameras.main.worldView as Phaser.Geom.Rectangle;
    const z = ZONES[sc.zoneId] || ZONES[0];
    const outdoor = z.kind !== 'dungeon' && z.id !== 21;
    const h = hourNow();
    const day = h >= 6.5 && h < 18;
    const w = outdoor ? weatherAt(z.id, net.serverNow(), z.kind) : 'clear';

    // gradación suave (interpola hacia el objetivo para transiciones de hora/clima/zona sin saltos)
    if (this.cm) {
      const t = this.target(), c = this.cur, k = 1 - Math.exp(-dt * 1.6);
      for (const key of KEYS) c[key] = lerp(c[key], t[key], k);
      if (time > this.gradeAt) {
        this.gradeAt = time + 66;
        const v = 1 + c.c, o = 127.5 * (1 - v);
        this.cm.reset();
        this.cm.multiply([c.r, 0, 0, 0, 0, 0, c.g, 0, 0, 0, 0, 0, c.b, 0, 0, 0, 0, 0, 1, 0], true);
        this.cm.saturate(c.s, true);
        this.cm.multiply([v, 0, 0, 0, o, 0, v, 0, 0, o, 0, 0, v, 0, o, 0, 0, 0, 1, 0], true);
        if (this.vig) this.vig.strength = c.v;
      }
    }

    // sombras de nubes que cruzan el suelo con el viento
    const wantClouds = this.on && outdoor && day && (w === 'clear' || w === 'sun' || w === 'wind');
    this.cloudA = lerp(this.cloudA, wantClouds ? 1 : 0, 1 - Math.exp(-dt * 0.8));
    if (this.cloudA < 0.02) { if (this.cloudsReady) { this.clouds.forEach(cl => cl.img.setVisible(false)); this.cloudsReady = false; } }
    else {
      const wx = w === 'wind' ? 24 : 7, wy = 2.5;
      const L = wv.x - 240, R = wv.right + 240, Tp = wv.y - 200, B = wv.bottom + 200;
      for (const cl of this.clouds) {
        if (!this.cloudsReady) { cl.x = L + Math.random() * (R - L); cl.y = Tp + Math.random() * (B - Tp); cl.sx = 1.8 + Math.random() * 1.4; }
        cl.x += wx * dt; cl.y += wy * dt;
        if (cl.x < L) cl.x = R - 10; else if (cl.x > R) cl.x = L + 10;
        if (cl.y < Tp) cl.y = B - 10; else if (cl.y > B) cl.y = Tp + 10;
        cl.img.setVisible(true).setPosition(cl.x, cl.y).setScale(cl.sx, cl.sx * 0.62).setAlpha(0.11 * this.cloudA);
      }
      this.cloudsReady = true;
    }

    // rayos de sol diagonales en días soleados (y en el bosque)
    const wantRays = this.on && z.kind === 'wild' && h >= 7 && h < 16.5 && (w === 'sun' || (w === 'clear' && (z.id === 4 || z.id === 7)));
    this.rayA = lerp(this.rayA, wantRays ? 1 : 0, 1 - Math.exp(-dt));
    this.rays.forEach((r, i) => {
      if (this.rayA < 0.02) { r.setVisible(false); return; }
      const fx = ((i * 0.29 + time / 90000 + 0.08) % 1.2) - 0.1;
      r.setVisible(true).setPosition(wv.x + fx * wv.width, wv.y + wv.height * 0.42)
        .setScale(1 + (i % 2) * 0.7, wv.height / 150).setAlpha(this.rayA * (0.07 + 0.04 * Math.sin(time / 1700 + i * 1.9)));
    });

    // destellos del sol sobre el agua
    if (this.on && outdoor && day && w !== 'rain' && w !== 'storm' && w !== 'fog' && !sc.fx.low) {
      for (let i = 0; i < 2; i++) {
        const x = wv.x + Math.random() * wv.width, y = wv.y + Math.random() * wv.height;
        if (sc.terrainAt(x / PX, y / PX) === T.WATER) sc.fx.burst(x, y, '#ffffff', 1, 'spark', { k: 'wsp', speed: { min: 0, max: 2 }, lifespan: 520, scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 } });
      }
    }
  }

  // ------------------------------------------------ luces de color (sobre la capa de noche)
  beginGlows() { this.glowN = 0; }
  glow(x: number, y: number, r: number, col: number, a: number) {
    if (!this.on || this.glowN >= 40) return;
    let img = this.glows[this.glowN];
    if (!img) { img = (this.sc as Phaser.Scene).add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(20001); this.glows.push(img); }
    this.glowN++;
    img.setVisible(true).setPosition(x, y).setScale(r / 64 * 0.85).setTint(col).setAlpha(a);
  }
  endGlows() { for (let i = this.glowN; i < this.glows.length; i++) this.glows[i].setVisible(false); }

  // ------------------------------------------------ huellas que se desvanecen
  footprint(x: number, y: number, dir: number, snow: boolean) {
    if (!this.on) return;
    const img = this.feet[this.footI++ % this.feet.length];
    this.footSide ^= 1;
    const off = this.footSide ? 1.6 : -1.6, horiz = dir >= 2;
    img.setVisible(true).setPosition(x * PX + (horiz ? 0 : off), y * PX + (horiz ? off * 0.6 : 0))
      .setTint(snow ? 0x8fa6c0 : 0x8a7048).setScale(horiz ? 0.7 : 0.5, horiz ? 0.45 : 0.7).setAlpha(0.55);
    const tw = (this.sc as Phaser.Scene).tweens;
    tw.killTweensOf(img);
    tw.add({ targets: img, alpha: 0, delay: 1400, duration: 2200, onComplete: () => img.setVisible(false) });
  }
}
