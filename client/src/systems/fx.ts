// Efectos visuales: partículas, proyectiles, explosiones, números de daño, rayos...
import Phaser from 'phaser';
import { S } from '../state';
import { TYPE_COLORS } from '../../../shared/types';

const hex = (c: string) => parseInt(c.replace('#', ''), 16);

export class FX {
  emitters = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();
  dmgPool: Phaser.GameObjects.BitmapText[] = [];
  gfxPool: Phaser.GameObjects.Graphics[] = [];

  constructor(private s: Phaser.Scene) {}

  get low() { return S.settings.particles === 'low'; }

  emitter(tex: string, tint: number, cfg: any = {}): Phaser.GameObjects.Particles.ParticleEmitter {
    const k = tex + ':' + tint + ':' + (cfg.k || '');
    let e = this.emitters.get(k);
    if (!e) {
      e = this.s.add.particles(0, 0, tex, {
        speed: { min: 20, max: 90 }, lifespan: { min: 300, max: 650 }, scale: { start: 1, end: 0.2 }, alpha: { start: 1, end: 0 },
        tint, emitting: false, gravityY: 0, ...cfg,
      });
      e.setDepth(15000);
      this.emitters.set(k, e);
    }
    return e;
  }

  burst(x: number, y: number, color: string | number, n = 10, tex = 'px', cfg: any = {}) {
    if (this.low) n = Math.ceil(n / 2.5);
    const c = typeof color === 'string' ? hex(color) : color;
    this.emitter(tex, c, cfg).explode(n, x, y);
  }

  typeColor(t: string) { return (TYPE_COLORS as any)[t] || '#ffffff'; }

  hitSpark(x: number, y: number, type: string, crit = false) {
    const c = this.typeColor(type);
    this.burst(x, y, c, crit ? 16 : 8, 'px', { speed: { min: 40, max: crit ? 160 : 110 } });
    this.burst(x, y, '#ffffff', crit ? 5 : 2, 'spark', { speed: { min: 10, max: 50 }, lifespan: 260, k: 'w' });
    if (crit) this.ring(x, y, '#fff6a0', 18, 220);
  }

  ring(x: number, y: number, color: string, r: number, dur: number, from = 0.15) {
    const img = this.s.add.image(x, y, 'ring').setDepth(14000).setTint(hex(color)).setScale(from).setAlpha(0.85);
    this.s.tweens.add({ targets: img, scale: r / 16, alpha: 0, duration: dur, ease: 'Cubic.Out', onComplete: () => img.destroy() });
  }

  slash(x: number, y: number, color: string, angle = -0.5, scale = 1.3) {
    const img = this.s.add.image(x, y, 'slash').setDepth(14600).setTint(hex(color)).setScale(scale * 0.4).setRotation(angle).setAlpha(0.95);
    this.s.tweens.add({
      targets: img, scaleX: scale * 1.5, scaleY: scale * 1.2, alpha: 0, duration: 180, ease: 'Quad.Out',
      onComplete: () => img.destroy(),
    });
    this.burst(x, y, color, 4, 'px', { speed: { min: 20, max: 80 } });
  }

  ripple(x: number, y: number, color = '#a0d8ff', r = 16, dur = 380, depth = -29) {
    const img = this.s.add.image(x, y, 'ripple').setDepth(depth).setTint(hex(color)).setScale(0.15).setAlpha(0.8);
    this.s.tweens.add({ targets: img, scale: r / 16, alpha: 0, duration: dur, ease: 'Cubic.Out', onComplete: () => img.destroy() });
  }

  chargeAura(x: number, y: number, color: string, dur = 320) {
    this.disc(x, y, color, 28, dur, 0.4);
    const n = this.low ? 5 : 12;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 26 + Math.random() * 14;
      this.projectile('px', color, x + Math.cos(a) * d, y + Math.sin(a) * d, x, y, dur * 0.85);
    }
  }

  groundFissure(x: number, y: number, color = '#9a7a50', dur = 420) {
    const g = this.s.add.graphics().setDepth(14100);
    g.lineStyle(2, hex(color), 0.9);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      const len = 14 + Math.random() * 12;
      const midX = x + Math.cos(a) * (len * 0.5) + (Math.random() - 0.5) * 6;
      const midY = y + Math.sin(a) * (len * 0.5) + (Math.random() - 0.5) * 6;
      const endX = x + Math.cos(a) * len;
      const endY = y + Math.sin(a) * len;
      g.lineBetween(x, y, midX, midY);
      g.lineBetween(midX, midY, endX, endY);
    }
    this.s.tweens.add({ targets: g, alpha: 0, duration: dur, onComplete: () => g.destroy() });
    this.burst(x, y, color, 8, 'rockbit', { speed: { min: 20, max: 70 }, gravityY: 60 });
  }

  disc(x: number, y: number, color: string, r: number, dur: number, alpha = 0.6) {
    const img = this.s.add.image(x, y, 'disc').setDepth(14000).setTint(hex(color)).setScale(0.2).setAlpha(alpha * 0.6);
    this.s.tweens.add({ targets: img, scale: r / 16, alpha: 0, duration: dur, ease: 'Quad.Out', onComplete: () => img.destroy() });
  }

  explosion(x: number, y: number, r: number, color: string) {
    this.disc(x, y, color, r * 16, 380, 0.7);
    this.ring(x, y, '#ffffff', r * 16 * 1.1, 320);
    this.burst(x, y, color, 18, 'px', { speed: { min: 60, max: 60 + r * 60 } });
    if (r >= 2) this.s.cameras.main.shake(140, 0.0025);
  }

  projectile(tex: string, tint: string | null, x0: number, y0: number, x1: number, y1: number, dur: number, opts: { spin?: boolean; arc?: number; trail?: string } = {}) {
    const img = this.s.add.image(x0, y0, tex).setDepth(14500);
    if (tint) img.setTint(hex(tint));
    const ang = Math.atan2(y1 - y0, x1 - x0);
    if (!opts.spin) img.setRotation(tex === 'bolt' ? 0 : ang + (tex === 'drop' ? -Math.PI / 2 - Math.PI : 0));
    const st = { t: 0 };
    this.s.tweens.add({
      targets: st, t: 1, duration: Math.max(60, dur), ease: 'Linear',
      onUpdate: () => {
        img.x = x0 + (x1 - x0) * st.t; img.y = y0 + (y1 - y0) * st.t - (opts.arc ? Math.sin(st.t * Math.PI) * opts.arc : 0);
        if (opts.spin) img.rotation += 0.35;
        if (opts.trail && !this.low && Math.random() < 0.5) this.burst(img.x, img.y, opts.trail, 1, 'px', { speed: { min: 0, max: 10 }, lifespan: 250, k: 't' });
      },
      onComplete: () => img.destroy(),
    });
  }

  beam(x0: number, y0: number, x1: number, y1: number, color: string, width: number, dur = 260) {
    const g = this.s.add.graphics().setDepth(14400);
    g.setBlendMode(Phaser.BlendModes.ADD);
    const st = { a: 1 };
    const draw = () => {
      g.clear();
      g.lineStyle(width * st.a, hex(color), 0.75 * st.a); g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(Math.max(1, width * 0.35 * st.a), 0xffffff, 0.9 * st.a); g.lineBetween(x0, y0, x1, y1);
    };
    draw();
    this.s.tweens.add({ targets: st, a: 0, duration: dur, onUpdate: draw, onComplete: () => g.destroy() });
    const n = this.low ? 3 : 8;
    for (let i = 0; i < n; i++) { const t = i / n; this.burst(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, color, 2, 'px', { speed: { min: 10, max: 50 }, k: 'b' }); }
  }

  lightning(pts: { x: number; y: number }[], color = '#f8e040') {
    const g = this.s.add.graphics().setDepth(14600);
    g.setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(2, hex(color), 1);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      let px = a.x, py = a.y;
      const segs = 5;
      for (let k = 1; k <= segs; k++) {
        const t = k / segs;
        const nx = a.x + (b.x - a.x) * t + (k < segs ? (Math.random() - 0.5) * 8 : 0), ny = a.y + (b.y - a.y) * t + (k < segs ? (Math.random() - 0.5) * 8 : 0);
        g.lineBetween(px, py, nx, ny); px = nx; py = ny;
      }
      this.burst(b.x, b.y, color, 4, 'px');
    }
    this.s.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  floatText(x: number, y: number, text: string, tint: number, scale = 1, font = 'f3', dur = 800, rise = 18) {
    const t = this.s.add.bitmapText(x, y, font, text).setOrigin(0.5, 1).setDepth(23000).setTint(tint).setScale(scale);
    this.s.tweens.add({ targets: t, y: y - rise, duration: dur, ease: 'Cubic.Out' });
    this.s.tweens.add({ targets: t, alpha: 0, delay: dur * 0.6, duration: dur * 0.4, onComplete: () => t.destroy() });
    return t;
  }

  /** Texto de combate nítido (Pixelify Sans con contorno), tamaño fijo en píxeles de pantalla. */
  numText(x: number, y: number, text: string, color: string, size: number) {
    const z = Math.max(1, this.s.cameras.main.zoom);
    return this.s.add.text(x, y, text, { fontFamily: '"Pixelify Sans", monospace', fontSize: size + 'px', fontStyle: '700', color, stroke: '#140a12', strokeThickness: Math.max(3, Math.round(size / 4.5)), resolution: 1 })
      .setOrigin(0.5, 1).setDepth(23000).setScale(1 / z);
  }

  damage(x: number, y: number, n: number, flags: number, onPlayer = false, mine = false) {
    if (!S.settings.dmg) return;
    const z = Math.max(1, this.s.cameras.main.zoom), crit = !!(flags & 1);
    let color = mine ? '#ff9a86' : '#ffffff', size = crit ? 26 : flags & 2 ? 19 : flags & 4 ? 13 : 16;
    let tag = '', tagColor = '';
    if (crit) { color = '#ffe24a'; tag = '¡CRÍTICO!'; tagColor = '#ffb020'; }
    else if (flags & 2) { color = '#ffad4a'; tag = '¡Súper eficaz!'; tagColor = '#ff8a30'; }
    else if (flags & 4) { color = '#b4bccb'; tag = 'Poco eficaz'; tagColor = '#8ea0b8'; }
    if (flags & 16) color = '#d494ff';
    if (flags & 8) color = '#86ecff';
    if (onPlayer) color = '#ff5a5a';
    const side = Math.random() < 0.5 ? -1 : 1, x0 = x + side * (2 + Math.random() * 4);
    const t = this.numText(x0, y, (crit ? '' : '') + n, color, size);
    const s1 = (crit ? 1.9 : 1.45) / z, s0 = 1 / z;
    t.setScale(s1);
    this.s.tweens.add({ targets: t, scale: s0 * (crit ? 1.1 : 1), duration: crit ? 220 : 140, ease: 'Back.Out' });
    this.s.tweens.add({ targets: t, x: x0 + side * (5 + Math.random() * 7), duration: 820, ease: 'Sine.Out' });
    this.s.tweens.add({ targets: t, y: y - (crit ? 22 : 15), duration: 820, ease: 'Cubic.Out' });
    this.s.tweens.add({ targets: t, alpha: 0, delay: 520, duration: 320, onComplete: () => t.destroy() });
    if (tag) {
      const l = this.numText(x, y - size / z - 2, tag, tagColor, crit ? 13 : 11);
      this.s.tweens.add({ targets: l, y: l.y - 12, duration: 760, ease: 'Cubic.Out' });
      this.s.tweens.add({ targets: l, alpha: 0, delay: 480, duration: 300, onComplete: () => l.destroy() });
      if (crit) { this.ring(x, y - 4, '#fff1a0', 16, 260); this.burst(x, y - 6, '#ffe060', 6, 'star', { speed: { min: 30, max: 90 }, lifespan: 420 }); }
    }
  }
}

export { hex };
