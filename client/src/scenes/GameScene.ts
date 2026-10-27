// Escena principal: mundo por chunks, entidades interpoladas, efectos, entrada del jugador.
import Phaser from 'phaser';
import { CHUNK, TILE, PLAYER_SPEED, T, DAY_LENGTH_MS, STATUS, STATUS_NAMES } from '../../../shared/constants';
import { World, WObj, playerBlocked, Pickup, NpcDef } from '../../../shared/world/worldgen';
import { SPECIES_LIST, SPECIES } from '../../../shared/species';
import { MOVE_LIST } from '../../../shared/moves';
import { ZONES } from '../../../shared/zones';
import { SKILLS, LINK_MAP } from '../../../shared/progression';
import { TYPE_COLORS, TYPE_NAMES } from '../../../shared/types';
import { S, bus } from '../state';
import { net } from '../networking/net';
import { buildTextures, getTileSet, ensureTrainerTexture, npcTexture, ensureMonTexture, monTextureFor, pumpMonTextures } from '../graphics/textures';
import { monScale, MON_FRAME, MON_WORLD_SIZE } from '../graphics/mon3d';
import { TRAINER_SCALE } from '../graphics/trainer3d';
import { objectScale } from '../graphics/nature3d';
import { renderChunk } from '../graphics/chunkRenderer';
import { f3 } from '../graphics/font';
import { FX, hex } from '../systems/fx';
import { audio, Mood } from '../systems/audio';
import { Visuals } from '../systems/visuals';
import { findWalkPath, findRoute, nearestOnRoute, routeLength, type Point } from '../systems/navigation';
import { encounterTier, type Tier } from '../../../shared/encounters';
import { weatherAt, seasonAt } from '../../../shared/weather';
import { npcPos } from '../../../shared/world/npcwalk';

const PX = TILE;
/** Rótulos del mundo (nombres, carteles): texto real con Pixelify Sans, a 1 píxel de pantalla por píxel (nítido con cualquier zoom). */
export function worldLabel(scene: Phaser.Scene, text: string, color = '#eef4f0') {
  return scene.add.text(0, 0, text, { fontFamily: '"Pixelify Sans", "Press Start 2P", monospace', fontSize: '13px', fontStyle: '600', color, stroke: '#0b1016', strokeThickness: 3, resolution: 1 })
    .setOrigin(0.5, 1).setScale(1 / Math.max(1, scene.cameras.main.zoom));
}
const INTERP_DELAY = 210;   // dos instantáneas de margen: si una llega tarde no hay saltos
const BALL_TEX = ['ball', 'ballB', 'ballU', 'ballM'];
const STATUS_TINT = [0, 0xff8040, 0xc060f0, 0xf8e040, 0x9090b0, 0x80e0ff];

interface Snap { t: number; x: number; y: number; }
function sample(buf: Snap[], t: number): { x: number; y: number } {
  if (!buf.length) return { x: 0, y: 0 };
  if (t <= buf[0].t) return buf[0];
  for (let i = buf.length - 1; i >= 0; i--) {
    if (buf[i].t <= t) {
      const a = buf[i], b = buf[i + 1];
      if (!b) { const dt = Math.min(200, t - a.t); const p = buf[i - 1]; if (!p || a.t === p.t) return a; const k = dt / (a.t - p.t); return { x: a.x + (a.x - p.x) * k * 0.5, y: a.y + (a.y - p.y) * k * 0.5 }; }
      const k = (t - a.t) / (b.t - a.t);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
  }
  return buf[0];
}

class MonView {
  sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Image; tall: Phaser.GameObjects.Image;
  buf: Snap[] = []; x = 0; y = 0; px = 0; py = 0; hp = 100; lvl = 1; flags = 0; owner = 0; status = 0; faceLeft = true;
  key: string; shiny: boolean; size: number; base = 1; moving = false; dead = false; lunge = { x: 0, y: 0 }; flash = 0; seenAt = 0;
  direction = 1; attackUntil = 0; nextSpark = 0; hpLag = 100; lvlKey = ''; seenSmooth = false; vel = 0; dirX = 0; dirY = 1; popUntil = 0;
  statusTxt: Phaser.GameObjects.BitmapText | null = null; barrier: Phaser.GameObjects.Image | null = null; glow: Phaser.GameObjects.Image | null = null;
  lvlTxt: Phaser.GameObjects.BitmapText; tierTxt: Phaser.GameObjects.BitmapText | null = null; tier: Tier;
  constructor(public id: number, spIdx: number, shiny: boolean, flags: number, scene: GameScene) {
    const sp = SPECIES_LIST[spIdx];
    this.key = sp.key; this.shiny = shiny; this.size = 28;
    this.base = monScale(sp, flags);
    this.shadow = scene.add.image(0, 0, 'shadow').setDepth(-30).setScale(this.base * 0.7, this.base * 0.8);
    this.sprite = scene.add.sprite(0, 0, ensureMonTexture(scene, sp.key, shiny), 0).setOrigin(0.5, 0.85).setScale(this.base * MON_WORLD_SIZE / MON_FRAME);
    this.tall = scene.add.image(0, 0, 'tallfront').setOrigin(0.5, 1).setVisible(false);
    this.lvlTxt = scene.add.bitmapText(0, 0, 'f3', '').setOrigin(1, 0.5).setDepth(21950);
    // Aura en el suelo según la rareza del encuentro (sustituye al antiguo destello blanco).
    this.tier = encounterTier(sp.rarity, shiny, !!(flags & 64));
    if (flags & 2 && this.tier.glow >= 1) {
      this.glow = scene.add.image(0, 0, 'aura').setDepth(-29).setTint(hex(this.tier.color)).setScale(this.base * (0.9 + this.tier.glow * 0.12));
      if (this.tier.label) this.tierTxt = scene.add.bitmapText(0, 0, 'f3', f3(this.tier.label.replace(/✦/g, '*'))).setOrigin(0.5, 1).setDepth(21960).setTint(hex(this.tier.color));
    }
  }
  setSpecies(spIdx: number, shiny: boolean) {
    const sp = SPECIES_LIST[spIdx];
    this.key = sp.key; this.shiny = shiny; this.size = 28;
    this.base = monScale(sp, this.flags);
    this.sprite.setTexture(ensureMonTexture(this.sprite.scene, sp.key, shiny, this.direction), 0).setScale(this.base * MON_WORLD_SIZE / MON_FRAME);
    this.shadow.setScale(this.base * 0.7, this.base * 0.8);
  }
  destroy() { this.sprite.destroy(); this.shadow.destroy(); this.tall.destroy(); this.statusTxt?.destroy(); this.barrier?.destroy(); this.glow?.destroy(); this.lvlTxt.destroy(); this.tierTxt?.destroy(); }
}

class PlayerView {
  sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Image; name: Phaser.GameObjects.Text; tall: Phaser.GameObjects.Image;
  buf: Snap[] = []; x = 0; y = 0; dir = 0; moving = false; hp = 100; inv = 0; lookKey = ''; animT = 0; seenAt = 0;
  bubble: Phaser.GameObjects.Container | null = null;
  constructor(public id: number, scene: GameScene, look: any, name: string) {
    this.shadow = scene.add.image(0, 0, 'shadow').setDepth(-30).setScale(0.55, 0.8);
    this.lookKey = ensureTrainerTexture(scene, look || { hat: 0, shirt: 0, skin: 0, hair: 0 });
    this.sprite = scene.add.sprite(0, 0, this.lookKey, 0).setOrigin(0.5, 0.94).setScale(TRAINER_SCALE);
    this.name = worldLabel(scene, name).setDepth(22000);
    this.tall = scene.add.image(0, 0, 'tallfront').setOrigin(0.5, 1).setVisible(false);
  }
  destroy() { this.sprite.destroy(); this.shadow.destroy(); this.name.destroy(); this.tall.destroy(); this.bubble?.destroy(); }
}

export class GameScene extends Phaser.Scene {
  world!: World;
  fx!: FX;
  visuals!: Visuals;
  chunks = new Map<string, { img: Phaser.GameObjects.Image; objs: Phaser.GameObjects.GameObject[]; tex: string }>();
  objIndex = new Map<string, WObj[]>();
  foliage = new Map<Phaser.GameObjects.Image, { phase: number; palm: boolean }>();
  pickIndex = new Map<string, Pickup[]>();
  npcIndex = new Map<string, NpcDef[]>();
  pickSprites = new Map<number, Phaser.GameObjects.Image>();
  npcSprites = new Map<number, Phaser.GameObjects.Sprite>();
  lampSpots: { x: number; y: number }[] = [];
  campfires: { x: number; y: number; until: number }[] = [];
  chunkQueue: string[] = [];
  water!: Phaser.GameObjects.TileSprite;
  me = { x: 0, y: 0, dir: 0, moving: false, seq: 0, lastSend: 0, sentX: 0, sentY: 0, sentDir: -1, sentMov: false, animT: 0, dashing: 0, portalAt: 0, stepAt: 0 };
  meView!: PlayerView;
  players = new Map<number, PlayerView>();
  mons = new Map<number, MonView>();
  keys!: any;
  tgGfx!: Phaser.GameObjects.Graphics;
  barGfx!: Phaser.GameObjects.Graphics;
  linkGfx!: Phaser.GameObjects.Graphics;
  night!: Phaser.GameObjects.RenderTexture;
  lightImg!: Phaser.GameObjects.Image;
  selRing!: Phaser.GameObjects.Image;
  hint!: Phaser.GameObjects.Text;
  weather: Record<string, Phaser.GameObjects.Particles.ParticleEmitter> = {};
  chunkCheckAt = 0;
  zoneId = -1;
  lastMood: Mood = 'menu';
  inited = false;
  waterFrame = 0;
  unsub: (() => void)[] = [];
  walkPath: Point[] = [];
  routeGfx!: Phaser.GameObjects.Graphics;
  lastPathPos = { x: 0, y: 0 }; pathStuck = 0;

  constructor() { super('game'); }

  init(data: { world: World; x: number; y: number; seq: number }) {
    this.world = data.world;
    this.me.x = data.x; this.me.y = data.y; this.me.seq = data.seq;
  }

  create() {
    buildTextures(this);
    const ts = getTileSet();
    ts.water.forEach((c, i) => this.textures.addCanvas('water' + i, c));
    this.fx = new FX(this);
    this.visuals = new Visuals(this);
    // índices por chunk
    const ck = (x: number, y: number) => `${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`;
    for (const o of this.world.objects) { const k = ck(o.x, o.y + Math.max(0, o.h - 1)); let a = this.objIndex.get(k); if (!a) this.objIndex.set(k, a = []); a.push(o); if (o.k === 'lamp') this.lampSpots.push({ x: (o.x + 0.5) * PX, y: o.y * PX }); }
    for (const p of this.world.pickups) { const k = ck(p.x, p.y); let a = this.pickIndex.get(k); if (!a) this.pickIndex.set(k, a = []); a.push(p); }
    for (const n of this.world.npcs) { const k = ck(n.x, n.y); let a = this.npcIndex.get(k); if (!a) this.npcIndex.set(k, a = []); a.push(n); }

    this.water = this.add.tileSprite(0, 0, 64, 64, 'water0').setOrigin(0, 0).setDepth(-100);
    this.tgGfx = this.add.graphics().setDepth(-40);
    this.linkGfx = this.add.graphics().setDepth(-29).setBlendMode(Phaser.BlendModes.ADD);
    this.barGfx = this.add.graphics().setDepth(21900);
    this.routeGfx = this.add.graphics().setDepth(-27);
    this.selRing = this.add.image(0, 0, 'selring').setDepth(-28).setTint(0xff4040).setVisible(false);
    this.hint = worldLabel(this, '', '#fff3a0').setDepth(22500).setVisible(false);

    const look = S.core?.look || { hat: 0, shirt: 0, skin: 0, hair: 0 };
    this.meView = new PlayerView(S.myId, this, look, S.core?.name || '');
    this.meView.name.setTint(0xfff070);

    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    cam.setBackgroundColor('#0a0810');
    this.applyZoom();
    this.meView.sprite.setPosition(this.me.x * PX, this.me.y * PX);
    cam.startFollow(this.meView.sprite, true, 0.15, 0.15);
    cam.centerOn(this.me.x * PX, this.me.y * PX);
    this.scale.on('resize', () => this.applyZoom());

    // noche
    this.night = this.add.renderTexture(0, 0, 64, 64).setOrigin(0, 0).setDepth(20000);
    this.lightImg = this.make.image({ key: 'glow', add: false });

    // clima
    this.setupWeather();

    // entrada
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard!.addKeys({
      up: KC.W, down: KC.S, left: KC.A, right: KC.D, up2: KC.UP, down2: KC.DOWN, left2: KC.LEFT, right2: KC.RIGHT,
    }, false, false);
    this.input.keyboard!.disableGlobalCapture();
    window.addEventListener('keydown', this.onKey);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onClick(p));
    this.input.mouse?.disableContextMenu();

    // red
    this.unsub.push(net.on('s', m => this.onSnap(m)));
    this.unsub.push(net.on('tp', m => { this.me.x = m.x; this.me.y = m.y; this.me.seq = m.seq; this.meView.sprite.setPosition(m.x * PX, m.y * PX); this.cameras.main.centerOn(m.x * PX, m.y * PX); this.fx.ring(m.x * PX, m.y * PX - 10, '#a0e0ff', 30, 500); audio.play('dash'); }));
    this.unsub.push(net.on('pos', m => { if (m.seq === this.me.seq) { this.me.x = m.x; this.me.y = m.y; } }));
    this.unsub.push(net.on('pm', () => this.refreshPlayerMeta()));
    this.unsub.push(net.on('pleft', m => { const v = this.players.get(m.id); if (v) { v.destroy(); this.players.delete(m.id); } }));
    this.unsub.push(bus.on('core', () => this.refreshPickups()));
    this.unsub.push(bus.on('evolve_fx', (d: any) => this.evolveFxOnTeam(d)));
    this.unsub.push(bus.on('player_lvl', () => {
      const pos = this.viewPos(-S.myId);
      if (pos) {
        this.fx.ring(pos.x, pos.y + 8, '#ffe060', 42, 850);
        this.fx.burst(pos.x, pos.y - 12, '#ffe060', 26, 'star', { speed: { min: 30, max: 110 }, lifespan: 950 });
      }
    }));
    this.unsub.push(bus.on('throw', () => this.throwAtFocus()));
    this.unsub.push(bus.on('skill', (n: number) => this.useSkill(n)));
    this.unsub.push(bus.on('settings', () => { this.applyZoom(); this.visuals?.applyPost(); }));
    this.unsub.push(bus.on('interact', () => this.interact()));
    this.unsub.push(bus.on('select_target', (id: number) => this.setFocus(id)));
    this.unsub.push(bus.on('fight_target', (id: number) => this.setFocus(id, true)));
    this.unsub.push(bus.on('cancel_walk', () => { this.walkPath = []; }));
    this.unsub.push(bus.on('auto_route', () => { if (S.route?.length) { this.walkPath = S.route.map(p => ({ x: p.x, y: p.y })); this.pathStuck = 0; bus.emit('toast', { text: 'Caminando hacia ' + (S.waypoint?.name || 'el destino') + '… (pulsa cualquier dirección para parar)', kind: 'info' }); } }));
    this.unsub.push(net.on('tp', () => { this.walkPath = []; }));
    this.events.on('shutdown', () => { window.removeEventListener('keydown', this.onKey); this.unsub.forEach(u => u()); });
    this.inited = true;
    bus.emit('scene_ready', this);
  }

  // Las etiquetas se escalan para que cada píxel de la fuente ocupe píxeles enteros de pantalla (nítidas y pequeñas).
  lblScale = 0.5; nameScale = 0.66; frameDt = 0.016;
  npcNames = new Map<number, Phaser.GameObjects.Text>();
  txtScale = 0.25;
  applyZoom() {
    const w = this.scale.width, h = this.scale.height;
    let z = Math.max(2, Math.min(5, Math.round(Math.min(w / 460, h / 280))));
    if (S.settings.zoom) z = Math.max(1, Math.min(6, z + S.settings.zoom));
    this.cameras.main.setZoom(z);
    this.lblScale = Math.max(1, Math.round(z * 0.5)) / z;
    this.nameScale = Math.max(1, Math.round(z * 0.62)) / z;
    this.txtScale = 1 / z;
    for (const n of this.npcNames.values()) n.setScale(this.txtScale);
    this.hint?.setScale(this.txtScale);
  }

  // ------------------------------------------------------------ chunks
  updateChunks(force = false) {
    const now = this.time.now;
    if (!force && now < this.chunkCheckAt) return;
    this.chunkCheckAt = now + 250;
    const v = this.cameras.main.worldView;
    const size = CHUNK * PX;
    const x0 = Math.floor((v.x - 96) / size), x1 = Math.floor((v.right + 96) / size);
    const y0 = Math.floor((v.y - 96) / size), y1 = Math.floor((v.bottom + 96) / size);
    const want = new Set<string>();
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      if (cx < 0 || cy < 0 || cx * CHUNK >= this.world.w || cy * CHUNK >= this.world.h) continue;
      const k = cx + ',' + cy; want.add(k);
      if (!this.chunks.has(k) && !this.chunkQueue.includes(k)) this.chunkQueue.push(k);
    }
    // ordenar la cola por cercanía
    const pcx = this.me.x / CHUNK, pcy = this.me.y / CHUNK;
    this.chunkQueue = this.chunkQueue.filter(k => want.has(k));
    this.chunkQueue.sort((a, b) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.hypot(ax + 0.5 - pcx, ay + 0.5 - pcy) - Math.hypot(bx + 0.5 - pcx, by + 0.5 - pcy); });
    for (const [k, c] of this.chunks) {
      const [cx, cy] = k.split(',').map(Number);
      if (cx < x0 - 1 || cx > x1 + 1 || cy < y0 - 1 || cy > y1 + 1) this.unloadChunk(k, c);
    }
  }

  loadNextChunk(force = false) {
    let n = force ? 99 : 1;
    while (n-- > 0 && this.chunkQueue.length) {
      const k = this.chunkQueue.shift()!;
      if (this.chunks.has(k)) continue;
      const [cx, cy] = k.split(',').map(Number);
      const canvas = renderChunk(this.world, getTileSet(), cx, cy);
      const tex = 'chunk:' + k;
      if (this.textures.exists(tex)) this.textures.remove(tex);
      this.textures.addCanvas(tex, canvas);
      const img = this.add.image(cx * CHUNK * PX, cy * CHUNK * PX, tex).setOrigin(0, 0).setDepth(-50);
      const objs: Phaser.GameObjects.GameObject[] = [];
      for (const o of this.objIndex.get(k) || []) objs.push(this.makeObj(o));
      for (const p of this.pickIndex.get(k) || []) {
        const s = this.add.image((p.x + 0.5) * PX, (p.y + 1) * PX, p.kind === 'chest' ? `chest:${p.tier}:0` : 'obj:itemball:0').setOrigin(0.5, 1).setDepth((p.y + 1) * PX - 1);
        if (p.kind === 'item') s.y -= 2;
        this.pickSprites.set(p.id, s); objs.push(s);
      }
      for (const npc of this.npcIndex.get(k) || []) {
        const s = this.add.sprite((npc.x + 0.5) * PX, (npc.y + 1) * PX, npcTexture(this, npc.look), 0).setOrigin(0.5, 0.94).setScale(TRAINER_SCALE).setDepth((npc.y + 1) * PX);
        const sh = this.add.image(s.x, s.y - 1, 'shadow').setDepth(-30).setScale(0.55, 0.8);
        const nm = worldLabel(this, npc.name, npc.role === 'prof' ? '#b8f0a8' : npc.role === 'leader' ? '#ffd88a' : '#dbe8e4').setPosition(s.x, s.y - 26).setDepth(22000);
        this.npcNames.set(npc.id, nm); this.npcShadows.set(npc.id, sh);
        this.npcSprites.set(npc.id, s); objs.push(s, sh, nm);
      }
      this.chunks.set(k, { img, objs, tex });
      this.refreshPickups();
    }
  }

  makeObj(o: WObj): Phaser.GameObjects.GameObject {
    const key = `obj:${o.k}:${o.v}`;
    if (o.k === 'cave') return this.add.image((o.x + 0.5) * PX, (o.y + 1) * PX + 2, key).setOrigin(0.5, 1).setDepth(-35);
    if (o.k === 'flowerpatch') return this.add.image((o.x + 0.5) * PX, (o.y + 1) * PX, key).setOrigin(0.5, 1).setScale(0.5).setDepth(-34);
    if (o.k === 'rug' || o.k === 'window') return this.add.image((o.x + o.w / 2) * PX, (o.y + o.h) * PX, key).setOrigin(0.5, 1).setDepth(-36);
    const building = ['center', 'mart', 'house', 'lab', 'fountain', 'tower'].includes(o.k);
    const bottom = (o.y + o.h) * PX;
    const img = building
      ? this.add.image(o.x * PX, bottom, key).setOrigin(0, 1)
      : this.add.image((o.x + o.w / 2) * PX, bottom, key).setOrigin(0.5, 1);
    if (o.k === 'tree') img.y += 2;
    img.setScale(objectScale(o.k)).setDepth(bottom - 2);
    if ((o.k === 'tree' && o.v !== 3) || o.k === 'bush') {
      this.foliage.set(img, { phase: o.x * 0.57 + o.y * 0.31, palm: o.v === 2 && o.k === 'tree' });
      img.once('destroy', () => this.foliage.delete(img));
    }
    return img;
  }

  unloadChunk(k: string, c: { img: Phaser.GameObjects.Image; objs: Phaser.GameObjects.GameObject[]; tex: string }) {
    c.img.destroy();
    for (const o of c.objs) o.destroy();
    for (const p of this.pickIndex.get(k) || []) this.pickSprites.delete(p.id);
    for (const n of this.npcIndex.get(k) || []) { this.npcSprites.delete(n.id); this.npcNames.delete(n.id); this.npcShadows.delete(n.id); }
    this.textures.remove(c.tex);
    this.chunks.delete(k);
  }

  refreshPickups() {
    const now = net.serverNow();
    const opened = S.core?.pickups || {};
    for (const [id, s] of this.pickSprites) {
      const p = this.world.pickups[id - 1];
      const t = opened[id] || 0;
      const isOpen = now - t < (p.kind === 'chest' ? 20 * 60000 : 10 * 60000);
      if (p.kind === 'chest') s.setTexture(`chest:${p.tier}:${isOpen ? 1 : 0}`);
      else s.setVisible(!isOpen);
    }
  }

  // ------------------------------------------------------------ entrada
  onKey = (e: KeyboardEvent) => {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || document.querySelector('.win, .dialog') || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    if (k === 'e') this.interact();
    else if (k === 'c') this.throwAtFocus();
    else if (['1', '2', '3', '4'].includes(k)) this.useSkill(parseInt(k, 10));
    else if (k === ' ') { e.preventDefault(); this.useSkill(4); }
    else if (k === 'tab' && tag !== 'button' && tag !== 'a') { e.preventDefault(); this.cycleTarget(); }
    else if (k === 'b') bus.emit('cycle_ball');
    else if (k === 'f') bus.emit('flee');
    else if (k === 'v') bus.emit('cycle_stance');
    else if (k === 'z') net.send({ t: 'camp' });
    else if (k === 'q') bus.emit('quick_potion');
  };

  inputVec() {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || document.querySelector('.win, .dialog')) { this.walkPath = []; return { x: 0, y: 0 }; }
    const k = this.keys;
    let x = 0, y = 0;
    if (k.left.isDown || k.left2.isDown) x -= 1;
    if (k.right.isDown || k.right2.isDown) x += 1;
    if (k.up.isDown || k.up2.isDown) y -= 1;
    if (k.down.isDown || k.down2.isDown) y += 1;
    if (x || y) this.walkPath = [];
    else if (this.walkPath.length) {
      while (this.walkPath.length && Math.hypot(this.walkPath[0].x - this.me.x, this.walkPath[0].y - this.me.y) < 0.2) this.walkPath.shift();
      const next = this.walkPath[0];
      if (next) { const dx = next.x - this.me.x, dy = next.y - this.me.y, d = Math.hypot(dx, dy); return { x: dx / d, y: dy / d }; }
    }
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  }

  onClick(p: Phaser.Input.Pointer) {
    audio.init();
    if (document.querySelector('.win, .dialog')) return;
    if (p.rightButtonDown()) { this.throwAtFocus(); return; }
    const wx = p.worldX / PX, wy = p.worldY / PX;
    let best: MonView | null = null, bd = 1.6;
    for (const v of this.mons.values()) {
      if ((!(v.flags & 2) && !(v.flags & 16384)) || v.dead) continue;
      const h = v.size * v.base / PX * 0.45;
      const d = Math.hypot(v.x - wx, (v.y - h) - wy);
      if (d < bd + h * 0.4) { bd = d; best = v; }
    }
    if (best) {
      this.walkPath = [];
      const dbl = best.id === this.lastClickId && this.time.now - this.lastClickAt < 380;
      this.lastClickId = best.id; this.lastClickAt = this.time.now;
      this.setFocus(best.id, dbl || !!(best.flags & 16384));
      if (dbl) bus.emit('toast', { text: '¡A por él! Tu equipo ataca a ' + SPECIES[best.key].name + '.', kind: 'info' });
      return;
    }
    // Acariciar a tus propios Pokémon compañeros al hacer clic sobre ellos
    for (const v of this.mons.values()) {
      if (v.owner !== S.myId || v.dead) continue;
      const h = v.size * v.base / PX * 0.45;
      if (Math.hypot(v.x - wx, (v.y - h) - wy) < 1.05) { this.petMon(v); return; }
    }
    // NPC / carteles por clic
    for (const npc of this.world.npcs) { const q = this.npcAt(npc); if (Math.hypot(q.x - wx, q.y - 0.4 - wy) < 1 && Math.hypot(q.x - this.me.x, q.y - this.me.y) < 3) { this.talk(npc); return; } }
    if (S.me.focus) this.setFocus(0);
    const path = findWalkPath(this.world, this.me, { x: wx, y: wy });
    this.walkPath = path || [];
    this.pathStuck = 0;
    if (path) this.fx.ring(Math.floor(wx) * PX + PX / 2, Math.floor(wy) * PX + PX / 2, '#b9eaa0', 9, 450);
    else bus.emit('toast', { text: 'No hay un camino cercano hasta ahí. Prueba otro punto del suelo.', kind: 'info' });
  }

  lastClickId = 0; lastClickAt = 0;
  /** fight=false solo selecciona (ver nivel y datos); fight=true ordena atacar. */
  setFocus(id: number, fight = false) {
    S.me.focus = id; S.me.fight = fight && id > 0;
    net.send({ t: 'tgt', id, fight: S.me.fight });
    audio.play('ui');
    bus.emit('focus');
  }

  petMon(v: MonView) {
    v.lunge.y = -5;
    this.tweens.add({ targets: v.lunge, y: 0, duration: 340, ease: 'Bounce.Out' });
    const px = v.x * PX, py = v.y * PX - 10;
    this.fx.burst(px, py, '#ff6898', 8, 'heart', { speed: { min: 15, max: 45 }, gravityY: -25, lifespan: 750 });
    const msg = ['<3 ¡FELIZ!', '<3 ¡CONTENTO!', '<3 ¡ANIMADO!', '<3 ¡LEAL!'][Math.floor(Math.random() * 4)];
    this.fx.floatText(px, py - 10, msg, 0xff78a8, 1, 'f3', 900, 16);
    audio.play('sparkle', { pitch: 1.15 });
    const sp = SPECIES[v.key];
    if (sp) audio.cry(sp.dex - 1);
    const tl = S.team.find(t => t.eid === v.id);
    const ms = tl ? S.mons.find(m => m.uid === tl.uid) : null;
    const nm = ms?.nick || SPECIES[v.key]?.name || v.key;
    bus.emit('toast', { text: `♥ ¡Has acariciado a ${nm}! Está lleno de energía (Amistad: ${ms?.fr ?? 100}/255).`, kind: 'good' });
  }

  cycleTarget() {
    const list = [...this.mons.values()].filter(v => (v.flags & 2 || v.flags & 16384) && !v.dead && !(v.flags & 8)).sort((a, b) => Math.hypot(a.x - this.me.x, a.y - this.me.y) - Math.hypot(b.x - this.me.x, b.y - this.me.y)).slice(0, 6);
    if (!list.length) return;
    const i = list.findIndex(v => v.id === S.me.focus);
    this.setFocus(list[(i + 1) % list.length].id);
    audio.play('ui', { pitch: 1.25 });
  }

  throwAtFocus() {
    audio.init();
    let id = S.me.focus;
    const v = this.mons.get(id);
    if (v?.flags & 2048) { bus.emit('toast', { text: 'Es el Pokémon de un líder: véncelo para ganar su medalla.', kind: 'info' }); return; }
    if (v?.flags & 16384 || S.duel) { bus.emit('toast', { text: 'No se pueden capturar Pokémon en un duelo.', kind: 'info' }); return; }
    if (!v || !(v.flags & 2)) {
      // capturar al salvaje más cercano y debilitado
      const near = [...this.mons.values()].filter(m => m.flags & 2 && !(m.flags & (2048 | 32 | 256)) && !(m.flags & 8 && !(m.flags & 128))).sort((a, b) => Math.hypot(a.x - this.me.x, a.y - this.me.y) - Math.hypot(b.x - this.me.x, b.y - this.me.y))[0];
      if (!near) { bus.emit('toast', { text: 'Selecciona un Pokémon salvaje (clic o Tab) para lanzar la Ball.', kind: 'info' }); return; }
      id = near.id; this.setFocus(id);
    }
    net.send({ t: 'throw', id, ball: S.settings.ball });
  }

  useSkill(n: number) {
    audio.init();
    const sk = SKILLS.find(s => s.n === n)!;
    if (!S.core || S.core.tlvl < sk.unlock) { bus.emit('toast', { text: `${sk.name} se desbloquea al nivel ${sk.unlock}.`, kind: 'info' }); return; }
    if ((S.me.cds[n] || 0) > 0) return;
    if (sk.id === 'dash') {
      const iv = this.inputVec();
      let dx = iv.x, dy = iv.y;
      if (!dx && !dy) { const d = [[0, 1], [0, -1], [-1, 0], [1, 0]][this.me.dir]; dx = d[0]; dy = d[1]; }
      net.send({ t: 'skill', n, dx, dy });
      let tx = this.me.x, ty = this.me.y;
      for (let i = 0; i < 38; i++) { const nx = tx + dx * 0.1, ny = ty + dy * 0.1; if (playerBlocked(this.world, nx, ny, this.canSurf())) break; tx = nx; ty = ny; }
      const sx = this.me.x, sy = this.me.y;
      this.me.dashing = this.time.now + 160;
      for (let i = 0; i < 4; i++) {
        const g = this.add.sprite(this.meView.sprite.x, this.meView.sprite.y, this.meView.sprite.texture.key, this.meView.sprite.frame.name).setOrigin(0.5, 0.94).setAlpha(0.5).setTint(0x80c0ff).setDepth(this.meView.sprite.depth - 1).setFlipX(this.meView.sprite.flipX);
        this.time.delayedCall(i * 35, () => { g.setPosition((sx + (tx - sx) * i / 4) * PX, (sy + (ty - sy) * i / 4) * PX); });
        this.tweens.add({ targets: g, alpha: 0, delay: i * 35, duration: 300, onComplete: () => g.destroy() });
      }
      const st = { t: 0 };
      this.tweens.add({ targets: st, t: 1, duration: 150, onUpdate: () => { this.me.x = sx + (tx - sx) * st.t; this.me.y = sy + (ty - sy) * st.t; this.sendMove(true); } });
      audio.play('dash');
      return;
    }
    net.send({ t: 'skill', n, dx: 0, dy: 0 });
  }

  nearInteractable(): { kind: string; label: string; act: () => void } | null {
    const mx = this.me.x, my = this.me.y;
    for (const npc of this.world.npcs) {
      if (Math.abs(npc.x - mx) > 4 || Math.abs(npc.y - my) > 4) continue;
      const reach = npc.role === 'nurse' || npc.role === 'clerk' ? 2.9 : 2.4; // Joy y el dependiente están tras el mostrador
      const q = this.npcAt(npc);
      if (Math.hypot(q.x - mx, q.y - my) < reach) return { kind: 'npc', label: npc.role === 'nurse' ? 'CURAR' : npc.role === 'clerk' ? 'COMPRAR' : 'HABLAR', act: () => this.talk(npc) };
    }
    for (const t of this.world.towns) {
      if (Math.hypot(t.heal.x + 0.5 - mx, t.heal.y + 0.5 - my) < 2.2) return { kind: 'heal', label: 'CENTRO POKEMON', act: () => { net.send({ t: 'heal' }); } };
      if (Math.hypot(t.shop.x + 0.5 - mx, t.shop.y + 0.5 - my) < 2.2) return { kind: 'shop', label: 'TIENDA', act: () => bus.emit('open', 'shop') };
    }
    for (const p of this.world.pickups) {
      if (Math.abs(p.x - mx) > 3 || Math.abs(p.y - my) > 3) continue;
      if (Math.hypot(p.x + 0.5 - mx, p.y + 0.7 - my) < 1.7) {
        if ((S.core?.pickups[p.id] || 0) > net.serverNow()) continue;
        const s = this.pickSprites.get(p.id);
        if (p.kind === 'item' && s && !s.visible) continue;
        return { kind: 'pickup', label: p.kind === 'chest' ? 'ABRIR' : 'RECOGER', act: () => net.send({ t: 'pickup', id: p.id }) };
      }
    }
    for (const sg of this.world.signs) {
      if (Math.hypot(sg.x + 0.5 - mx, sg.y + 0.8 - my) < 1.6) return { kind: 'sign', label: 'LEER', act: () => bus.emit('dialog', { name: 'Cartel', lines: [sg.text] }) };
    }
    for (const po of this.world.portals) {
      if (Math.hypot(po.x + 0.5 - mx, po.y + 0.5 - my) < (po.name === 'Salir' ? 1.05 : 1.6)) return { kind: 'portal', label: po.name === 'Salir' ? 'SALIR' : 'ENTRAR: ' + po.name.toUpperCase(), act: () => net.send({ t: 'portal', id: po.id }) };
    }
    return null;
  }

  interact() {
    audio.init();
    const it = this.nearInteractable();
    if (it) { audio.play('ui'); it.act(); }
  }

  talk(npc: NpcDef) {
    if (npc.role === 'leader') { bus.emit('open', 'gyms'); return; }
    if (npc.role === 'nurse') net.send({ t: 'heal' });
    if (npc.role === 'clerk') { bus.emit('open', 'shop'); return; }
    const gift = npc.gift && !S.core?.claimed.includes('gift_' + npc.id);
    bus.emit('dialog', { name: npc.name, lines: npc.lines, onEnd: gift ? () => net.send({ t: 'gift', id: npc.id }) : undefined });
  }

  // ------------------------------------------------------------ red
  refreshPlayerMeta() {
    for (const [id, v] of this.players) {
      const m = S.players.get(id);
      if (!m) continue;
      const key = ensureTrainerTexture(this, m.look);
      if (key !== v.lookKey) { v.lookKey = key; v.sprite.setTexture(key, 0); }
      v.name.setText(m.n + '  Nv.' + m.lv);
      v.name.setTint(S.party.id && m.party === S.party.id ? 0x80f0ff : 0xffffff);
    }
  }

  onSnap(m: any) {
    if (!this.inited) return;
    const t = m.ts;
    const now = this.time.now;
    // jugadores
    for (const p of m.pl) {
      const [id, x, y, dir, mov, hp, inv] = p;
      let v = this.players.get(id);
      if (!v) {
        const meta = S.players.get(id);
        v = new PlayerView(id, this, meta?.look, meta?.n || '?');
        v.name.setText((meta?.n || '?') + (meta?.lv ? '  Nv.' + meta.lv : ''));
        if (S.party.id && meta?.party === S.party.id) v.name.setTint(0x80f0ff);
        v.x = x; v.y = y;
        this.players.set(id, v);
      }
      v.buf.push({ t, x, y }); if (v.buf.length > 12) v.buf.shift();
      v.dir = dir; v.moving = !!mov; v.hp = hp; v.inv = inv; v.seenAt = now;
    }
    for (const [id, v] of this.players) if (now - v.seenAt > 1500) { v.destroy(); this.players.delete(id); }
    // pokémon
    for (const a of m.mn) {
      const [id, spIdx, x, y, hp, lvl, flags, owner, status, faceLeft] = a;
      let v = this.mons.get(id);
      const shiny = !!(flags & 1);
      if (!v) {
        v = new MonView(id, spIdx, shiny, flags, this);
        v.x = x; v.y = y;
        this.mons.set(id, v);
        if (flags & 2 && !(flags & 8)) {
          v.sprite.setAlpha(0);
          this.tweens.add({ targets: v.sprite, alpha: 1, duration: 300 });
          if (shiny && id > 0) {
            this.fx.ring(x * PX, y * PX - 8, '#fff060', 32, 700);
            this.fx.burst(x * PX, y * PX - 12, '#ffe060', 16, 'star', { speed: { min: 25, max: 80 } });
            audio.play('shiny');
            bus.emit('toast', { text: `✦ ¡${SPECIES_LIST[spIdx].name} shiny salvaje a la vista!`, kind: 'shiny' });
          }
        }
      } else if (SPECIES_LIST[spIdx].key !== v.key) v.setSpecies(spIdx, shiny);
      v.buf.push({ t, x, y }); if (v.buf.length > 12) v.buf.shift();
      if ((flags & 8) && !(v.flags & 8)) this.playFaint(v);
      if (!(flags & 8) && (v.flags & 8)) { v.dead = false; v.sprite.setAlpha(1).setAngle(0).clearTint(); v.shadow.setAlpha(1); }
      v.hp = hp; v.lvl = lvl; v.flags = flags; v.owner = owner; v.faceLeft = !!faceLeft; v.seenAt = now;
      if (v.status !== status) { v.status = status; this.updateStatusIcon(v); }
    }
    for (const [id, v] of this.mons) if (now - v.seenAt > 700) { v.destroy(); this.mons.delete(id); }
    // eventos
    for (const e of m.ev) { try { this.handleEvent(e); } catch (err) { console.warn('evento', e, err); } }
    // estado propio
    S.team = m.tm.map((a: any) => ({ uid: a[0], lvl: a[1], xp: a[2], hp: a[3], mhp: a[4], revive: a[5], status: a[6], eid: a[7] }));
    S.me = { hp: m.me[0], mhp: m.me[1], cds: m.me[2], rush: m.me[3], focus: m.me[4], stance: m.me[5] || 'attack', duel: m.me[6] || 0, fight: !!m.me[7] };
    this.syncDrops(m.dr || []);
    this.syncCamps(m.cp || []);
    S.tg = m.tg.map((g: any) => ({ id: g[0], shape: g[1], x: g[2], y: g[3], r: g[4], r2: g[5], x2: g[6], y2: g[7], w: g[8], at: this.time.now + g[9], total: g[10], fx: g[11] }));
    const fv = this.mons.get(S.me.focus);
    S.focusInfo = fv ? { id: fv.id, key: fv.key, lvl: fv.lvl, hp: fv.hp, shiny: fv.shiny, flags: fv.flags, status: fv.status } : null;
    bus.emit('snap');
  }

  campSprites = new Map<number, { tent: Phaser.GameObjects.Image; fire: Phaser.GameObjects.Image; flame: Phaser.GameObjects.Image; tw: Phaser.Tweens.Tween }>();
  /** Campamentos visibles: tienda, hoguera con llama animada, chispas y luz cálida de noche. */
  syncCamps(list: any[]) {
    const seen = new Set<number>();
    for (const [id, x, y] of list) {
      seen.add(id);
      let c = this.campSprites.get(id);
      const cx = x * PX, cy = y * PX + 6;
      if (!c) {
        const tent = this.add.image(cx - 18, cy - 2, 'tent').setOrigin(0.5, 1).setDepth(cy - 2);
        const fire = this.add.image(cx, cy + 4, 'campfire').setOrigin(0.5, 1).setDepth(cy + 3);
        const flame = this.add.image(cx, cy - 2, 'flame').setOrigin(0.5, 1).setDepth(cy + 4).setScale(1.2);
        const tw = this.tweens.add({ targets: flame, scaleX: { from: 1.05, to: 1.4 }, scaleY: { from: 1.2, to: 1.7 }, angle: { from: -7, to: 7 }, duration: 240, yoyo: true, repeat: -1 });
        c = { tent, fire, flame, tw }; this.campSprites.set(id, c);
      }
      this.campfires = this.campfires.filter(f => f.x !== cx || f.y !== cy);
      this.campfires.push({ x: cx, y: cy, until: this.time.now + 1500 });
      if (Math.random() < 0.25) this.fx.burst(cx, cy - 6, '#ffb050', 1, 'ember', { speed: { min: 6, max: 20 }, gravityY: -30, lifespan: 700 });
    }
    for (const [id, c] of this.campSprites) if (!seen.has(id)) { c.tw.stop(); c.tent.destroy(); c.fire.destroy(); c.flame.destroy(); this.campSprites.delete(id); }
  }

  dropSprites = new Map<number, Phaser.GameObjects.Image>();
  syncDrops(list: any[]) {
    const seen = new Set<number>();
    S.drops = list.map(d => ({ id: d[0], x: d[1], y: d[2], tier: d[3], mine: !!d[4] }));
    for (const d of S.drops) {
      seen.add(d.id);
      let s = this.dropSprites.get(d.id);
      if (!s) {
        s = this.add.image(d.x * PX, d.y * PX, `dropchest:${d.tier}`).setOrigin(0.5, 1).setDepth(d.y * PX);
        this.dropSprites.set(d.id, s);
      }
      s.setAlpha(d.mine ? 1 : 0.55);
    }
    for (const [id, s] of this.dropSprites) if (!seen.has(id)) { s.destroy(); this.dropSprites.delete(id); }
  }

  /** Un salvaje salta de la hierba: signo de exclamación, hojas y sonido. Los legendarios tienen entrada propia. */
  ambushFx(id: number, aggro: boolean, roamer: boolean, forMe: boolean) {
    const v = this.mons.get(id);
    const p = this.viewPos(id); if (!p) return;
    const terr = v ? this.terrainAt(v.x, v.y) : 0;
    const leaf = terr === T.TALL || terr === T.GRASS || terr === T.FOREST || terr === T.FLOWERS;
    this.fx.burst(p.x, p.y + 8, leaf ? '#6cc048' : terr === T.SAND ? '#e0c890' : '#b0a090', 10, leaf ? 'leaf' : 'dot', { speed: { min: 20, max: 60 }, gravityY: 60, lifespan: 600 });
    if (v) { v.popUntil = this.time.now + 320; v.sprite.setScale(v.sprite.scaleX * 0.4); this.tweens.add({ targets: v.sprite, scale: v.base * MON_WORLD_SIZE / MON_FRAME, duration: 260, ease: 'Back.Out' }); }
    const ex = this.add.image(p.x, p.y - 18, aggro ? 'excl' : 'excly').setDepth(22700).setScale(0.2);
    this.tweens.add({ targets: ex, scale: 1, y: p.y - 24, duration: 180, ease: 'Back.Out' });
    this.tweens.add({ targets: ex, alpha: 0, delay: 900, duration: 300, onComplete: () => ex.destroy() });
    if (roamer && v) { this.legendFx(v); return; }
    if (forMe) {
      audio.play(aggro ? 'boss' : 'event', { vol: aggro ? 0.35 : 0.5 });
      if (aggro) { this.cameras.main.shake(140, 0.0025); bus.emit('danger'); }
      bus.emit('ambush', { id, aggro });
    }
  }

  /** Entrada de un legendario: columna de luz, onda y temblor. */
  legendFx(v: MonView) {
    const x = v.x * PX, y = v.y * PX;
    const col = v.shiny ? '#fff0a0' : v.tier.color;
    const pil = this.add.image(x, y - 30, 'pillar').setDepth(21000).setTint(hex(col)).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6, 3).setAlpha(0);
    this.tweens.add({ targets: pil, alpha: 0.85, scaleX: 1.2, duration: 500, yoyo: true, hold: 900, onComplete: () => pil.destroy() });
    for (let i = 0; i < 3; i++) this.time.delayedCall(i * 260, () => this.fx.ring(x, y, col, 30 + i * 24, 700));
    this.fx.burst(x, y - 10, col, 40, 'star', { speed: { min: 30, max: 140 }, lifespan: 1400 });
    this.cameras.main.shake(600, 0.006);
    this.cameras.main.flash(350, 255, 240, 200);
    audio.play('boss'); this.time.delayedCall(500, () => audio.play('shiny'));
    bus.emit('legend_local', { key: v.key, shiny: v.shiny });
  }

  updateStatusIcon(v: MonView) {
    v.statusTxt?.destroy(); v.statusTxt = null;
    if (v.status) {
      const names = ['', 'QUE', 'ENV', 'PAR', 'DOR', 'CON'];
      v.statusTxt = this.add.bitmapText(0, 0, 'f3', names[v.status]).setOrigin(0.5, 1).setDepth(22000).setTint(STATUS_TINT[v.status]);
    }
  }

  playFaint(v: MonView) {
    v.dead = true;
    // se tambalea, cae de lado y se desvanece
    this.tweens.add({ targets: v.sprite, angle: { from: -8, to: v.faceLeft ? -78 : 78 }, duration: 420, ease: 'Back.In' });
    this.tweens.add({ targets: v.sprite, alpha: 0, delay: 260, duration: 520, ease: 'Quad.In' });
    v.sprite.setTint(0xc8c8d0);
    this.tweens.add({ targets: v.shadow, alpha: 0, delay: 300, duration: 500 });
    this.fx.burst(v.sprite.x, v.sprite.y - 10, '#ffffff', 8, 'dot', { speed: { min: 10, max: 40 }, lifespan: 600, gravityY: -40 });
    if (v.owner === S.myId) audio.play('faint');
  }

  viewPos(id: number): { x: number; y: number } | null {
    if (id < 0) {
      const pid = -id;
      if (pid === S.myId) return { x: this.me.x * PX, y: this.me.y * PX - 10 };
      const p = this.players.get(pid); return p ? { x: p.x * PX, y: p.y * PX - 10 } : null;
    }
    const v = this.mons.get(id);
    return v ? { x: v.x * PX, y: v.y * PX - v.size * v.base * 0.4 } : null;
  }

  handleEvent(e: any[]) {
    const k = e[0];
    switch (k) {
      case 'a': {
        const [, src, tgt, mi, tx, ty] = e;
        const mv = MOVE_LIST[mi]; if (!mv) return;
        const sv = this.mons.get(src);
        const a = this.viewPos(src), b = this.viewPos(tgt) || { x: tx * PX, y: ty * PX - 8 };
        if (!a) return;
        if (sv) { sv.flash = 0; sv.attackUntil = this.time.now + 260; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; sv.direction = (Math.round(Math.atan2(dx, dy) / (Math.PI / 4)) + 8) % 8; sv.lunge = { x: dx / d * (mv.kind === 'melee' ? 4 : 1), y: dy / d * (mv.kind === 'melee' ? 3 : 1) }; this.tweens.add({ targets: sv.lunge, x: 0, y: 0, duration: 220, ease: 'Quad.Out' }); }
        this.attackFx(mv, a, b, tx * PX, ty * PX);
        break;
      }
      case 'd': {
        const [, id, amt, flags] = e;
        const p = this.viewPos(id);
        if (p) this.fx.damage(p.x, p.y - 6, amt, flags, id < 0, id > 0 && this.mons.get(id)?.owner === S.myId);
        if (id > 0) {
          const v = this.mons.get(id);
          if (v) {
            v.flash = 120;
            if (flags & 1) { this.fx.hitSpark(p!.x, p!.y, 'normal', true); this.cameras.main.shake(80, 0.0018); audio.play('crit'); } else if (flags & 2) { this.fx.hitSpark(p!.x, p!.y, 'electric', false); audio.play('hit', { pitch: 1.25, vol: 0.85 }); } else if (flags & 4) { audio.play('hit', { pitch: 0.8, vol: 0.6 }); }
            if (v.owner !== S.myId && Math.hypot(v.x - this.me.x, v.y - this.me.y) < 16) {
              const nowMs = Date.now();
              const hits: { t: number; d: number }[] = ((S as any)._dmgHits ||= []);
              hits.push({ t: nowMs, d: amt });
              while (hits.length && nowMs - hits[0].t > 5000) hits.shift();
              (S as any)._maxHit = Math.max((S as any)._maxHit || 0, amt);
              (S as any)._totalDmg = ((S as any)._totalDmg || 0) + amt;
            }
          }
        }
        if (id === -S.myId) { bus.emit('hurt'); audio.play('hit', { vol: 0.6, pitch: 0.7 }); }
        break;
      }
      case 'f': break;
      case 's': {
        const [, id, code] = e;
        const p = this.viewPos(id);
        const v = this.mons.get(id);
        if (v) v.status = code;
        if (p && code > 0) {
          const info: Record<number, { text: string; col: number }> = {
            [STATUS.BURN]: { text: '¡QUEMADO!', col: 0xff6020 },
            [STATUS.POISON]: { text: '¡ENVENENADO!', col: 0xc050f0 },
            [STATUS.PARALYZE]: { text: '¡PARALIZADO!', col: 0xffd700 },
            [STATUS.SLEEP]: { text: '¡DORMIDO!', col: 0x88c0f8 },
            [STATUS.FREEZE]: { text: '¡CONGELADO!', col: 0x70e0ff },
          };
          const s = info[code];
          if (s) {
            this.fx.floatText(p.x, p.y - 18, s.text, s.col, 1.1, 'f3', 900, 20);
            this.fx.ring(p.x, p.y, '#' + s.col.toString(16).padStart(6, '0'), 24, 450);
            audio.play('warn', { pitch: 0.9 });
          }
        }
        break;
      }
      case 'rm': { const v = this.mons.get(e[1]); if (v) { v.destroy(); this.mons.delete(e[1]); } break; }
      case 'rv': { const v = this.mons.get(e[1]); if (v) { v.dead = false; v.sprite.setAlpha(1).setAngle(0).clearTint(); v.shadow.setAlpha(1); this.fx.ring(v.x * PX, v.y * PX - 8, '#80ff80', 20, 400); } break; }
      case 'x': this.synergyFx(e); break;
      case 'tgx': this.telegraphFx(e); break;
      case 'cap': this.captureFx(e); break;
      case 'ch': {
        const [, pid, who, chest] = e;
        const s = this.pickSprites.get(pid);
        if (s) { this.fx.burst(s.x, s.y - 8, '#fff0a0', 14, 'star', { speed: { min: 20, max: 70 } }); if (chest) s.setTexture(s.texture.key.replace(/:0$/, ':1')); else if (who === S.myId) s.setVisible(false); }
        if (who === S.myId) audio.play('chest');
        break;
      }
      case 'lv': {
        const p = this.viewPos(e[1]);
        if (p) {
          const v = this.mons.get(e[1]);
          const lvlTxt = e[2] ? `¡Nv. ${e[2]}!` : '¡NIVEL!';
          this.fx.ring(p.x, p.y + 8, '#ffe060', 28, 650);
          this.fx.burst(p.x, p.y - 10, '#ffe060', 14, 'star', { speed: { min: 25, max: 75 }, lifespan: 750 });
          this.fx.floatText(p.x, p.y - 14, lvlTxt, 0xffe060, 1.1, 'f3', 1100, 24);
          if (v?.owner === S.myId) {
            audio.play('levelup');
            this.time.delayedCall(220, () => {
              const curP = this.viewPos(e[1]);
              if (curP) this.fx.floatText(curP.x, curP.y - 24, '+PS +ATK +DEF', 0x88ff88, 0.9, 'f3', 900, 16);
            });
          }
        }
        break;
      }
      case 'ev': { const p = this.viewPos(e[1]); if (p) { this.fx.disc(p.x, p.y, '#ffffff', 40, 900, 0.9); this.fx.burst(p.x, p.y, '#ffffff', 20, 'star'); } break; }
      case 'sk': this.skillFx(e); break;
      case 'em': this.emote(e[1], e[2]); break;
      case 'enc': this.time.delayedCall(30, () => this.ambushFx(e[1], !!e[2], !!e[3], e[4] === S.myId)); break;
      case 'drop': {
        const [, , x, y, tier, owner] = e;
        const s = this.add.image(x * PX, y * PX - 30, `dropchest:${tier}`).setOrigin(0.5, 1).setDepth(22000);
        this.tweens.add({ targets: s, y: y * PX, duration: 420, ease: 'Bounce.Out', onComplete: () => s.destroy() });
        this.fx.burst(x * PX, y * PX - 8, '#ffe070', 14, 'star', { speed: { min: 20, max: 70 } });
        if (owner === S.myId) { audio.play('chest', { vol: 0.6 }); bus.emit('toast', { text: '¡El Pokémon ha soltado un cofre! Pasa por encima para abrirlo.', kind: 'shiny' }); }
        break;
      }
      case 'dropx': { const s = this.dropSprites.get(e[1]); if (s) { this.fx.burst(s.x, s.y - 8, '#fff0a0', 16, 'star', { speed: { min: 20, max: 80 } }); s.destroy(); this.dropSprites.delete(e[1]); } break; }
      case 'sp': {
        const p = this.viewPos(e[1]);
        if (p) { this.fx.burst(p.x, p.y, e[2] ? '#fff070' : '#a0d0ff', 18, 'star', { speed: { min: 20, max: 80 }, lifespan: 900 }); this.fx.ring(p.x, p.y, e[2] ? '#fff070' : '#a0d0ff', 26, 700); }
        if (e[2]) { audio.play('shiny'); bus.emit('toast', { text: '✦ ¡Un Pokémon shiny ha aparecido cerca!', kind: 'shiny' }); }
        break;
      }
      case 'tp': {
        const id = e[1];
        this.fx.ring(e[2] * PX, e[3] * PX - 8, id < 0 ? '#ff80ff' : '#a0e0ff', 24, 450);
        this.fx.burst(e[2] * PX, e[3] * PX - 8, '#c0e8ff', 10, 'spark');
        break;
      }
      case 'rw': {
        const [, mid, money, xp, essT, essN] = e;
        const p = this.viewPos(mid) || { x: this.me.x * PX, y: this.me.y * PX - 20 };
        this.fx.floatText(p.x - (xp ? 8 : 0), p.y - 14, '+' + money + 'P', 0xffd848, 1, 'f3', 900, 14);
        if (xp) this.fx.floatText(p.x + 12, p.y - 19, '+' + xp + ' EXP', 0x78d8ff, 0.9, 'f3', 950, 16);
        if (essT && essN > 0) {
          const ecol = (TYPE_COLORS as any)[essT] || '#a8f0c0';
          this.fx.floatText(p.x, p.y - 30, `+${essN} Esencia ${(TYPE_NAMES as any)[essT] || essT}`, hex(ecol), 0.95, 'f3', 1100, 18);
          this.fx.burst(p.x, p.y - 10, ecol, 8, 'spark', { speed: { min: 15, max: 45 }, gravityY: -25 });
        }
        if (Math.random() < 0.35) audio.play('coin', { vol: 0.5 });
        const now = this.time.now;
        const st = (now - ((this as any)._stAt || 0) < 18000) ? (((this as any)._st || 0) + 1) : 1;
        (this as any)._st = st; (this as any)._stAt = now; (S as any)._st = st;
        if (st >= 3) {
          this.fx.floatText(p.x, p.y - (essT && essN > 0 ? 41 : 28), `¡RACHA x${st}!`, 0xffb030, 1, 'f3', 850, 18);
          if (st % 5 === 0) audio.play('statup', { vol: 0.55 });
        }
        bus.emit('streak', st);
        break;
      }
      case 'pf': { const p = this.viewPos(-e[1]); if (p) this.fx.burst(p.x, p.y, '#ffffff', 16, 'dot'); if (e[1] === S.myId) audio.play('faint'); break; }
      case 'tl': { const p = this.viewPos(-e[1]); if (p) { this.fx.ring(p.x, p.y, '#80ffff', 40, 800); this.fx.burst(p.x, p.y, '#80ffff', 24, 'star'); } break; }
      case 'bs': {
        const p = this.viewPos(e[1]);
        if (!p) return;
        if (e[2] === 'enrage') { this.fx.ring(p.x, p.y, '#ff3030', 60, 700); this.cameras.main.shake(300, 0.004); audio.play('boss'); this.fx.floatText(p.x, p.y - 40, '¡FURIA!', 0xff4040, 2, 'f3', 1500, 20); }
        else if (e[2] === 'stagger') { this.fx.floatText(p.x, p.y - 40, '¡ATURDIDO!', 0xfff060, 2, 'f3', 1500, 20); this.fx.burst(p.x, p.y - 20, '#fff060', 16, 'star'); }
        break;
      }
      case 'bsp': { const p = this.viewPos(e[1]); if (p) { this.fx.ring(p.x, p.y, '#ff4040', 70, 900); audio.play('boss'); } break; }
      case 'bd': { const p = this.viewPos(e[1]); if (p) { this.fx.explosion(p.x / PX * PX, p.y, 4, '#fff0a0'); this.fx.burst(p.x, p.y, '#fff0a0', 40, 'star', { speed: { min: 40, max: 160 }, lifespan: 1200 }); } audio.play('evodone'); break; }
    }
  }

  attackFx(mv: any, a: { x: number; y: number }, b: { x: number; y: number }, tx: number, ty: number) {
    const col = TYPE_COLORS[mv.type as keyof typeof TYPE_COLORS] || '#ffffff';
    const fxk: string = mv.fx;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const travel = (dist / PX) / (mv.speed || 10) * 1000;
    const onSee = Math.abs(a.x / PX - this.me.x) < 22 && Math.abs(a.y / PX - this.me.y) < 16;
    if (onSee) audio.playType(mv.type);
    switch (mv.kind) {
      case 'melee':
        this.time.delayedCall(140, () => this.fx.hitSpark(b.x, b.y, mv.type));
        if (fxk === 'slash' || fxk === 'dragonslash' || fxk === 'cross' || fxk === 'psycut') {
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          this.time.delayedCall(80, () => this.fx.slash(b.x, b.y, col, ang, fxk === 'cross' ? 1.6 : 1.2));
          if (fxk === 'cross') this.time.delayedCall(120, () => this.fx.slash(b.x, b.y, col, ang + Math.PI / 2, 1.4));
        }
        if (fxk === 'vine') this.fx.beam(a.x, a.y, b.x, b.y, '#58c048', 2, 180);
        if (fxk === 'dash' || fxk === 'flaredash' || fxk === 'dive') this.fx.beam(a.x, a.y, b.x, b.y, col, 4, 250);
        break;
      case 'proj': {
        const tex = ({
          fire: 'flame', water: 'drop', bubble: 'bubble', leaf: 'leaf', leaves: 'leaf',
          spark: 'bolt', bolt: 'bolt', rock: 'rockbit', bone: 'bone', moon: 'star',
          fairy: 'heart', string: 'dot', shadowball: 'shadoworb', shadow: 'shadoworb',
          ice: 'frost', sludge: 'sludge', poison: 'sludge', meteor: 'meteor',
        } as any)[fxk] || 'orb';
        const tint = tex === 'orb' || tex === 'star' || tex === 'dot' ? col : null;
        const n = mv.hits || 1;
        for (let i = 0; i < n; i++) {
          this.time.delayedCall(i * 140, () => this.fx.projectile(tex, tint, a.x, a.y, b.x + (i ? (Math.random() - 0.5) * 6 : 0), b.y, travel, {
            spin: tex === 'bone' || tex === 'leaf' || tex === 'rockbit' || tex === 'star' || tex === 'frost' || tex === 'meteor',
            trail: col, arc: tex === 'rockbit' || tex === 'sludge' ? 10 : 0,
          }));
        }
        this.time.delayedCall(travel, () => {
          this.fx.hitSpark(b.x, b.y, mv.type);
          if (tex === 'frost') this.fx.burst(b.x, b.y, '#d8f4ff', 6, 'frost');
          if (tex === 'shadoworb') this.fx.burst(b.x, b.y, '#9050e0', 8, 'dot');
          if (tex === 'sludge') this.fx.burst(b.x, b.y, '#8038b0', 8, 'dot');
          if (tex === 'heart') this.fx.burst(b.x, b.y, '#ffa0c0', 5, 'heart');
          if (tex === 'meteor') this.fx.groundFissure(b.x, b.y, '#ff6020', 250);
        });
        break;
      }
      case 'aoe': {
        const r = mv.radius || 1.5;
        if (fxk === 'thunder') {
          this.time.delayedCall(200, () => {
            this.fx.lightning([{ x: tx, y: ty - 120 }, { x: tx + 6, y: ty - 60 }, { x: tx, y: ty }], '#fff060');
            this.fx.ring(tx, ty, '#fff060', r * 20, 250);
          });
        }
        if (fxk === 'blast') {
          this.time.delayedCall(150, () => {
            for (let i = 0; i < 5; i++) {
              const a = i * Math.PI * 2 / 5 - Math.PI / 2;
              this.fx.projectile('flame', null, tx, ty, tx + Math.cos(a) * r * 24, ty + Math.sin(a) * r * 24, 220);
            }
          });
        }
        if (fxk === 'meteor' || fxk === 'rockslide' || fxk === 'stoneedge') {
          for (let i = 0; i < 4; i++) {
            this.fx.projectile(fxk === 'meteor' ? 'meteor' : 'rockbit', null, tx + (Math.random() - 0.5) * 36, ty - 100, tx + (Math.random() - 0.5) * r * 20, ty, 280, { spin: true, trail: fxk === 'meteor' ? '#ff7030' : undefined });
          }
          this.time.delayedCall(280, () => this.fx.groundFissure(tx, ty, fxk === 'meteor' ? '#ff6020' : '#8a7a60'));
        }
        this.time.delayedCall(320, () => { this.fx.explosion(tx, ty, r, col); if (onSee) audio.play('boom', { vol: 0.5 }); });
        break;
      }
      case 'nova': {
        const r = (mv.radius || 2) * PX;
        if (fxk === 'quake') this.fx.groundFissure(a.x, a.y + 6, '#8b6840', 500);
        if (fxk === 'wave') {
          for (let i = 0; i < 3; i++) this.time.delayedCall(i * 90, () => this.fx.ripple(a.x, a.y + 6, '#78c8f8', r * (0.4 + i * 0.3), 350));
        }
        this.time.delayedCall(200, () => {
          this.fx.ring(a.x, a.y + 6, col, r, 450); this.fx.disc(a.x, a.y + 6, col, r, 400, 0.4);
          this.fx.burst(a.x, a.y, col, 20, fxk === 'petals' ? 'petal' : fxk === 'sing' ? 'note' : fxk === 'blizzard' ? 'frost' : 'px', { speed: { min: 60, max: 60 + r * 4 } });
          if (fxk === 'quake' || fxk === 'explosion') this.cameras.main.shake(250, 0.005);
          if (fxk === 'explosion' && onSee) audio.play('boom');
        });
        break;
      }
      case 'beam': {
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, len = (mv.range + 0.8) * PX;
        if (fxk === 'hyperbeam' || fxk === 'solarbeam') {
          this.fx.chargeAura(a.x, a.y, fxk === 'solarbeam' ? '#a0ff60' : '#ffffff', 260);
          this.time.delayedCall(280, () => {
            this.fx.beam(a.x, a.y, a.x + dx / d * len, a.y + dy / d * len, col, (mv.radius || 1) * 16, 420);
            this.cameras.main.shake(180, 0.0035);
          });
        } else {
          this.time.delayedCall(120, () => this.fx.beam(a.x, a.y, a.x + dx / d * len, a.y + dy / d * len, col, (mv.radius || 1) * 10, 320));
        }
        break;
      }
      case 'self': this.fx.burst(a.x, a.y + 4, '#a8e0ff', 6, 'drop', { speed: { min: 30, max: 60 }, gravityY: 200 }); break;
    }
  }

  synergyFx(e: any[]) {
    const kind = e[1];
    switch (kind) {
      case 'chain': {
        const pts = [this.viewPos(e[2]), ...(e[3] as number[]).map(id => this.viewPos(id))].filter(Boolean) as any[];
        if (pts.length > 1) this.fx.lightning(pts);
        break;
      }
      case 'firestorm': this.fx.explosion(e[2] * PX, e[3] * PX - 6, 2.2, '#ff7020'); audio.play('boom', { vol: 0.5 }); this.fx.floatText(e[2] * PX, e[3] * PX - 30, 'FIRESTORM', 0xff8040, 1, 'f3', 800); break;
      case 'surge': {
        const [x, y, x2, y2, w] = [e[2] * PX, e[3] * PX, e[4] * PX, e[5] * PX, e[6] * PX];
        this.fx.beam(x, y, x2, y2, '#58a0f8', w, 500);
        for (let i = 0; i < 10; i++) { const t = i / 10; this.fx.burst(x + (x2 - x) * t, y + (y2 - y) * t, '#c8e8ff', 3, 'bubble', { speed: { min: 20, max: 60 } }); }
        this.fx.floatText(x, y - 30, 'OCEAN SURGE', 0x80c0ff, 1, 'f3', 800); audio.play('water');
        break;
      }
      case 'rift': {
        const p = this.viewPos(e[2]); if (!p) return;
        const img = this.add.image(p.x + 14, p.y - 14, 'portal').setDepth(14000).setScale(0.1).setAlpha(0.9);
        this.tweens.add({ targets: img, scale: 0.6, angle: 180, duration: 300, yoyo: true, onComplete: () => img.destroy() });
        this.time.delayedCall(420, () => this.fx.projectile('orb', '#a070e0', p.x + 14, p.y - 14, p.x, p.y, 120));
        break;
      }
      case 'bloom': {
        const pid = e[2];
        for (const v of this.mons.values()) if (v.owner === pid && !v.dead) this.fx.burst(v.x * PX, v.y * PX - 8, '#90f070', 5, 'leaf', { speed: { min: 10, max: 30 }, gravityY: -30 });
        break;
      }
      case 'heal': { const p = this.viewPos(-e[2]); if (p) { this.fx.burst(p.x, p.y, '#80ff90', 14, 'spark', { gravityY: -60 }); if (e[2] === S.myId) audio.play('heal'); } break; }
      case 'camp': {
        const cx = e[3] * PX, cy = e[4] * PX + 8;
        this.fx.ring(cx, cy, '#ff8030', 32, 850);
        this.fx.burst(cx, cy - 6, '#ffa040', 24, 'ember', { speed: { min: 20, max: 70 }, gravityY: -35 });
        this.fx.floatText(cx, cy - 26, 'CAMPAMENTO', 0xffb040, 1, 'f3', 1100);
        for (let i = 1; i <= 3; i++) {
          this.time.delayedCall(i * 1000, () => {
            if (!this.inited) return;
            this.fx.burst(cx, cy - 6, '#ffa840', 5, 'ember', { speed: { min: 10, max: 35 }, gravityY: -30, lifespan: 600 });
            if (i % 3 === 0) this.fx.ring(cx, cy, '#ff9840', 22, 600);
          });
        }
        audio.play('heal');
        break;
      }
      case 'poof': this.fx.burst(e[2] * PX, e[3] * PX, '#e0e0e0', 14, 'dot'); break;
      case 'duel': this.fx.ring(e[2] * PX, e[3] * PX, '#ffd060', e[4] * PX, 900); this.fx.burst(e[2] * PX, e[3] * PX, '#ffd060', 24, 'star'); audio.play('event'); break;
      case 'portal': { this.fx.ring(e[2] * PX, e[3] * PX, '#b070ff', 50, 800); this.fx.burst(e[2] * PX, e[3] * PX, '#b070ff', 30, 'star'); audio.play('event'); break; }
    }
  }

  telegraphFx(e: any[]) {
    const [, , fxk, shape, x, y, r, r2, x2, y2, w] = e;
    const col = ({ slam: '#c8a070', yawn: '#f8b0d0', hydro: '#58a0f8', whirl: '#58a0f8', dragon: '#9058f8', flame: '#ff7020', fire: '#ff7020', hyperbeam: '#fff0a0', wind: '#e0f0ff', rock: '#b8a070', dig: '#a08050', shadow: '#8050c0', psy: '#f070c0' } as any)[fxk] || '#ffffff';
    const near = Math.abs(x - this.me.x) < 24 && Math.abs(y - this.me.y) < 18;
    if (shape === 'circle') this.fx.explosion(x * PX, y * PX, r, col);
    else if (shape === 'ring') { this.fx.ring(x * PX, y * PX, col, r2 * PX, 500); this.fx.ring(x * PX, y * PX, '#ffffff', r * PX, 400); }
    else this.fx.beam(x * PX, y * PX, x2 * PX, y2 * PX, col, w * PX, 450);
    if (near) { audio.play('boom', { vol: 0.6 }); this.cameras.main.shake(160, 0.004); }
  }

  captureFx(e: any[]) {
    const [, pid, mid, bi, shakes, success, mx, my, critical] = e;
    const from = this.viewPos(-pid) || { x: mx * PX, y: my * PX };
    const to = { x: mx * PX, y: my * PX - 6 };
    const ball = this.add.image(from.x, from.y - 6, BALL_TEX[bi] || 'ball').setDepth(16000);
    const v = this.mons.get(mid);
    const st = { t: 0 };
    if (pid === S.myId) audio.play('throw');
    this.tweens.add({
      targets: st, t: 1, duration: 450,
      onUpdate: () => { ball.x = from.x + (to.x - from.x) * st.t; ball.y = from.y - 6 + (to.y - from.y + 6) * st.t - Math.sin(st.t * Math.PI) * 26; ball.rotation += 0.4; },
      onComplete: () => {
        ball.rotation = 0;
        this.fx.disc(to.x, to.y, critical ? '#60f0ff' : '#ff6060', critical ? 24 : 18, 300, 0.85);
        if (critical) {
          this.fx.burst(to.x, to.y - 4, '#60f0ff', 12, 'spark', { speed: { min: 25, max: 70 } });
          if (pid === S.myId) audio.play('sparkle');
        }
        if (v) { this.tweens.add({ targets: v.sprite, scale: 0.05, alpha: 0, duration: 220 }); }
        this.tweens.add({ targets: ball, y: to.y + 4, duration: 200, ease: 'Bounce.Out' });
        for (let i = 0; i < shakes; i++) {
          this.time.delayedCall(350 + i * 520, () => {
            this.tweens.add({ targets: ball, angle: { from: -25, to: 25 }, duration: 120, yoyo: true, repeat: 1, onComplete: () => ball.setAngle(0) });
            if (pid === S.myId) audio.play('shake');
          });
        }
        this.time.delayedCall(350 + shakes * 520 + 120, () => {
          if (success) {
            this.fx.burst(ball.x, ball.y - 4, critical ? '#60f0ff' : '#fff070', critical ? 22 : 14, 'star', { speed: { min: 20, max: 75 }, lifespan: 950 });
            if (critical) this.fx.floatText(ball.x, ball.y - 18, '¡CAPTURA CRÍTICA!', 0x60f0ff, 1.15, 'f3', 1100, 20);
            else if (pid === S.myId) this.fx.floatText(ball.x, ball.y - 18, '¡CAPTURADO!', 0x58f080, 1.1, 'f3', 1050, 18);
            if (pid === S.myId) audio.play('catch');
            this.tweens.add({ targets: ball, alpha: 0, delay: 600, duration: 300, onComplete: () => ball.destroy() });
          } else {
            this.fx.burst(ball.x, ball.y, '#ffffff', 12, 'dot');
            if (v) { v.sprite.setScale(v.base * MON_WORLD_SIZE / MON_FRAME).setAlpha(1); this.fx.ring(ball.x, ball.y, '#ffffff', 20, 300); }
            if (pid === S.myId) {
              audio.play('escape');
              this.fx.floatText(ball.x, ball.y - 16, '¡ESCAPÓ!', 0xff8888, 1, 'f3', 850, 16);
            }
            ball.destroy();
          }
        });
      },
    });
  }

  skillFx(e: any[]) {
    const [, pid, n] = e;
    const p = this.viewPos(-pid); if (!p) return;
    const mine = pid === S.myId;
    if (n === 1) { this.fx.ring(p.x, p.y, '#ff6030', 40, 500); for (const v of this.mons.values()) if (v.owner === pid) this.fx.burst(v.x * PX, v.y * PX - 8, '#ff7040', 8, 'spark'); if (mine) audio.play('crit'); }
    if (n === 2) { this.fx.disc(p.x, p.y, '#70ff90', 50, 600, 0.5); for (const v of this.mons.values()) if (v.owner === pid) this.fx.burst(v.x * PX, v.y * PX - 8, '#80ff90', 10, 'spark', { gravityY: -60 }); if (mine) audio.play('heal'); }
    if (n === 3) { this.fx.ring(p.x, p.y, '#ffe040', 60, 600); this.fx.burst(p.x, p.y, '#ffe040', 20, 'star'); if (mine) audio.play('event'); }
    if (n === 4 && !mine) this.fx.burst(p.x, p.y, '#80c0ff', 10, 'dot');
  }

  emote(pid: number, e: number) {
    const v = pid === S.myId ? this.meView : this.players.get(pid);
    if (!v) return;
    const txt = ['!', '?', '<3', ':)', ':(', 'ZZZ', '...', 'GG', 'AYUDA!', 'HOLA!'][e] || '!';
    v.bubble?.destroy();
    const t = this.add.bitmapText(0, -2, 'f3', txt).setOrigin(0.5, 1).setTint(e === 2 ? 0xff4060 : 0x202030);
    const g = this.add.graphics();
    const w = t.width + 6, h = 11;
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(-w / 2, -h - 1, w, h, 3); g.lineStyle(1, 0x202030, 1); g.strokeRoundedRect(-w / 2, -h - 1, w, h, 3);
    g.fillTriangle(-2, -1, 2, -1, 0, 2);
    const c = this.add.container(0, 0, [g, t]).setDepth(22600);
    v.bubble = c;
    this.time.delayedCall(2500, () => { if (v.bubble === c) { c.destroy(); v.bubble = null; } });
    audio.play('ui');
  }

  evolveFxOnTeam(d: any) {
    for (const v of this.mons.values()) if (v.owner === S.myId) { this.fx.burst(v.x * PX, v.y * PX - 10, '#ffffff', 10, 'star'); }
  }

  // ------------------------------------------------------------ bucle
  sendMove(force = false) {
    const now = this.time.now;
    const m = this.me;
    const changed = Math.abs(m.x - m.sentX) > 0.01 || Math.abs(m.y - m.sentY) > 0.01 || m.dir !== m.sentDir || m.moving !== m.sentMov;
    if (!changed) return;
    if (!force && now - m.lastSend < 60) return;
    m.lastSend = now; m.sentX = m.x; m.sentY = m.y; m.sentDir = m.dir; m.sentMov = m.moving;
    net.send({ t: 'mv', x: Math.round(m.x * 100) / 100, y: Math.round(m.y * 100) / 100, d: m.dir, m: m.moving ? 1 : 0, s: m.seq });
  }

  terrainAt(x: number, y: number) { const tx = Math.floor(x), ty = Math.floor(y); if (tx < 0 || ty < 0 || tx >= this.world.w || ty >= this.world.h) return 0; return this.world.terrain[ty * this.world.w + tx]; }

  update(time: number, delta: number) {
    pumpMonTextures();
    if (!this.inited) return;
    const dt = Math.min(0.05, delta / 1000);
    this.frameDt = dt;
    const m = this.me;
    // movimiento local (predicción)
    if (S.me.hp > 0 && time > m.dashing) {
      const v = this.inputVec();
      m.moving = !!(v.x || v.y);
      if (m.moving) {
        const sp = PLAYER_SPEED * dt;
        const nx = m.x + v.x * sp, ny = m.y + v.y * sp;
        const surf = this.canSurf();
        if (!playerBlocked(this.world, nx, m.y, surf)) m.x = nx;
        if (!playerBlocked(this.world, m.x, ny, surf)) m.y = ny;
        if (Math.abs(v.x) > Math.abs(v.y)) m.dir = v.x < 0 ? 2 : 3; else m.dir = v.y < 0 ? 1 : 0;
        if (time > m.stepAt) {
          m.stepAt = time + 280;
          const terr = this.terrainAt(m.x, m.y);
          if (terr === T.TALL) {
            this.fx.burst(m.x * PX, m.y * PX - 2, '#6cc048', 3, 'leaf', { speed: { min: 10, max: 30 }, gravityY: 30, lifespan: 500 });
            audio.play('step', { vol: 0.35, pitch: 1.4 });
          } else if (terr === T.SAND || terr === T.SNOW || this.zoneId === 16) {
            this.fx.burst(m.x * PX, m.y * PX, terr === T.SNOW || this.zoneId === 16 ? '#d0e0f0' : '#d8c490', 2, 'dot', { speed: { min: 4, max: 15 }, lifespan: 220, scale: { start: 0.8, end: 0.1 } });
            this.visuals?.footprint(m.x, m.y, m.dir, terr === T.SNOW || this.zoneId === 16);
          } else if (terr === T.WATER || terr === T.SWAMP) {
            this.fx.ripple(m.x * PX, m.y * PX, '#a0d8ff', 10, 320);
            this.fx.burst(m.x * PX, m.y * PX - 2, '#c0e8ff', 2, 'dot', { speed: { min: 4, max: 14 }, gravityY: 20, lifespan: 220, scale: { start: 0.6, end: 0.1 } });
          } else if (!this.fx.low && (terr === T.PATH || terr === T.ROCK || terr === T.CLIFF)) {
            this.fx.burst(m.x * PX, m.y * PX, '#c0b098', 1, 'dot', { speed: { min: 2, max: 10 }, lifespan: 180, scale: { start: 0.6, end: 0.1 } });
          }
          if (!this.fx.low && S.core?.links?.length) {
            const lCol = LINK_MAP[S.core.links[0].id]?.color || '#ffd866';
            this.fx.burst(m.x * PX, m.y * PX - 6, lCol, 1, 'spark', { speed: { min: 6, max: 18 }, gravityY: -18, lifespan: 260, scale: { start: 0.55, end: 0 } });
          }
        }
      }
      this.sendMove();
      // portales automáticos
      if (m.moving && !document.querySelector('.win, .dialog') && time > m.portalAt) {
        for (const po of this.world.portals) if (Math.abs(po.x + 0.5 - m.x) < 0.6 && Math.abs(po.y + 0.5 - m.y) < 0.7) { m.portalAt = time + 1500; net.send({ t: 'portal', id: po.id }); }
      }
    }
    // jugador propio
    const mv = this.meView;
    this.drawTrainer(mv, m.x, m.y, m.dir, m.moving, time, S.me.hp);
    // otros jugadores
    const rt = net.serverNow() - INTERP_DELAY;
    for (const p of this.players.values()) {
      const s = sample(p.buf, rt); p.x = s.x; p.y = s.y;
      this.drawTrainer(p, p.x, p.y, p.dir, p.moving, time, p.hp);
    }
    // pokémon
    this.epicGfx ||= this.add.graphics().setDepth(-28);
    this.epicGfx.clear();
    for (const v of this.mons.values()) this.drawMon(v, rt, time);
    // objetivo
    const fv = this.mons.get(S.me.focus);
    if (fv && !fv.dead) {
      const ringCol = fv.shiny ? 0xffd700 : S.me.fight ? 0xff4040 : 0x60d8ff;
      this.selRing.setTint(ringCol).setVisible(true).setPosition(fv.x * PX, fv.y * PX + 1).setScale(fv.size * fv.base / 36);
      this.selRing.setAlpha(0.65 + Math.sin(time / 150) * 0.25);
    } else this.selRing.setVisible(false);
    // pista de interacción
    const it = this.nearInteractable();
    if (it) this.hint.setVisible(true).setText('[E] ' + it.label).setScale(this.txtScale).setPosition(m.x * PX, m.y * PX - 33);
    else this.hint.setVisible(false);
    // chunks
    this.updateChunks();
    this.loadNextChunk();
    // agua animada
    const wv = this.cameras.main.worldView;
    this.water.setPosition(Math.floor(wv.x / 64) * 64 - 64, Math.floor(wv.y / 64) * 64 - 64);
    this.water.setSize(wv.width + 192, wv.height + 192);
    const wf = Math.floor(time / 260) % 4;
    if (wf !== this.waterFrame) { this.waterFrame = wf; this.water.setTexture('water' + wf); }
    this.drawTelegraphs(time);
    this.drawBars();
    this.drawLinks(time);
    this.drawNavigation(time, delta);
    this.updateRoomMask();
    this.updateNpcs(time);
    this.updateNight(time);
    this.updateZone();
    this.updateWeather();
    this.updateFoliage(time);
    this.visuals?.update(time, dt);
    // ítems flotantes
    for (const [id, s] of this.pickSprites) { const p = this.world.pickups[id - 1]; if (p.kind === 'item') s.y = (p.y + 1) * PX - 2 + Math.sin(time / 300 + id) * 1.5; }
  }

  updateFoliage(time: number) {
    const enabled = S.settings.vfx !== false && S.settings.particles !== 'low';
    const z = ZONES[this.zoneId];
    const wind = z && weatherAt(z.id, net.serverNow(), z.kind) === 'wind';
    for (const [img, f] of this.foliage) {
      const amplitude = (f.palm ? 0.013 : 0.006) * (wind ? 2 : 1);
      img.setRotation(enabled ? Math.sin(time / 1500 + f.phase) * amplitude + Math.sin(time / 680 + f.phase) * amplitude * 0.18 : 0);
    }
  }

  npcShadows = new Map<number, Phaser.GameObjects.Image>();
  npcAt(npc: NpcDef) { return npcPos(this.world, npc, net.serverNow()); }
  /** Los vecinos pasean (posición calculada igual en todos los clientes) y se giran hacia ti al hablar. */
  updateNpcs(time: number) {
    const now = net.serverNow();
    for (const [id, s] of this.npcSprites) {
      const npc = this.world.npcs[id - 1];
      if (!npc || npc.id !== id) continue;
      const q = npcPos(this.world, npc, now);
      const px = q.x * PX, py = (q.y + 0.5) * PX;
      s.setPosition(px, py).setDepth(py);
      let dir = q.dir;
      const dx = this.me.x - q.x, dy = this.me.y - q.y;
      if (!q.moving && Math.hypot(dx, dy) < 2.6) dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
      const base = dir === 0 ? 0 : dir === 1 ? 3 : 6;
      s.setFrame(base + (q.moving ? [1, 0, 2, 0][Math.floor(time / 140 + id) % 4] : 0)).setFlipX(dir === 3);
      this.npcShadows.get(id)?.setPosition(px, py - 1);
      this.npcNames.get(id)?.setPosition(px, py - 29);
    }
  }

  roomMask!: Phaser.GameObjects.Graphics;
  /** Dentro de un edificio solo se ve su habitación: el resto queda a oscuras. */
  updateRoomMask() {
    if (!this.roomMask) this.roomMask = this.add.graphics().setDepth(22050);
    const g = this.roomMask; g.clear();
    if (this.zoneId !== 21) return;
    const r = this.world.rooms.find(o => this.me.x >= o.x && this.me.x < o.x + o.w && this.me.y >= o.y && this.me.y < o.y + o.h);
    if (!r) return;
    const v = this.cameras.main.worldView, x0 = r.x * PX, y0 = r.y * PX, x1 = (r.x + r.w) * PX, y1 = (r.y + r.h) * PX;
    const L = v.x - 64, T0 = v.y - 64, R = v.right + 64, B = v.bottom + 64;
    g.fillStyle(0x07060a, 1);
    g.fillRect(L, T0, R - L, y0 - T0); g.fillRect(L, y1, R - L, B - y1); g.fillRect(L, y0, x0 - L, y1 - y0); g.fillRect(x1, y0, R - x1, y1 - y0);
  }

  drawNavigation(time: number, delta: number) {
    const g = this.routeGfx; g.clear();
    const du = S.duel;
    if (du) {
      const cx = du.cx * PX, cy = du.cy * PX, r = du.r * PX;
      g.fillStyle(du.go ? 0xff4040 : 0xffd060, 0.05); g.fillCircle(cx, cy, r);
      const n = 48, rot = time / 2400;
      g.lineStyle(2, du.go ? 0xff5050 : 0xffd060, 0.75);
      for (let i = 0; i < n; i += 2) { const a0 = rot + i / n * Math.PI * 2, a1 = rot + (i + 1) / n * Math.PI * 2; g.lineBetween(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r); }
      if (Math.hypot(this.me.x - du.cx, this.me.y - du.cy) > du.r - 1.5 && Math.floor(time / 300) % 2 === 0) bus.emit('danger');
    }
    if (this.walkPath.length) {
      if (Math.hypot(this.me.x - this.lastPathPos.x, this.me.y - this.lastPathPos.y) < 0.005) this.pathStuck += delta;
      else this.pathStuck = 0;
      this.lastPathPos = { x: this.me.x, y: this.me.y };
      if (this.pathStuck > 900) { this.walkPath = []; return; }
      g.fillStyle(0xd3efaf, 0.7);
      for (const p of this.walkPath.slice(0, 24)) g.fillCircle(p.x * PX, p.y * PX, 1);
      const end = this.walkPath[this.walkPath.length - 1];
      g.lineStyle(1, 0xd3efaf, 0.8); g.strokeCircle(end.x * PX, end.y * PX, 5 + Math.sin(time / 180));
    }
    this.drawRoute(g, time);
  }

  beaconGfx!: Phaser.GameObjects.Graphics;
  routeKey = ''; routeAt = 0; routeFails = 0;
  /** Ruta guiada: se recalcula cuando cambias de destino o te sales del camino, y se dibuja como flechas en el suelo. */
  drawRoute(g: Phaser.GameObjects.Graphics, time: number) {
    if (!this.beaconGfx) this.beaconGfx = this.add.graphics().setDepth(21900);
    const bg = this.beaconGfx; bg.clear();
    const mark = S.waypoint;
    if (!mark) { S.route = null; this.routeKey = ''; return; }
    const d = Math.hypot(mark.x - this.me.x, mark.y - this.me.y);
    if (d < 2) { S.waypoint = null; S.route = null; audio.play('quest'); this.fx.ring(this.me.x * PX, this.me.y * PX, '#ffe5a4', 26, 700); bus.emit('toast', { text: '📍 Destino alcanzado: ' + mark.name, kind: 'good' }); return; }
    if ((mark.x < 400) !== (this.me.x < 400)) { S.route = null; return; }   // dentro de un edificio o cueva: primero sal
    const key = mark.x + ',' + mark.y + ',' + this.canSurf();
    let near = S.route ? nearestOnRoute(S.route, this.me) : null;
    const stale = key !== this.routeKey || !S.route || (near && near.dist > 2.6);
    if (stale && time - this.routeAt > (this.routeFails ? 4000 : 600)) {
      this.routeAt = time; this.routeKey = key;
      const r = findRoute(this.world, this.me, mark, this.canSurf());
      S.route = r; this.routeFails = r ? 0 : this.routeFails + 1;
      if (!r && this.routeFails === 1) bus.emit('toast', { text: 'No hay camino a pie hasta ' + mark.name + (this.canSurf() ? '.' : '. Quizá necesites un Pokémon de agua para nadar.'), kind: 'info' });
      near = r ? nearestOnRoute(r, this.me) : null;
    }
    const route = S.route;
    if (route && near && near.index > 0) route.splice(0, near.index);
    S.routeLen = route ? routeLength(route) + Math.hypot(route[0].x - this.me.x, route[0].y - this.me.y) : d;
    const view = this.cameras.main.worldView;
    if (route && route.length > 1) {
      // flechas que avanzan por el camino: doradas cerca, se desvanecen a lo lejos
      // rastro luminoso continuo bajo las flechas
      g.lineStyle(5, 0xffd860, 0.13); g.beginPath(); g.moveTo(this.me.x * PX, this.me.y * PX);
      for (let i = 0; i < Math.min(route.length, 70); i++) g.lineTo(route[i].x * PX, route[i].y * PX);
      g.strokePath();
      const SP = 1.3, flow = (time / 650) % 1;
      let acc = 0, next = SP * (1 - flow), shown = 0;
      for (let i = 1; i < route.length && shown < 90; i++) {
        const a = route[i - 1], b = route[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
        while (next <= acc + seg && shown < 90) {
          const t = (next - acc) / seg, x = (a.x + (b.x - a.x) * t) * PX, y = (a.y + (b.y - a.y) * t) * PX;
          next += SP; shown++;
          if (x < view.x - 16 || x > view.right + 16 || y < view.y - 16 || y > view.bottom + 16) continue;
          // dirección suavizada (mira un par de casillas adelante)
          const c = route[Math.min(route.length - 1, i + 1)], ang = Math.atan2(c.y - a.y, c.x - a.x);
          const fade = Math.max(0.22, 1 - shown / 70), s = 4.2;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          g.fillStyle(0x2a1a00, 0.35 * fade);
          g.fillCircle(x, y + 1, 4.2);
          g.fillStyle(0xffd860, 0.9 * fade);
          g.fillTriangle(x + ca * s * 1.3, y + sa * s * 1.3, x - ca * s + sa * s, y - sa * s - ca * s, x - ca * s * 0.35, y - sa * s * 0.35);
          g.fillTriangle(x + ca * s * 1.3, y + sa * s * 1.3, x - ca * s - sa * s, y - sa * s + ca * s, x - ca * s * 0.35, y - sa * s * 0.35);
          g.fillStyle(0xfff6c8, 0.9 * fade); g.fillCircle(x + ca * s * 0.5, y + sa * s * 0.5, 0.9);
        }
        acc += seg;
      }
    } else {
      // sin ruta: flecha de brújula junto al entrenador
      const a = Math.atan2(mark.y - this.me.y, mark.x - this.me.x), x = this.me.x * PX + Math.cos(a) * 25, y = this.me.y * PX + Math.sin(a) * 25;
      g.fillStyle(0xf9da82, 0.9);
      g.fillTriangle(x + Math.cos(a) * 5, y + Math.sin(a) * 5, x + Math.cos(a + 2.3) * 4, y + Math.sin(a + 2.3) * 4, x + Math.cos(a - 2.3) * 4, y + Math.sin(a - 2.3) * 4);
    }
    // faro en el destino: columna de luz, anillos y rombo flotante
    const mx = mark.x * PX, my = mark.y * PX;
    if (mx > view.x - 40 && mx < view.right + 40 && my > view.y - 120 && my < view.bottom + 40) {
      const pulse = (time % 1400) / 1400;
      for (let k = 0; k < 6; k++) { bg.fillStyle(0xffe08a, 0.05 + k * 0.025); bg.fillRect(mx - 7 + k, my - 110, 14 - k * 2, 110); }
      bg.lineStyle(1.5, 0xffe08a, 0.9 * (1 - pulse)); bg.strokeEllipse(mx, my, 10 + pulse * 30, 5 + pulse * 15);
      bg.lineStyle(1, 0xffffff, 0.7); bg.strokeEllipse(mx, my, 12, 6);
      const fy = my - 30 + Math.sin(time / 300) * 3;
      bg.fillStyle(0x6a4800, 0.9); bg.fillTriangle(mx, fy - 8, mx + 6, fy, mx - 6, fy); bg.fillTriangle(mx, fy + 8, mx + 6, fy, mx - 6, fy);
      bg.fillStyle(0xffd860, 1); bg.fillTriangle(mx, fy - 6.5, mx + 4.6, fy, mx - 4.6, fy); bg.fillTriangle(mx, fy + 6.5, mx + 4.6, fy, mx - 4.6, fy);
      bg.fillStyle(0xffffff, 0.9); bg.fillTriangle(mx, fy - 6.5, mx + 2, fy - 2, mx - 1, fy - 1);
    } else {
      // destino fuera de la pantalla: flecha en el borde
      const a = Math.atan2(my - this.me.y * PX, mx - this.me.x * PX), cx = view.centerX, cy = view.centerY;
      const rx = view.width / 2 - 26, ry = view.height / 2 - 26, k = Math.min(rx / Math.abs(Math.cos(a) || 1e-6), ry / Math.abs(Math.sin(a) || 1e-6));
      const ex = cx + Math.cos(a) * k, ey = cy + Math.sin(a) * k, s = 9 + Math.sin(time / 200);
      bg.fillStyle(0x1a1200, 0.7); bg.fillCircle(ex, ey, s + 4);
      bg.fillStyle(0xffd860, 1); bg.fillTriangle(ex + Math.cos(a) * s, ey + Math.sin(a) * s, ex + Math.cos(a + 2.4) * s * 0.8, ey + Math.sin(a + 2.4) * s * 0.8, ex + Math.cos(a - 2.4) * s * 0.8, ey + Math.sin(a - 2.4) * s * 0.8);
    }
  }

  drawTrainer(v: PlayerView, x: number, y: number, dir: number, moving: boolean, time: number, hp: number) {
    if (v === this.meView && S.core?.look) {
      const lk = ensureTrainerTexture(this, S.core.look);
      if (v.lookKey !== lk) { v.lookKey = lk; v.sprite.setTexture(lk); }
    }
    const px = x * PX, py = y * PX;
    const hop = moving ? -Math.abs(Math.sin(time / 130 + v.id)) * 0.7 : 0;
    const br = moving ? 0 : Math.sin(time / 480 + v.id) * 0.022;
    v.sprite.setPosition(px, py + hop).setScale(TRAINER_SCALE * (1 - br * 0.4), TRAINER_SCALE * (1 + br));
    v.shadow.setPosition(px, py - 1);
    const base = dir === 0 ? 0 : dir === 1 ? 3 : 6;
    const cyc = [1, 0, 2, 0];
    const fr = moving ? cyc[Math.floor(time / 130) % 4] : 0;
    v.sprite.setFrame(base + fr);
    v.sprite.setFlipX(dir === 3);
    v.sprite.setDepth(py);
    v.sprite.setAlpha(hp <= 0 ? 0.35 : 1);
    v.name.setScale(this.txtScale).setPosition(px, py - 28).setVisible(S.settings.names);
    if (v.bubble) v.bubble.setPosition(px, py - 34);
    const inTall = this.terrainAt(x, y) === T.TALL;
    v.tall.setVisible(inTall);
    if (inTall) v.tall.setTexture(this.tallKey(time, moving, v.id)).setPosition(px, py + 2).setDepth(py + 0.5);
    // nadando (Surf): medio cuerpo bajo el agua y estela
    const tw = this.terrainAt(x, y), onWater = tw === T.WATER || tw === T.SWAMP;
    if (onWater) {
      v.sprite.setCrop(0, 0, 16, 15).setY(py + 3); v.shadow.setVisible(false);
      if (moving && Math.random() < 0.18) this.fx.ripple(px, py + 2, '#d8f2ff', 9, 420);
    } else if (v.sprite.isCropped) { v.sprite.setCrop(); v.shadow.setVisible(true); }
  }

  epicGfx!: Phaser.GameObjects.Graphics;
  /** Legendarios y míticos: círculo rúnico giratorio, columna de luz, energía que sube y un leve flotar. */
  drawEpic(v: MonView, px: number, py: number, time: number) {
    const sp = SPECIES[v.key], g = this.epicGfx;
    const col = v.shiny ? 0xffe070 : hex((TYPE_COLORS as any)[sp.types[0]] || '#ffd860'), col2 = hex((TYPE_COLORS as any)[sp.types[1] || sp.types[0]] || '#ffffff');
    const R = 12 * v.base, rot = time / 1400, pulse = 0.5 + Math.sin(time / 300 + v.id) * 0.5;
    g.fillStyle(col, 0.1 + pulse * 0.06); g.fillEllipse(px, py, R * 2.6, R * 1.15);
    for (const [r, dir, seg, w] of [[R, 1, 16, 1.2], [R * 0.72, -1.6, 10, 1]] as const) {
      g.lineStyle(w, dir > 0 ? col : col2, 0.75);
      for (let i = 0; i < seg; i += 2) {
        const a0 = rot * dir + i / seg * Math.PI * 2, a1 = a0 + Math.PI * 2 / seg * 0.8;
        g.lineBetween(px + Math.cos(a0) * r, py + Math.sin(a0) * r * 0.42, px + Math.cos(a1) * r, py + Math.sin(a1) * r * 0.42);
      }
    }
    for (let i = 0; i < 6; i++) { const a = -rot * 0.7 + i / 6 * Math.PI * 2; g.fillStyle(0xffffff, 0.55 + pulse * 0.4); g.fillCircle(px + Math.cos(a) * R * 1.12, py + Math.sin(a) * R * 0.47, 0.9); }
    // columna de luz detrás
    for (let k = 0; k < 4; k++) { g.fillStyle(col, 0.035 + pulse * 0.02); g.fillRect(px - R * (0.55 - k * 0.12), py - 46 * v.base, R * (1.1 - k * 0.24), 46 * v.base); }
    if (time > ((v as any).nextEpic || 0) && S.settings.particles !== 'low') {
      (v as any).nextEpic = time + 90 + Math.random() * 80;
      const a = Math.random() * Math.PI * 2;
      this.fx.burst(px + Math.cos(a) * R, py + Math.sin(a) * R * 0.4 - 2, Math.random() < 0.5 ? (TYPE_COLORS as any)[sp.types[0]] || '#ffd860' : '#ffffff', 1, 'spark', { speed: { min: 4, max: 10 }, lifespan: 900, gravityY: -26 });
    }
  }

  drawMon(v: MonView, rt: number, time: number) {
    const s = sample(v.buf, rt);
    const ox = v.x, oy = v.y;
    // suavizado: sigue la posición interpolada con un muelle suave (sin tirones entre snapshots)
    const gap = Math.hypot(s.x - v.x, s.y - v.y);
    if (gap > 3 || !v.seenSmooth) { v.x = s.x; v.y = s.y; v.seenSmooth = true; }
    else { const k = 1 - Math.exp(-this.frameDt * 16); v.x += (s.x - v.x) * k; v.y += (s.y - v.y) * k; }
    const sp = Math.hypot(v.x - ox, v.y - oy);
    v.vel = v.vel * 0.8 + sp * 0.2;
    v.moving = v.vel > 0.0035;
    const px = v.x * PX, py = v.y * PX;
    const flying = SPECIES[v.key].habitat === 'air';
    const sleeping = v.status === STATUS.SLEEP || v.status === STATUS.FREEZE;
    const epic = SPECIES[v.key].rarity === 'legendary' || SPECIES[v.key].rarity === 'mythic';
    const hop = v.dead || sleeping ? 0 : flying ? -3 + Math.sin(time / 240 + v.id) * 1.2 : epic ? -1.5 + Math.sin(time / 380 + v.id) * 1.4 : v.moving ? -Math.abs(Math.sin(time / 130 + v.id)) * 0.9 : 0;
    // respiración en reposo: un leve estirar y encoger del cuerpo
    if (!v.dead && !(v.flags & 32) && time > v.popUntil) { const br = v.moving || sleeping ? 0 : Math.sin(time / 520 + v.id) * 0.025; const b = v.base * MON_WORLD_SIZE / MON_FRAME; v.sprite.setScale(b * (1 - br * 0.5), b * (1 + br)); }
    v.sprite.setPosition(px + v.lunge.x, py + hop + v.lunge.y);
    v.shadow.setPosition(px, py);
    v.glow?.setPosition(px, py + 1).setAlpha(0.42 + Math.sin(time / 260 + v.id) * 0.18);
    v.hpLag = v.hpLag < v.hp ? v.hp : Math.max(v.hp, v.hpLag - 0.7);
    if (sp > 0.006 && time >= v.attackUntil) {
      v.dirX = v.dirX * 0.75 + (v.x - ox) * 0.25; v.dirY = v.dirY * 0.75 + (v.y - oy) * 0.25;
      v.direction = (Math.round(Math.atan2(v.dirX, v.dirY) / (Math.PI / 4)) + 8) % 8;
    }
    const texture = monTextureFor(this, v.key, v.shiny, v.direction);
    if (v.sprite.texture.key !== texture) v.sprite.setTexture(texture);
    v.sprite.setFlipX(false);
    v.sprite.setDepth(py);
    const fr = sleeping ? 0 : time < v.attackUntil ? (v.attackUntil - time > 140 ? 6 : 7) : v.moving || flying ? 2 + Math.floor(time / 110 + v.id) % 4 : Math.floor(time / 750 + v.id) % 2;
    if (!v.dead) v.sprite.setFrame(fr);
    const hidden = (v.flags & 256) || (v.flags & 32);
    v.sprite.setVisible(!(v.flags & 32));
    if (v.flags & 256) v.sprite.setAlpha(0.12);
    else if (!v.dead && !(v.flags & 32)) v.sprite.setAlpha(v.flags & 128 ? 0.75 : 1);
    v.shadow.setVisible(!hidden && !v.dead);
    v.shadow.setScale(v.base * (flying ? 0.55 : 0.7), v.base * (flying ? 0.55 : 0.8)).setAlpha(flying ? 0.65 : 1);
    v.glow?.setVisible(!hidden && !v.dead);
    if (epic && !hidden && !v.dead) this.drawEpic(v, px, py, time);
    if (v.shiny && !hidden && !v.dead && time > v.nextSpark) {
      v.nextSpark = time + (S.settings.particles === 'low' ? 2200 : 1200) + v.id % 300;
      this.fx.burst(px, py - 12 * v.base, '#fff060', 1, 'star', { speed: { min: 6, max: 16 }, lifespan: 700, gravityY: -10 });
      this.fx.burst(px + (Math.random() - 0.5) * 10, py - 10 * v.base, '#ffffff', 2, 'spark', { speed: { min: 4, max: 12 }, lifespan: 500, gravityY: -8 });
    }
    if (v.status && !hidden && !v.dead && Math.random() < 0.04 && !this.fx.low) {
      if (v.status === STATUS.BURN) {
        this.fx.burst(px + (Math.random() - 0.5) * 8, py - 6 * v.base, '#ff6020', 1, 'ember', { speed: { min: 4, max: 12 }, lifespan: 400, gravityY: -20 });
      } else if (v.status === STATUS.POISON) {
        this.fx.burst(px + (Math.random() - 0.5) * 8, py - 6 * v.base, '#a040d8', 1, 'dot', { speed: { min: 2, max: 8 }, lifespan: 450, gravityY: -15 });
      } else if (v.status === STATUS.PARALYZE) {
        this.fx.burst(px + (Math.random() - 0.5) * 10, py - 8 * v.base, '#f8e040', 1, 'spark', { speed: { min: 8, max: 20 }, lifespan: 250 });
      } else if (v.status === STATUS.FREEZE) {
        this.fx.burst(px + (Math.random() - 0.5) * 10, py - 8 * v.base, '#c8f0ff', 1, 'frost', { speed: { min: 2, max: 6 }, lifespan: 350 });
      } else if (v.status === STATUS.SLEEP) {
        this.fx.floatText(px + 6, py - 12 * v.base, 'Zz', 0xa8d8ff, 0.85, 'f3', 800, 14);
      }
    }
    if (v.flash > 0) { v.flash -= 16; v.sprite.setTintFill(0xffffff); if (v.flash <= 0) v.sprite.clearTint(); }
    else if (v.flags & 128) v.sprite.setTint(0x9090a0);
    else if (v.status) v.sprite.setTint(STATUS_TINT[v.status] | 0x404040);
    else v.sprite.clearTint();
    const top = Math.round(py - v.size * v.base * 0.9);
    // nivel (y rareza) siempre visible encima de cada Pokémon cercano
    const near = Math.abs(v.x - this.me.x) < 15 && Math.abs(v.y - this.me.y) < 11;
    const showLvl = near && !v.dead && !hidden && !(v.flags & 4);
    const lk = `${v.lvl}|${v.flags & (2 | 4096 | 16384)}`;
    if (lk !== v.lvlKey) {
      v.lvlKey = lk;
      v.lvlTxt.setText(String(v.lvl)).setTint(v.flags & 16384 ? 0xff7070 : v.flags & 2 ? (v.flags & 4096 ? 0xffa088 : 0xf4f0d8) : 0x9cf0a8);
    }
    const bw = this.barWidth(v);
    v.lvlTxt.setVisible(showLvl).setScale(this.lblScale).setPosition(Math.round(v.x * PX - bw / 2) - 1.5, top + 1);
    v.tierTxt?.setVisible(showLvl).setScale(this.lblScale).setOrigin(0.5, 1).setPosition(px, top - 2).setAlpha(0.75 + Math.sin(time / 200) * 0.25);
    if (v.statusTxt) v.statusTxt.setOrigin(0, 0.5).setScale(this.lblScale).setPosition(Math.round(v.x * PX + bw / 2) + 2, top + 1).setVisible(!v.dead);
    const inTall = !v.dead && v.size <= 32 && !(v.flags & 4) && SPECIES[v.key].habitat === 'land' && this.terrainAt(v.x, v.y) === T.TALL;
    v.tall.setVisible(inTall);
    if (inTall) v.tall.setTexture(this.tallKey(time, v.moving, v.id)).setPosition(px, py + 2).setDepth(py + 0.5);
    // barrera psíquica
    if (v.flags & 512) {
      if (!v.barrier) v.barrier = this.add.image(px, py, 'ring').setTint(0xf070d0).setBlendMode(Phaser.BlendModes.ADD).setDepth(py + 1);
      v.barrier.setPosition(px, py - v.size * v.base * 0.45).setScale(v.size * v.base / 28).setAlpha(0.5 + Math.sin(time / 100) * 0.2);
    } else if (v.barrier) { v.barrier.destroy(); v.barrier = null; }
  }

  tallKey(time: number, moving: boolean, id: number) { return moving ? ['tallfront', 'tallfront1', 'tallfront', 'tallfront2'][Math.floor(time / 120 + id) % 4] : (Math.floor(time / 900 + id) % 7 === 0 ? 'tallfront1' : 'tallfront'); }
  /** Surf: con un Pokémon de agua en el equipo se puede cruzar el agua nadando. */
  canSurf() { return S.team.some(t => { const ms = S.mons.find(m => m.uid === t.uid); const sp = ms && SPECIES[ms.sp]; return !!sp && (sp.types.includes('water') || sp.habitat === 'water'); }); }

  barWidth(v: MonView) { return v.flags & 64 || v.flags & 8192 ? 22 : v.size * v.base > 30 ? 18 : 14; }

  drawBars() {
    const g = this.barGfx; g.clear();
    const now = this.time.now;
    for (const v of this.mons.values()) {
      if (!v.dead && !(v.flags & 32) && !(v.flags & 256) && (v.flags & 4 || v.flags & 64 || v.shiny)) {
        const pulse = 0.88 + Math.sin(now / 180 + v.id) * 0.12;
        const rx = (v.flags & 4 ? 18 : v.flags & 64 ? 13 : 10) * pulse;
        const ry = rx * 0.42;
        const auraCol = v.shiny ? 0xffd850 : v.flags & 4 ? 0xff3848 : 0xff9830;
        g.lineStyle(1.2 / this.cameras.main.zoom, auraCol, 0.55);
        g.strokeEllipse(Math.round(v.x * PX), Math.round(v.y * PX + 1), rx * 2, ry * 2);
      }
      if (v.dead || v.flags & 32 || v.flags & 256 || v.flags & 4) continue;
      if (!v.lvlTxt.visible && v.owner !== S.myId) continue;
      // placa: fondo redondeado translúcido con borde de color (aliado, salvaje, agresivo, shiny), nivel y barra
      const w = this.barWidth(v), h = 2, o = 1 / this.cameras.main.zoom;
      const x = Math.round(v.x * PX - w / 2), y = Math.round(v.y * PX - v.size * v.base * 0.9);
      const hostile = v.flags & 2 && v.flags & 4096 || v.flags & 16384;
      const lw0 = v.lvlTxt.width * this.lblScale;
      const edge = v.id === S.me.focus ? 0xffe080 : v.shiny ? 0xffd850 : hostile ? 0xff5a4a : v.owner ? 0x6ae08a : 0xd8e4ec;
      const px0 = x - lw0 - 3 * o, pw = w + lw0 + 5 * o;
      g.fillStyle(0x0b1418, 0.74); g.fillRoundedRect(px0, y - 1.4, pw, h + 2.8, 1.4);
      g.lineStyle(o, edge, v.id === S.me.focus ? 1 : 0.55); g.strokeRoundedRect(px0, y - 1.4, pw, h + 2.8, 1.4);
      g.fillStyle(0x1e2830, 1); g.fillRect(x, y, w, h);
      const hpw = w * v.hp / 100;
      if (v.hpLag > v.hp) { g.fillStyle(0xffe6c0, 0.9); g.fillRect(x + hpw, y, w * (v.hpLag - v.hp) / 100, h); }
      const col = v.hp > 50 ? 0x5ad878 : v.hp > 20 ? 0xf6c23e : 0xee4a3e;
      g.fillStyle(col, 1); g.fillRect(x, y, hpw, h);
      g.fillStyle(0xffffff, 0.3); g.fillRect(x, y, hpw, h / 2);
      g.fillStyle(0x0a1216, 0.55); for (let q = 1; q < 4; q++) g.fillRect(x + w * q / 4, y, o, h);
      if (v.id === S.me.focus) { g.fillStyle(S.me.fight ? 0xff5a4a : 0x60d8ff, 0.9); g.fillTriangle(x + w / 2 - 1.5, y - 3.4, x + w / 2 + 1.5, y - 3.4, x + w / 2, y - 1.8); }
    }
    // nombres de entrenadores sobre una placa translúcida
    const plate = (pv: PlayerView, mine: boolean) => {
      if (!pv.name.visible) return;
      const o = 1 / this.cameras.main.zoom, nw = pv.name.displayWidth - 4 * o, nh = pv.name.displayHeight - 4 * o;
      g.fillStyle(0x0b1418, 0.6); g.fillRoundedRect(pv.name.x - nw / 2 - 2 * o, pv.name.y - nh - o, nw + 4 * o, nh + 2 * o, 1.4);
      if (mine) { g.lineStyle(o, 0xf2d28b, 0.6); g.strokeRoundedRect(pv.name.x - nw / 2 - 2 * o, pv.name.y - nh - o, nw + 4 * o, nh + 2 * o, 1.4); }
    };
    plate(this.meView, true);
    for (const pv of this.players.values()) plate(pv, false);
    for (const p of this.players.values()) {
      if (p.hp >= 100) continue;
      const o = 1 / this.cameras.main.zoom, x = Math.round(p.x * PX - 8), y = Math.round(p.y * PX - 29);
      g.fillStyle(0x0a1216, 0.9); g.fillRect(x - o, y - o, 16 + 2 * o, 2 + 2 * o); g.fillStyle(0x58c8f0, 1); g.fillRect(x, y, 16 * p.hp / 100, 2);
    }
  }

  drawLinks(_time: number) {
    // Las sinergias ya se ven en el panel de Equipo; las líneas entre Pokémon eran confusas (el "hilo blanco").
    this.linkGfx.clear();
  }
  drawLinksOld(time: number) {
    const g = this.linkGfx; g.clear();
    const links = S.core?.links || [];
    if (!links.length) return;
    const team = S.team;
    const pos = (i: number) => { const tl = team[i]; if (!tl) return null; const v = this.mons.get(tl.eid); return v && !v.dead ? { x: v.x * PX, y: v.y * PX - 4 } : null; };
    let li = 0;
    for (const l of links) {
      const def = LINK_MAP[l.id]; if (!def || l.id === 'prism') continue;
      const col = hex(def.color);
      const pts = l.members.map(pos).filter(Boolean) as { x: number; y: number }[];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        g.lineStyle(1, col, 0.35); g.lineBetween(a.x, a.y, b.x, b.y);
        const t = ((time / 900) + li * 0.3 + i * 0.2) % 1;
        g.fillStyle(col, 0.9); g.fillRect(Math.round(a.x + (b.x - a.x) * t) - 1, Math.round(a.y + (b.y - a.y) * t) - 1, 2, 2);
      }
      li++;
    }
  }

  drawTelegraphs(time: number) {
    const g = this.tgGfx; g.clear();
    for (const t of S.tg) {
      const remain = t.at - time;
      if (remain < -100) continue;
      const prog = Math.max(0, Math.min(1, 1 - remain / Math.max(1, t.total)));
      const pulse = 0.5 + Math.sin(time / 70) * 0.15;
      g.fillStyle(0xff2020, 0.14 + prog * 0.14);
      g.lineStyle(1, 0xff4040, pulse + 0.3);
      if (t.shape === 'circle') {
        g.fillCircle(t.x * PX, t.y * PX, t.r * PX); g.strokeCircle(t.x * PX, t.y * PX, t.r * PX);
        g.fillStyle(0xff3030, 0.28); g.fillCircle(t.x * PX, t.y * PX, t.r * PX * prog);
      } else if (t.shape === 'ring') {
        g.strokeCircle(t.x * PX, t.y * PX, t.r * PX); g.strokeCircle(t.x * PX, t.y * PX, t.r2 * PX);
        g.lineStyle((t.r2 - t.r) * PX, 0xff2020, 0.12 + prog * 0.15);
        g.strokeCircle(t.x * PX, t.y * PX, (t.r + t.r2) / 2 * PX);
      } else {
        const ang = Math.atan2(t.y2 - t.y, t.x2 - t.x), len = Math.hypot(t.x2 - t.x, t.y2 - t.y) * PX, w = t.w * PX;
        const c = Math.cos(ang), s = Math.sin(ang);
        const p = (u: number, v: number) => new Phaser.Math.Vector2(t.x * PX + c * u - s * v, t.y * PX + s * u + c * v);
        const pts = [p(0, -w / 2), p(len, -w / 2), p(len, w / 2), p(0, w / 2)];
        g.fillPoints(pts, true); g.strokePoints(pts, true, true);
        const pp = [p(0, -w / 2), p(len * prog, -w / 2), p(len * prog, w / 2), p(0, w / 2)];
        g.fillStyle(0xff3030, 0.28); g.fillPoints(pp, true);
      }
    }
    if (S.tg.some(t => t.at - time > 0 && Math.hypot(t.x - this.me.x, t.y - this.me.y) < t.r + (t.r2 || 0) + 6) && Math.floor(time / 400) % 2 === 0) bus.emit('danger');
  }

  darkness(time: number): { a: number; col: number } {
    const z = ZONES[this.zoneId] || ZONES[0];
    if (z.kind === 'dungeon') return { a: 0.55, col: 0x080410 };
    if (z.id === 21) return { a: 0, col: 0 };
    const h = ((net.serverNow() % DAY_LENGTH_MS) / DAY_LENGTH_MS) * 24;
    if (h >= 6 && h < 18) return { a: 0, col: 0 };
    if (h >= 18 && h < 19.5) return { a: (h - 18) / 1.5 * 0.25, col: 0x3a1040 };
    if (h >= 19.5 || h < 4.5) return { a: 0.5, col: 0x0a0a30 };
    return { a: (6 - h) / 1.5 * 0.5, col: 0x1a1040 };
  }

  updateNight(time: number) {
    const d = this.darkness(time);
    const rt = this.night;
    if (d.a <= 0.01) { rt.setVisible(false); this.visuals?.endGlows(); return; }
    const wv = this.cameras.main.worldView;
    const w = Math.ceil(wv.width) + 32, h = Math.ceil(wv.height) + 32;
    if (rt.width !== w || rt.height !== h) rt.resize(w, h);
    rt.setVisible(true).setPosition(Math.floor(wv.x) - 16, Math.floor(wv.y) - 16);
    rt.clear();
    rt.fill(d.col, d.a);
    this.visuals?.beginGlows();
    const light = (x: number, y: number, r: number, glowCol?: number, glowA = 0.28) => {
      const lx = x - rt.x, ly = y - rt.y;
      if (lx < -r || ly < -r || lx > w + r || ly > h + r) return;
      this.lightImg.setScale(r / 64);
      rt.erase(this.lightImg, lx, ly);
      if (glowCol !== undefined) this.visuals?.glow(x, y, r, glowCol, glowA);
    };
    light(this.me.x * PX, this.me.y * PX - 8, 80 + Math.sin(time / 300) * 2, 0xfff0bb, 0.2);
    for (const p of this.players.values()) light(p.x * PX, p.y * PX - 8, 60, 0xfff0bb, 0.16);
    for (const l of this.lampSpots) light(l.x, l.y + 6, 70, 0xffe688, 0.32);
    this.campfires = this.campfires.filter(cf => cf.until > time);
    for (const cf of this.campfires) light(cf.x, cf.y - 4, 85 + Math.sin(time / 120) * 6, 0xffaa44, 0.42);
    for (const v of this.mons.values()) {
      if (v.dead) continue;
      const sp = SPECIES[v.key];
      if (sp.types.includes('fire') || sp.types.includes('electric') || sp.types.includes('psychic') || sp.types.includes('fairy') || v.key === 'umbreon' || v.flags & (4 | 16 | 64)) {
        const col = sp.types.includes('fire') ? 0xff7722 : sp.types.includes('electric') ? 0xffe033 : sp.types.includes('psychic') ? 0xdd66ff : 0x88ccff;
        light(v.x * PX, v.y * PX - 10, (v.flags & 4 ? 52 : 36) * v.base, col, 0.3);
      }
    }
    this.visuals?.endGlows();
  }

  updateZone() {
    const tx = Math.floor(this.me.x), ty = Math.floor(this.me.y);
    const z = this.world.zone[ty * this.world.w + tx];
    if (z !== this.zoneId) {
      this.zoneId = z; S.zone = z;
      bus.emit('zone', z);
    }
    // música según zona / jefe cercano
    const zd = ZONES[this.zoneId];
    let mood: Mood = 'field';
    const h = ((net.serverNow() % DAY_LENGTH_MS) / DAY_LENGTH_MS) * 24;
    const night = h >= 19.5 || h < 5;
    if (zd.kind === 'town') mood = 'town';
    else if (zd.kind === 'dungeon') mood = zd.id === 19 ? 'spooky' : 'cave';
    else if (zd.id === 14) mood = 'volcano';
    else if (zd.id === 16) mood = 'snow';
    else if (zd.id === 12 || zd.id === 5) mood = 'spooky';
    else if (zd.id === 4) mood = 'forest';
    else if (night) mood = 'night';
    for (const v of this.mons.values()) if (v.flags & 4 && !v.dead && Math.hypot(v.x - this.me.x, v.y - this.me.y) < 14) { mood = 'boss'; break; }
    if (mood !== this.lastMood) { this.lastMood = mood; audio.setMood(mood); }
  }

  wRects: Record<string, Phaser.Geom.Rectangle> = {};

  setupWeather() {
    const mk = (tex: string, cfg: any) => {
      const top = tex === 'rain' || tex === 'snow' || (tex === 'px' && cfg.speedY);
      const rect = new Phaser.Geom.Rectangle(0, 0, 640, top ? 10 : 360);
      const e = this.add.particles(0, 0, tex, { emitting: false, emitZone: { type: 'random', source: rect, quantity: 1 } as any, ...cfg });
      e.setDepth(21000);
      (e as any).__rect = rect; (e as any).__top = top;
      return e;
    };
    this.weather.rain = mk('rain', { speedY: { min: 260, max: 320 }, speedX: { min: -60, max: -40 }, lifespan: 900, quantity: 3, frequency: 30, alpha: 0.7 });
    this.weather.snow = mk('snow', { speedY: { min: 20, max: 45 }, speedX: { min: -15, max: 15 }, lifespan: 5000, quantity: 1, frequency: 60, alpha: { start: 0.9, end: 0.3 } });
    this.weather.ash = mk('ember', { speedY: { min: -40, max: -15 }, speedX: { min: -10, max: 10 }, lifespan: 3000, quantity: 1, frequency: 90, alpha: { start: 1, end: 0 }, blendMode: 'ADD' });
    this.weather.fog = mk('fog', { speedX: { min: 4, max: 14 }, lifespan: 7000, frequency: 500, scale: { min: 1.5, max: 3 }, alpha: { start: 0.5, end: 0 } });
    this.weather.spores = mk('spore', { speedY: { min: -10, max: 10 }, speedX: { min: -8, max: 8 }, lifespan: 4000, frequency: 200, alpha: { start: 1, end: 0 } });
    this.weather.fireflies = mk('firefly', { speedY: { min: -8, max: 8 }, speedX: { min: -8, max: 8 }, lifespan: 3000, frequency: 260, alpha: { start: 1, end: 0 }, blendMode: 'ADD' });
    this.weather.butterflies = mk('butterfly', { speedY: { min: -12, max: 6 }, speedX: { min: -16, max: 16 }, lifespan: 4000, frequency: 900, alpha: { start: 1, end: 0 } });
    this.weather.storm = mk('px', { speedY: { min: 150, max: 260 }, speedX: { min: -80, max: -50 }, lifespan: 800, quantity: 2, frequency: 40, alpha: 0.8 });
    this.weather.leaves = mk('leaf', { speedY: { min: 15, max: 35 }, speedX: { min: 35, max: 70 }, lifespan: 4200, frequency: 350, alpha: { start: 0.85, end: 0.1 }, scale: { start: 0.8, end: 0.4 } });
    this.weather.petals = mk('petal', { speedY: { min: 20, max: 45 }, speedX: { min: 20, max: 55 }, lifespan: 4200, frequency: 320, alpha: { start: 0.9, end: 0.1 }, scale: { start: 1, end: 0.4 } });
  }

  updateWeather() {
    const wv = this.cameras.main.worldView;
    const z = ZONES[this.zoneId] || ZONES[0];
    const h = ((net.serverNow() % DAY_LENGTH_MS) / DAY_LENGTH_MS) * 24;
    const night = h >= 19.5 || h < 5;
    const want = new Set<string>();
    // clima dinámico compartido con el servidor (shared/weather.ts): cambia cada 12 min y según la estación
    const wz = weatherAt(z.id, net.serverNow(), z.kind);
    if (wz === 'snow') want.add('snow');
    if (wz === 'ash' || z.weather === 'ash') want.add('ash');
    if (wz === 'fog') want.add('fog');
    if (wz === 'rain') want.add('rain');
    if (wz === 'storm') { want.add('rain'); want.add('storm'); }
    if (wz === 'wind') want.add('leaves');
    if (z.weather === 'spores' && wz !== 'rain' && wz !== 'storm') want.add('spores');
    if (seasonAt(net.serverNow()) === 'autumn' && z.kind === 'wild' && !this.fx.low) want.add('leaves');
    if (z.kind === 'wild' && night && z.weather !== 'snow') want.add('fireflies');
    if ((z.id === 2 || z.id === 7) && !night && (wz === 'sun' || wz === 'clear')) want.add('butterflies');
    if ((z.id === 4 || z.id === 5) && !night) want.add('leaves');
    if ((z.id === 1 || z.id === 2) && !night && seasonAt(net.serverNow()) === 'spring') want.add('petals');
    for (const ev of S.events.values()) if (ev.kind === 'storm' && ev.zone === this.zoneId) { want.add('storm'); want.add('rain'); }
    if (S.settings.particles === 'low') { want.delete('fog'); want.delete('butterflies'); want.delete('leaves'); want.delete('petals'); }
    if (want.has('storm') && !this.fx.low && Math.random() < 0.006) {
      this.cameras.main.flash(90, 240, 245, 255, true);
      audio.play('boom', { vol: 0.35, pitch: 1.4 });
    }
    for (const k in this.weather) {
      const e = this.weather[k];
      const on = want.has(k);
      if (on !== e.emitting) { if (on) e.start(); else e.stop(); }
      if (on) {
        const top = (e as any).__top;
        e.setPosition(wv.x, top ? wv.y - 20 : wv.y);
        const rect: Phaser.Geom.Rectangle = (e as any).__rect;
        rect.width = wv.width + 60; rect.height = top ? 10 : wv.height;
      }
    }
    const stormEv = [...S.events.values()].find(ev => ev.kind === 'storm' && ev.zone === this.zoneId);
    if (stormEv) (this.weather.storm as any).particleTint = hex(TYPE_COLORS[stormEv.type as keyof typeof TYPE_COLORS] || '#ffffff');
    if (want.has('rain') && !this.fx.low && Math.random() < 0.22) {
      const rx = wv.x + Math.random() * wv.width;
      const ry = wv.y + Math.random() * wv.height;
      this.fx.ripple(rx, ry, '#98d0f8', 10 + Math.random() * 8, 320);
    }
    if (z.kind === 'dungeon' && !this.fx.low && Math.random() < 0.06) {
      this.fx.burst(wv.x + Math.random() * wv.width, wv.y + Math.random() * wv.height, '#a8e8ff', 2, 'spark', { speed: { min: 4, max: 14 }, lifespan: 450 });
    }
    if (z.id === 14 && !this.fx.low && Math.random() < 0.1) {
      this.fx.burst(wv.x + Math.random() * wv.width, wv.y + Math.random() * wv.height, '#ff7820', 2, 'ember', { min: 10, max: 35, gravityY: -40, lifespan: 550 } as any);
    }
  }
}

export { STATUS, STATUS_NAMES };
