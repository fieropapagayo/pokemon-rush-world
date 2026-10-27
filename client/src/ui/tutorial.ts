// Mini tutorial para novatos: pasos cortos que se completan jugando (o con un clic).
import { S, bus } from '../state';
import { el } from './dom';
import { audio } from '../systems/audio';
import type { Hud } from './hud';

interface Step { title: string; text: string; done?: () => boolean; button?: string; }

export class Tutorial {
  box: HTMLElement;
  i = 0;
  key: string;
  start = { x: 0, y: 0, catches: 0, stance: '' };
  sawAmbush = false;
  steps: Step[];

  constructor(private hud: Hud) {
    this.key = 'prw_tut_' + (S.core?.name || '');
    this.box = el('div', 'panel tutorial live');
    this.box.hidden = true;
    hud.root.appendChild(this.box);
    let saved = -1;
    try { saved = parseInt(localStorage.getItem(this.key) || '-1', 10); } catch { /* sin almacenamiento */ }
    this.steps = [
      { title: 'Muévete por el mundo', text: 'Usa <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> o las flechas. También puedes hacer clic en el suelo para ir caminando hasta allí.', done: () => this.moved() > 6 },
      { title: 'Busca Pokémon en la hierba', text: 'Los Pokémon no te esperan quietos: <b>saltan de repente</b> cuando pasas por la hierba alta, la arena o las cuevas. Sal del pueblo hacia la Ruta 1.', done: () => this.sawAmbush || this.wildNear() },
      { title: 'Fija un objetivo', text: 'Haz <b>clic en un Pokémon salvaje</b> (o pulsa <kbd>Tab</kbd>). Tu equipo lo debilitará sin derrotarlo, hasta dejarlo a 1 PS. El número encima es su <b>nivel</b>.', done: () => S.me.focus > 0 },
      { title: '¡Captúralo!', text: 'Cuando su vida esté baja, pulsa <kbd>C</kbd> o el botón Lanzar. Las Super y Ultra Balls ayudan con los difíciles. Si es agresivo (nivel en rojo), irá directo a por ti.', done: () => (S.core?.stats.catches || 0) > this.start.catches },
      { title: 'El modo de tu equipo', text: 'Pulsa <kbd>V</kbd> o usa los botones de la barra: <b>Pasivo</b> (solo tu objetivo), <b>Neutral</b> (se defienden), <b>Ataque</b> o <b>Agresivo</b> (buscan pelea de lejos).', done: () => S.me.stance !== this.start.stance },
      { title: 'Huye y cúrate', text: 'Si un rival te supera, pulsa <kbd>F</kbd> para <b>huir</b>. Entra en el <b>Centro Pokémon</b> de cualquier pueblo: la Enfermera Joy cura gratis. ¡Ojo, aquí los salvajes pegan fuerte!', button: 'Entendido' },
      { title: 'Tu aventura', text: '<kbd>T</kbd> Equipo · <kbd>M</kbd> Mapa con el nivel de cada zona · <kbd>R</kbd> Diario · <kbd>O</kbd> Social y duelos PvP. Entra en las casas: los vecinos tienen regalos. ¡Suerte buscando legendarios!', button: '¡A jugar!' },
    ];
    if (saved >= this.steps.length || (saved < 0 && (S.core?.tlvl || 1) > 4)) return;
    this.i = Math.max(0, saved);
    bus.on('ambush', () => { this.sawAmbush = true; });
    bus.on('scene_ready', () => this.reset());
    setTimeout(() => { this.reset(); this.render(); }, 1500);
    setInterval(() => this.check(), 500);
  }

  reset() {
    const me = this.hud.scene?.me;
    this.start = { x: me?.x || 0, y: me?.y || 0, catches: S.core?.stats.catches || 0, stance: S.me.stance };
  }
  moved() { const me = this.hud.scene?.me; return me ? Math.hypot(me.x - this.start.x, me.y - this.start.y) : 0; }
  wildNear() { const sc = this.hud.scene; return !!sc && [...sc.mons.values()].some((v: any) => v.flags & 2 && !v.dead && Math.hypot(v.x - sc.me.x, v.y - sc.me.y) < 7); }

  check() {
    const st = this.steps[this.i];
    if (!st || this.box.hidden || !st.done) return;
    if (st.done()) this.next();
  }

  next() {
    this.i++;
    try { localStorage.setItem(this.key, String(this.i)); } catch { /* */ }
    audio.play('quest');
    if (this.i >= this.steps.length) { this.box.hidden = true; return; }
    this.reset();
    this.render();
  }

  render() {
    const st = this.steps[this.i]; if (!st) { this.box.hidden = true; return; }
    this.box.hidden = false;
    this.box.innerHTML = `<div class="tut-head"><span>TUTORIAL · PASO ${this.i + 1} DE ${this.steps.length}</span><button class="btn tiny gray" data-t="skip">Saltar tutorial</button></div>
      <h4>${st.title}</h4><p>${st.text}</p>
      <div class="tut-foot"><div class="dots">${this.steps.map((_, k) => `<i class="${k <= this.i ? 'on' : ''}"></i>`).join('')}</div>
      ${st.button ? `<button class="btn small gold" data-t="next">${st.button}</button>` : '<span class="tut-check">Se completa al hacerlo ✓</span>'}</div>`;
    this.box.querySelector<HTMLElement>('[data-t=skip]')!.onclick = () => { this.i = this.steps.length - 1; this.next(); };
    const nb = this.box.querySelector<HTMLElement>('[data-t=next]');
    if (nb) nb.onclick = () => this.next();
  }
}
