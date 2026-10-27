// Web pública de Pokémon Rush World: lee la API del Worker y pinta ranking, perfiles y servidores.
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(n || 0);
const hours = s => { const h = Math.floor((s || 0) / 3600); return h ? `${h} h` : `${Math.floor((s || 0) / 60)} min`; };
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const get = path => fetch(path).then(r => r.ok ? r.json() : Promise.reject(r.status));

async function loadStats() {
  try {
    const s = await get('/api/stats');
    const tiles = [['Entrenadores', s.players], ['Activos (24 h)', s.active24h], ['Capturas', s.catches], ['Shinies', s.shinies], ['Legendarios', s.legends], ['Duelos ganados', s.duels], ['Horas jugadas', Math.round(s.playtime / 3600)], ['Nivel máximo', s.top_level]];
    $('#tiles').innerHTML = tiles.map(([n, v]) => `<div class="tile"><b>${fmt(v)}</b><span>${n}</span></div>`).join('');
    const live = (s.servers || []).filter(x => x.alive);
    const st = $('#status');
    if (live.length) {
      const on = live.reduce((a, x) => a + x.online, 0);
      st.innerHTML = `<span class="dot on"></span><span>Servidor activo · ${on} jugando ahora</span>`;

    } else { st.innerHTML = `<span class="dot off"></span><span>Servidor de juego apagado ahora mismo · el ranking sigue disponible</span>`; $('#play').textContent = '▶ Jugar (servidor apagado)'; }
    $('#servers').innerHTML = (s.servers || []).length ? s.servers.map(x => `<div class="srv"><div><b>${esc(x.name)}</b><div class="muted" style="font-size:13px">v${esc(x.version)} · ${x.alive ? `${x.online}/${x.max} jugadores · ${(+x.tick_ms).toFixed(1)} ms/tick` : 'visto ' + ago(x.last_seen)}</div></div><span class="dot ${x.alive ? 'on' : 'off'}"></span></div>`).join('') : '<p class="muted">Ningún servidor ha informado todavía.</p>';
  } catch { $('#status').innerHTML = '<span class="dot off"></span><span>No se pudo contactar con la API</span>'; }
}

let by = 'level';
async function loadBoard() {
  try {
    const d = await get('/api/leaderboard?by=' + by + '&limit=50');
    $('#rows').innerHTML = d.players.length ? d.players.map((p, i) => `<tr class="row" data-n="${esc(p.name)}"><td class="pos">${i + 1}</td><td><b>${esc(p.name)}</b>${p.guest ? '<span class="guest">invitado</span>' : ''}</td><td>${p.level}</td><td>${p.dex_caught}</td><td>${p.shinies}${p.legends ? ` · 👑${p.legends}` : ''}</td><td>${p.elo}</td><td class="hide-sm"><div class="team">${(p.team || []).slice(0, 6).map(m => `<i class="${m.shiny ? 'sh' : ''}" title="${esc(cap(m.sp))} Nv.${m.lvl}">${esc(cap(m.sp).slice(0, 4))} ${m.lvl}</i>`).join('')}</div></td><td class="hide-sm">${hours(p.playtime)}</td></tr>`).join('') : '<tr><td colspan="8" class="muted">Aún no hay entrenadores sincronizados.</td></tr>';
    document.querySelectorAll('tr.row').forEach(r => r.onclick = () => openProfile(r.dataset.n));
  } catch { $('#rows').innerHTML = '<tr><td colspan="8" class="muted">No se pudo cargar el ranking.</td></tr>'; }
}

async function openProfile(name) {
  const dlg = $('#profile');
  $('#pbody').innerHTML = '<p class="muted">Cargando...</p>';
  dlg.showModal();
  try {
    const p = await get('/api/player/' + encodeURIComponent(name));
    const stats = [['Nivel', p.level], ['Puesto', '#' + p.rank], ['Pokédex', p.dex_caught + ' / 91'], ['Shinies', p.shinies], ['Legendarios', p.legends], ['Medallas', p.medals + ' / 6'], ['Elo PvP', p.elo], ['Duelos', `${p.pvp_w} V · ${p.pvp_l} D`], ['Capturas', fmt(p.catches)], ['Derrotados', fmt(p.kills)], ['Jefes', p.bosses], ['Jugado', hours(p.playtime)]];
    $('#pbody').innerHTML = `<h2 style="margin:0">${esc(p.name)} ${p.guest ? '<span class="guest">invitado</span>' : ''}</h2><div class="muted">Activo ${ago(p.updated)}${p.server ? ' · ' + esc(p.server) : ''}</div>
      <div class="pgrid">${stats.map(([n, v]) => `<div><b>${esc(v)}</b><span>${n}</span></div>`).join('')}</div>
      <b>Equipo</b><div class="team" style="flex-wrap:wrap;margin:6px 0 14px">${(p.team || []).map(m => `<i class="${m.shiny ? 'sh' : ''}">${m.shiny ? '✦ ' : ''}${esc(m.nick || cap(m.sp))} Nv.${m.lvl}</i>`).join('') || '<span class="muted">Sin equipo</span>'}</div>`;
  } catch { $('#pbody').innerHTML = `<p>No se ha encontrado a <b>${esc(name)}</b>.</p>`; }
}

async function loadFeed() {
  try {
    const f = await get('/api/feed');
    if (f.length) $('#feed').innerHTML = f.map(x => `<li>${x.kind === 'legend' ? '👑' : x.kind === 'shiny' ? '✦' : x.kind === 'duel' ? '⚔' : '★'} ${esc(x.text)}<small>${ago(x.at)}</small></li>`).join('');
  } catch { /* sin muro */ }
}

$('#tabs').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  by = b.dataset.by;
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  loadBoard();
};
$('#search').onsubmit = e => { e.preventDefault(); const q = $('#q').value.trim(); if (q.length >= 3) openProfile(q); };
loadStats(); loadBoard(); loadFeed();
setInterval(() => { loadStats(); loadFeed(); }, 60000);
