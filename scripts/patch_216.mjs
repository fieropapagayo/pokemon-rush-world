import fs from 'fs';

// 1. panels.ts: dprev/dnext and mprev/mnext
{
  const p = 'PokemonRushWorld/client/src/ui/panels.ts';
  let code = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

  // dprev and dnext in dex detail
  const dexNameTarget = '<div style="font-size:19px">#${String(sel.dex).padStart(3, \'0\')} ${isS ? esc(sel.name) : \'???\'}</div>';
  const dexNameReplace = '<div class="row" style="align-items:center;justify-content:space-between;width:100%"><div style="font-size:18px">#${String(sel.dex).padStart(3, \'0\')} ${isS ? esc(sel.name) : \'???\'}</div><div class="row" style="gap:2px"><button class="btn tiny gray" id="dprev" title="Especie anterior">◀</button><button class="btn tiny gray" id="dnext" title="Especie siguiente">▶</button></div></div>';
  if (!code.includes(dexNameTarget)) {
    console.error('dexNameTarget not found in panels.ts');
    process.exit(1);
  }
  code = code.replace(dexNameTarget, dexNameReplace);

  // Bind dprev and dnext
  const dexBindTarget = "const dc = body.querySelector('#dcry') as HTMLElement | null; if (dc && sel) dc.onclick = () => audio.cry(sel.dex - 1);";
  const dexBindReplace = "const dc = body.querySelector('#dcry') as HTMLElement | null; if (dc && sel) dc.onclick = () => audio.cry(sel.dex - 1);\n" +
    "    const dp = body.querySelector('#dprev') as HTMLElement | null;\n" +
    "    if (dp && sel) dp.onclick = () => {\n" +
    "      const idx = SPECIES_LIST.findIndex(s => s.key === sel.key);\n" +
    "      const prev = SPECIES_LIST[(idx - 1 + SPECIES_LIST.length) % SPECIES_LIST.length];\n" +
    "      this.dexSel = prev.key; this.dexShiny = false;\n" +
    "      audio.cry(prev.dex - 1);\n" +
    "      this.renderDex(body);\n" +
    "    };\n" +
    "    const dn = body.querySelector('#dnext') as HTMLElement | null;\n" +
    "    if (dn && sel) dn.onclick = () => {\n" +
    "      const idx = SPECIES_LIST.findIndex(s => s.key === sel.key);\n" +
    "      const next = SPECIES_LIST[(idx + 1) % SPECIES_LIST.length];\n" +
    "      this.dexSel = next.key; this.dexShiny = false;\n" +
    "      audio.cry(next.dex - 1);\n" +
    "      this.renderDex(body);\n" +
    "    };";
  if (!code.includes(dexBindTarget)) {
    console.error('dexBindTarget not found in panels.ts');
    process.exit(1);
  }
  code = code.replace(dexBindTarget, dexBindReplace);

  // mprev and mnext in monDetail
  const boxNameTarget = '<div class="row" style="gap:4px;flex-wrap:wrap"><span style="font-size:19px">${m.shiny ? \'<span class="gold">✦ </span>\' : \'\'}${m.nick ? `${esc(m.nick)} <span class="muted" style="font-size:13px">(${esc(sp.name)})</span>` : esc(sp.name)} <span class="muted">#${String(sp.dex).padStart(3, \'0\')}</span></span></div>';
  const boxNameReplace = '<div class="row" style="align-items:center;justify-content:space-between;width:100%"><span style="font-size:18px">${m.shiny ? \'<span class="gold">✦ </span>\' : \'\'}${m.nick ? `${esc(m.nick)} <span class="muted" style="font-size:13px">(${esc(sp.name)})</span>` : esc(sp.name)} <span class="muted">#${String(sp.dex).padStart(3, \'0\')}</span></span><div class="row" style="gap:2px"><button class="btn tiny gray" data-act="mprev" title="Pokémon anterior en Caja">◀</button><button class="btn tiny gray" data-act="mnext" title="Pokémon siguiente en Caja">▶</button></div></div>';
  if (!code.includes(boxNameTarget)) {
    console.error('boxNameTarget not found in panels.ts');
    process.exit(1);
  }
  code = code.replace(boxNameTarget, boxNameReplace);

  // Handle mprev and mnext in data-act click
  const boxActTarget = "if (a === 'cry' && ms) { audio.cry(SPECIES[ms.sp].dex - 1); return; }";
  const boxActReplace = "if (a === 'cry' && ms) { audio.cry(SPECIES[ms.sp].dex - 1); return; }\n" +
    "      if (a === 'mprev') {\n" +
    "        const list = S.mons;\n" +
    "        const i = list.findIndex(x => x.uid === uid);\n" +
    "        if (i >= 0 && list.length > 1) {\n" +
    "          const prev = list[(i - 1 + list.length) % list.length];\n" +
    "          this.teamSel = prev.uid; audio.cry(SPECIES[prev.sp].dex - 1); this.renderTeam(body);\n" +
    "        }\n" +
    "        return;\n" +
    "      }\n" +
    "      if (a === 'mnext') {\n" +
    "        const list = S.mons;\n" +
    "        const i = list.findIndex(x => x.uid === uid);\n" +
    "        if (i >= 0 && list.length > 1) {\n" +
    "          const next = list[(i + 1) % list.length];\n" +
    "          this.teamSel = next.uid; audio.cry(SPECIES[next.sp].dex - 1); this.renderTeam(body);\n" +
    "        }\n" +
    "        return;\n" +
    "      }";
  if (!code.includes(boxActTarget)) {
    console.error('boxActTarget not found in panels.ts');
    process.exit(1);
  }
  code = code.replace(boxActTarget, boxActReplace);

  fs.writeFileSync(p, code, 'utf8');
  console.log('panels.ts updated');
}

// 2. GameScene.ts: encounter cry and smart ball fallback
{
  const p = 'PokemonRushWorld/client/src/scenes/GameScene.ts';
  let code = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

  // Import BALLS, ITEMS and saveSettings
  const impStateTarget = "import { S, bus } from '../state';";
  const impStateReplace = "import { S, bus, saveSettings } from '../state';\nimport { BALLS, ITEMS } from '../../../shared/items';";
  if (!code.includes(impStateTarget)) {
    console.error('impStateTarget not found in GameScene.ts');
    process.exit(1);
  }
  code = code.replace(impStateTarget, impStateReplace);

  // Encounter cry in ambushFx
  const ambTarget = "if (forMe) {\n      audio.play(aggro ? 'boss' : 'event', { vol: aggro ? 0.35 : 0.5 });";
  const ambReplace = "if (forMe) {\n      audio.play(aggro ? 'boss' : 'event', { vol: aggro ? 0.35 : 0.5 });\n      if (v) { const sp = SPECIES[v.key]; if (sp) audio.cry(sp.dex - 1); }";
  if (!code.includes(ambTarget)) {
    console.error('ambTarget not found in GameScene.ts');
    process.exit(1);
  }
  code = code.replace(ambTarget, ambReplace);

  // Smart ball fallback in throwAtFocus
  const throwTarget = "net.send({ t: 'throw', id, ball: S.settings.ball });";
  const throwReplace = "const c = S.core;\n" +
    "    if (c) {\n" +
    "      const b = S.settings.ball;\n" +
    "      if ((c.items[b] || 0) <= 0) {\n" +
    "        const alt = BALLS.find(x => (c.items[x] || 0) > 0);\n" +
    "        if (alt) {\n" +
    "          S.settings.ball = alt;\n" +
    "          saveSettings();\n" +
    "          bus.emit('toast', { text: `Cambio automático a ${ITEMS[alt].name} (sin ${ITEMS[b].name}).`, kind: 'info' });\n" +
    "        } else {\n" +
    "          bus.emit('toast', { text: '¡No te quedan Poké Balls en la mochila! Cómpralas en la Tienda.', kind: 'bad' });\n" +
    "          audio.play('error');\n" +
    "          return;\n" +
    "        }\n" +
    "      }\n" +
    "    }\n" +
    "    net.send({ t: 'throw', id, ball: S.settings.ball });";

  if (!code.includes(throwTarget)) {
    console.error('throwTarget not found in GameScene.ts');
    process.exit(1);
  }
  code = code.replace(throwTarget, throwReplace);

  fs.writeFileSync(p, code, 'utf8');
  console.log('GameScene.ts updated');
}

// 3. package.json to 2.16.0
{
  const p = 'PokemonRushWorld/package.json';
  let pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
  pkg.version = '2.16.0';
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log('package.json updated to 2.16.0');
}

// 4. shared/changelog.ts
{
  const p = 'PokemonRushWorld/shared/changelog.ts';
  let code = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  code = code.replace(
    /export const RELEASE = '[^']+';/,
    "export const RELEASE = '2.16.0 · Exploración Dinámica y Conmutación de Balls';"
  );
  const newEntry = "  '◀ Botones de Navegación Rápida (◀ / ▶) en Pokédex y Caja, Grito Salvaje en Hierba Alta y Conmutación Inteligente de Balls: botones compactos para hojear especies y ejemplares con audio de grito automático; grito procedural de sorpresa cuando un Pokémon salvaje salta de la hierba; y cambio automático a tu siguiente Ball disponible al agotar existencias durante el lanzamiento [C].',\n";
  code = code.replace("export const CHANGELOG = [\n", "export const CHANGELOG = [\n" + newEntry);
  fs.writeFileSync(p, code, 'utf8');
  console.log('shared/changelog.ts updated');
}

// 5. notebook.ts
{
  const p = 'PokemonRushWorld/client/src/ui/notebook.ts';
  let code = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const target = "const HISTORY: { ver: string; date: string; items: string[] }[] = [\n";
  const prepend = [
    "const HISTORY: { ver: string; date: string; items: string[] }[] = [",
    "  {",
    "    ver: '2.16 · Exploración Dinámica y Conmutación de Balls',",
    "    date: '27 de octubre de 2026',",
    "    items: [",
    "      'Navegación secuencial con botones ◀ y ▶ en la Pokédex [P] y en la Caja de Equipo [T], reproduciendo el grito de cada Pokémon al pasar.',",
    "      'Grito procedural en encuentros salvajes: los Pokémon que saltan de la hierba emiten su grito chiptune junto al signo de exclamación.',",
    "      'Conmutación inteligente de Balls: si se agota tu tipo de Ball activo durante [C], el juego pasa de inmediato a tu siguiente Ball con existencias.',",
    "      'Aviso sonoro de error y recordatorio claro si te quedas sin ninguna Poké Ball en la mochila.',",
    "    ],",
    "  },"
  ].join('\n') + '\n';

  if (code.includes(target)) {
    code = code.replace(target, prepend);
    fs.writeFileSync(p, code, 'utf8');
    console.log('notebook.ts updated');
  }
}

// 6. CHANGELOG.md
{
  const p = 'PokemonRushWorld/CHANGELOG.md';
  let md = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const header = "# Changelog\n\n";
  const newSection = [
    "## 2.16.0 · Exploración Dinámica y Conmutación de Balls — 27 de octubre de 2026",
    "",
    "- **◀ Navegación Secuencial en Pokédex y Caja (`panels.ts`)**: botones compactos `◀` y `▶` para recorrer especies en la Pokédex y ejemplares en la Caja con reproducción automática de sus gritos procedurales retro.",
    "- **🌿 Grito Acústico en Encuentros Salvajes (`GameScene.ts`)**: los Pokémon que saltan de la hierba alta emiten su grito chiptune auténtico además de la animación de sorpresa.",
    "- **◓ Conmutación Inteligente de Poké Balls (`GameScene.ts`)**: al pulsar `[C]`, si la Ball seleccionada no tiene existencias, el sistema busca y equipa automáticamente otra Ball disponible en la mochila (Super Ball, Ultra Ball, etc.) en lugar de cancelar el intento.",
    "- **❌ Aviso Sonoro de Agotamiento (`GameScene.ts`)**: sonido `error` y toast informativo si la mochila no contiene ninguna Poké Ball de ningún tipo.",
    "",
    ""
  ].join('\n');

  if (md.includes(header)) {
    md = md.replace(header, header + newSection);
    fs.writeFileSync(p, md, 'utf8');
    console.log('CHANGELOG.md updated');
  }
}

// 7. web/public/index.html
{
  const p = 'PokemonRushWorld/web/public/index.html';
  let html = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  html = html.replace(/Versión 2\.15\.[0-9] · [^<]+ · 91 Especies/g, 'Versión 2.16.0 · Exploración y Conmutación · 91 Especies');
  html = html.replace(/Versión 2\.15\.[0-9] \(Actualización en Tiempo Real\)/g, 'Versión 2.16.0 (Actualización en Tiempo Real)');
  const itemMarker = '<ul style="margin:10px 0 0;padding-left:20px;line-height:1.6;font-size:14px;color:#d8e2dc">\n';
  const newItem = '          <li><b>◀ Botones de Navegación Rápida (◀ / ▶) en Pokédex y Caja, Grito Salvaje en Hierba Alta y Conmutación Inteligente de Balls:</b> botones compactos para hojear especies y ejemplares con audio de grito automático; grito procedural de sorpresa cuando un Pokémon salvaje salta de la hierba; y cambio automático a tu siguiente Ball disponible al agotar existencias durante el lanzamiento [C].</li>\n';
  if (html.includes(itemMarker)) {
    html = html.replace(itemMarker, itemMarker + newItem);
  }
  fs.writeFileSync(p, html, 'utf8');
  console.log('index.html updated');
}
