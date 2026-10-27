// Libreta de Novedades (Changelog) + Actualizador en Tiempo Real (Live Auto-Update).
import { el, esc } from './dom';
import { CHANGELOG, RELEASE } from '../../../shared/changelog';
import { net } from '../networking/net';
import { audio } from '../systems/audio';

const HISTORY: { ver: string; date: string; items: string[] }[] = [
  {
    ver: '2.15 · Control de Destinos y Atajos de Campo',
    date: '27 de octubre de 2026',
    items: [
      'Botón "✕ Quitar destino" en el Mapa del Mundo [M] para despejar la ruta guiada y el rumbo de la brújula en un solo toque.',
      'Actualizada la Guía de Controles [H] con el atajo de curación rápida [Q] y los nuevos comandos de chat (/dex, /equipo, /pocion).',
      'Respuesta sonora consistente al alternar categorías en la Mochila [I] y al navegar desde la Tarjeta de Entrenador [K].',
    ],
  },
  {
    ver: '2.14 · Progreso de Pokédex y Comandos Tácticos',
    date: '27 de octubre de 2026',
    items: [
      'Cabecera de Pokédex estilizada: insignias compactas con conteo de vistos, capturados con porcentaje exacto y shinies.',
      'Flecha táctica cian sobre el objetivo fijado pacíficamente, diferenciándolo del modo de combate ofensivo en rojo.',
      'Nuevos comandos de chat para el teclado: /dex, /equipo, /mochila, /mapa y /pocion.',
      'Respuesta sonora gratificante al enviar y recoger expediciones [X] y al desafiar gimnasios [G].',
    ],
  },
  {
    ver: '2.13 · Fidelidad de IVs, Amistad y Sonido Ambiental',
    date: '27 de octubre de 2026',
    items: [
      'Ordenación por Amistad (♥) en Equipo/Caja: localiza de inmediato tus compañeros con mayor felicidad para evoluciones especiales (Crobat, Espeon, Umbreon, Togetic).',
      'Escala de IVs corregida a /31 en la ficha individual de estadísticas de cada Pokémon.',
      'Efecto sonoro suave de pisadas en hierba alta que complementa las hojas mecidas por el viento.',
      'Feedback acústico unificado en el cambio de pestañas de Mejoras [U] y Social [O].',
    ],
  },
  {
    ver: '2.12 · Radar Shiny y Dinámica de Captura',
    date: '27 de octubre de 2026',
    items: [
      'Radar Shiny en Minimapa: los Pokémon Shiny salvajes se señalan en el minimapa como estrellas/rombos dorados luminosos que parpadean para no pasarlos por alto.',
      'Retícula de fijación en Minimapa: el objetivo seleccionado cuenta con un recuadro de mira en el radar sincronizado con el modo (cian de inspección / rojo de ataque).',
      'Textos flotantes de captura sobre la Ball: rótulo dinámico "¡CAPTURADO!" en verde o "¡ESCAPÓ!" en rojo para una lectura de combate instantánea.',
      'Sonido táctil [Tab]: chasquido sonoro suave de confirmación al alternar entre objetivos cercanos.',
      'Celebración estelar al subir de nivel de entrenador con anillo expansivo y fuegos artificiales dorados en el mundo.',
    ],
  },
  {
    ver: '2.11 · Feedback Táctico y Salud de Equipo',
    date: '27 de octubre de 2026',
    items: [
      'Alerta visual en el HUD: ranuras de equipo con pulso luminoso ámbar/rojo al caer por debajo del 25% de vida, facilitando la reacción con la tecla [Q].',
      'Botones de reproducción directa "🔊 Grito" en la ficha de cada Pokémon en el Equipo [T] y en la Pokédex [P].',
      'Confirmación auditiva y aviso discreto en pantalla al alternar Poké Balls con [B] o cambiar el modo de equipo con [V].',
      'Flujo seguro para Caramelo Raro desde la Mochila [I] redirigiendo interactivamente al panel de Equipo.',
    ],
  },
  {
    ver: '2.10 · Feedback de Combate y Control Táctico',
    date: '27 de octubre de 2026',
    items: [
      'Visualización de subida de nivel con fuegos estelares dorados, anillo radiante y texto dinámico "¡Nv. X!" sobre el Pokémon que sube de nivel.',
      'Estadísticas flotantes de crecimiento "+PS +ATK +DEF" para los miembros de tu equipo con aviso descriptivo en el registro de aventuras.',
      'Retícula de objetivo adaptativa: el anillo de selección cambia automáticamente a oro para shinies salvajes, rojo en orden de combate y cian en fijación táctica.',
      'Tecla rápida [Q] para usar tu poción más conveniente en el equipo al instante durante combates intensos.',
      'Selector desplegable por Tipo Elemental en Pokédex con botón de reseteo rápido en un solo clic.',
    ],
  },
  {
    ver: '2.9 · Gritos Retro y HUD de Buffs',
    date: '27 de octubre de 2026',
    items: [
      'Gritos retro chiptune procedurales sintetizados en WebAudio para todas las 91 especies en Pokédex, Caja, caricias y shinies.',
      'Efectos sonoros y retroalimentación contundente para golpes críticos y súper eficaces.',
      'Badges flotantes con temporizador en tiempo real para Incienso Raro, EXP doble y sinergias activas en el HUD.',
      'Cinta de control de una sola fila en Equipo y Caja con filtros avanzados sin desbordamiento.',
    ],
  },
  {
  "ver": "2.8 · Volumen y Materiales",
  "date": "27 de octubre de 2026",
  "items": [
    "Entrenadores y 14 apariencias de PNJ reconstruidos en 3D: fotogramas 32×48, mochila con volumen, gorra con visera, chaqueta, zapatillas y accesorios. Mismo tamaño dentro del mundo y colores del vestidor conservados.",
    "Materiales por especie: pelaje, escamas, hojas, caparazones, roca, hielo y metal con texturas que siguen el giro del modelo. Ojos y detalles pequeños permanecen limpios; ataques luminosos y variantes shiny conservados.",
    "Charizard estrena alas verticales con membranas, nervaduras y puntas articuladas.",
    "Seis árboles, tres arbustos y cinco rocas reconstruidos con volumen y texturas al doble de resolución. Copas por capas, raíces, bayas, flores y musgo; balanceo suave de vegetación que responde al viento y se desactiva con calidad baja.",
    "Edificios con faldón lateral, cumbrera, sombra bajo aleros, zócalo biselado, puertas con paneles, reflejos de cristal y colectores en el laboratorio. Se conservan entradas y colisiones.",
    "Corregido el tamaño del Pokémon al escapar de una Poké Ball. Nuevas comprobaciones de márgenes, poses y escalas de los modelos del entorno y los entrenadores."
  ]
},
  {
    ver: '2.7 · Estaciones y Leyendas',
    date: 'Actualización en vivo',
    items: [
      'Estaciones (Primavera, Verano, Otoño e Invierno) y clima dinámico por zona (lluvia, tormenta, nieve, niebla, sol, viento y ceniza).',
      '91 especies en 3D (18 nuevas: Raikou, Entei, Suicune, Lugia, Ho-Oh, Rayquaza, Celebi, Jirachi, Darkrai, Mareep, Hoppip, Wooper, Murkrow, Misdreavus, Sneasel, Swinub, Houndour y Togepi).',
      'Efectos elementales 3D auto-iluminados en las poses de ataque de las 91 especies (11.648 fotogramas).',
      'Nuevo modelo volumétrico de Entrenador y PNJs icónicos (Joy, Oak, Blaine, Lance) con Vestidor en vivo en Ajustes.',
      'Pokédex con filtros inteligentes (Capturados, Faltan, Shiny, Leyendas, Estación) y botón "⌖ Ir", más botón "⚡ Equipar mejores" en Equipo.',
      'Libreta de Novedades al entrar al juego y sistema de Actualización en Tiempo Real sin perder tu posición.',
    ],
  },
  {
    ver: '2.6 · Mundo Salvaje y Duelos PvP',
    date: 'Octubre 2026',
    items: [
      'Encuentros sorpresa al caminar por hierba alta, cuevas y arena, con Pokémon salvajes agresivos, tranquilos o huidizos.',
      '4 modos tácticos del equipo [V]: Pasivo, Neutral, Ataque y Agresivo, más botón Huir [F].',
      'Duelos PvP 1 contra 1 en tiempo real con clasificación Elo y recompensas.',
      'Interiores visitables en todos los pueblos (Centro Pokémon, Tienda y casas con vecinos que regalan objetos).',
    ],
  },
  {
    ver: '2.4 – 2.5 · Gimnasios, Diario y Jefes',
    date: 'Octubre 2026',
    items: [
      '6 Líderes de Gimnasio (Erika, Brock, Misty, Agatha, Blaine y Lance) con medallas y bonificaciones permanentes.',
      'Diario de campo [R] con 12 investigaciones y rangos de explorador.',
      '15 sinergias Pokémon Link y 7 Jefes de Mundo con mecánicas telegrafiadas.',
    ],
  },
  {
    ver: '2.1 – 2.3 · Motor Pixel 3D y Atelier',
    date: 'Octubre 2026',
    items: [
      'Motor de rasterizado 3D propio en 64×64 con 8 direcciones, 8 poses y variantes Shiny.',
      'Estudio 3D interactivo 360° en Pokédex, Equipo y galería de modelos.',
    ],
  },
];

const ICONS = ['⚡', '🧑', '🎨', '🧭', '⚔️', '🗺️', '🌟', '🏕️'];

let currentBuild = '';
let updating = false;

function extractScriptAsset(html: string): string {
  const m = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
  return m ? m[0] : '';
}

function getLoadedScriptAsset(): string {
  for (const s of Array.from(document.scripts)) {
    const src = s.getAttribute('src') || s.src || '';
    const m = src.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
    if (m) return m[0];
  }
  return '';
}

function triggerRealtimeReload(reason = 'Nueva versión detectada en el servidor') {
  if (updating) return;
  updating = true;
  sessionStorage.setItem('prw_just_updated', '1');
  localStorage.setItem('prw_last_seen_rel', RELEASE);
  const banner = el('div', 'nb-live-banner');
  banner.innerHTML = `<div class="nb-live-spin">⟳</div><div><b>✨ ¡Actualizando el juego en tiempo real!</b><br><small>${esc(reason)} · Guardando estado y recargando...</small></div>`;
  document.body.appendChild(banner);
  try { audio.play('sparkle'); } catch { /* */ }
  setTimeout(() => location.reload(), 850);
}

export async function checkUpdateNow(manual = false): Promise<boolean> {
  try {
    const loaded = getLoadedScriptAsset();
    const res = await fetch('/index.html?_live=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return false;
    const html = await res.text();
    const remote = extractScriptAsset(html);
    if (remote && loaded && remote !== loaded) {
      triggerRealtimeReload('Nuevos cambios compilados en vivo');
      return true;
    }
    const hRes = await fetch('/health?_live=' + Date.now(), { cache: 'no-store' }).catch(() => null);
    if (hRes && hRes.ok) {
      const h = await hRes.json();
      if (h.build) {
        if (currentBuild && h.build !== currentBuild) {
          triggerRealtimeReload('Servidor actualizado a compilación ' + h.build);
          return true;
        }
        currentBuild = h.build;
      }
    }
    if (manual) {
      const b = document.getElementById('nb-sync-btn');
      if (b) { b.textContent = '✔ ¡Al día en tiempo real!'; setTimeout(() => { if (b.isConnected) b.textContent = '🔄 Sincronizar ahora'; }, 2200); }
    }
  } catch { /* sin red temporal */ }
  return false;
}

export function startLiveUpdater() {
  // Escucha aviso instantáneo por WebSocket desde el servidor cuando se compila una nueva versión
  net.on('live_update', (m: any) => {
    triggerRealtimeReload(`Versión ${m?.version || RELEASE} publicada en vivo`);
  });
  // Comprobación periódica cada 5 s para detectar cambios en dist/index.html en tiempo real
  checkUpdateNow(false);
  setInterval(() => checkUpdateNow(false), 5000);
}

export function shouldAutoOpenNotebook(): boolean {
  const justUpdated = sessionStorage.getItem('prw_just_updated') === '1';
  const lastRel = localStorage.getItem('prw_last_seen_rel');
  const hidePref = localStorage.getItem('prw_hide_notebook') === '1';
  if (justUpdated || lastRel !== RELEASE) return true;
  return !hidePref;
}

export function openNotebook(opts?: { auto?: boolean }) {
  document.getElementById('nb-modal')?.remove();
  const justUpdated = sessionStorage.getItem('prw_just_updated') === '1';
  if (justUpdated) sessionStorage.removeItem('prw_just_updated');
  localStorage.setItem('prw_last_seen_rel', RELEASE);

  let tab: 'current' | 'history' = 'current';
  const ov = el('div', 'nb-overlay');
  ov.id = 'nb-modal';

  const render = () => {
    const autoShow = localStorage.getItem('prw_hide_notebook') !== '1';
    ov.innerHTML = `
      <div class="nb-book" role="dialog" aria-label="Libreta de Novedades">
        <div class="nb-rings">${'<i></i>'.repeat(9)}</div>
        <div class="nb-ribbon" title="Marcador de versión ${esc(RELEASE)}"></div>
        <div class="nb-page">
          <div class="nb-head">
            <div>
              <div class="nb-kicker">📓 CUADERNO DE BITÁCORA DEL ENTRENADOR</div>
              <h2 class="nb-title">Libreta de Novedades</h2>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
              <span class="nb-stamp">VERSIÓN ${esc(RELEASE.toUpperCase())}</span>
              <span class="nb-live">${justUpdated ? '⚡ ¡Actualizado en tiempo real!' : '🟢 Sincronización en vivo activa'}</span>
            </div>
          </div>

          <div class="nb-tabs">
            <button class="nb-tab ${tab === 'current' ? 'on' : ''}" data-nbtab="current">✨ Novedades de esta versión (${CHANGELOG.length})</button>
            <button class="nb-tab ${tab === 'history' ? 'on' : ''}" data-nbtab="history">📜 Historial de versiones</button>
          </div>

          <div class="nb-body scroll">
            ${tab === 'current' ? `
              <div class="nb-intro">
                ¡Bienvenido a <b>Pokémon Rush World</b>! Esta libreta recoge todas las mejoras que se van aplicando <b>en tiempo real</b> mientras juegas:
              </div>
              <div class="nb-list">
                ${CHANGELOG.map((item, idx) => {
                  const colon = item.indexOf(':');
                  const head = colon > 0 ? item.slice(0, colon) : `Novedad #${idx + 1}`;
                  const rest = colon > 0 ? item.slice(colon + 1).trim() : item;
                  return `<div class="nb-item">
                    <span class="nb-ic">${ICONS[idx % ICONS.length]}</span>
                    <div>
                      <b class="nb-item-title">${esc(head)}</b>
                      <div class="nb-item-desc">${esc(rest)}</div>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            ` : `
              <div class="nb-list">
                ${HISTORY.map(h => `
                  <div class="nb-sec">
                    <div class="nb-sec-head"><span>📌 ${esc(h.ver)}</span><small>${esc(h.date)}</small></div>
                    <ul>
                      ${h.items.map(li => `<li>${esc(li)}</li>`).join('')}
                    </ul>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <div class="nb-foot">
            <label class="nb-check" title="Si está activo, la libreta se abre automáticamente al entrar al juego">
              <input type="checkbox" id="nb-autoshow" ${autoShow ? 'checked' : ''} />
              Mostrar libreta al entrar al juego
            </label>
            <div class="row" style="gap:6px">
              <button class="btn small gray" id="nb-sync-btn" title="Comprueba al instante si hay una nueva compilación en el servidor">🔄 Sincronizar ahora</button>
              <button class="btn green" id="nb-close-btn">✔ ¡A jugar! [Esc]</button>
            </div>
          </div>
        </div>
      </div>
    `;

    ov.querySelectorAll<HTMLElement>('[data-nbtab]').forEach(b => b.onclick = () => {
      tab = b.dataset.nbtab as any;
      try { audio.play('ui'); } catch { /* */ }
      render();
    });
    const chk = ov.querySelector('#nb-autoshow') as HTMLInputElement | null;
    if (chk) chk.onchange = () => {
      if (chk.checked) localStorage.removeItem('prw_hide_notebook');
      else localStorage.setItem('prw_hide_notebook', '1');
    };
    const syncBtn = ov.querySelector('#nb-sync-btn') as HTMLElement | null;
    if (syncBtn) syncBtn.onclick = () => { try { audio.play('ui'); } catch { /* */ } checkUpdateNow(true); };
    const closeBtn = ov.querySelector('#nb-close-btn') as HTMLElement | null;
    if (closeBtn) closeBtn.onclick = () => close();
  };

  const close = () => {
    window.removeEventListener('keydown', onKey, true);
    ov.remove();
    try { audio.play('ui'); } catch { /* */ }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
  };
  window.addEventListener('keydown', onKey, true);
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });

  render();
  document.body.appendChild(ov);
  if (!opts?.auto) { try { audio.play('uiopen'); } catch { /* */ } }
}
