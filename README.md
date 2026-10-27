# Pokémon Rush World

RPG incremental **multijugador** con mundo 2D y Pokémon modelados en 3D y dibujados como pixel art, que se juega en el navegador. Tus Pokémon te siguen por un mundo abierto, combaten solos y tú exploras, capturas, evolucionas, mejoras el equipo y te enfrentas a jefes con tus amigos.

**Versión 2.9 · Desafío y Comunidad.** Captura y combates mucho más difíciles, cada Pokémon único (IV y naturaleza), evoluciones con caramelos, niveles sin tope, clic para ver y doble clic para luchar, modos Neutral y Libre, Surf, campamento real, invitaciones por enlace y más seguridad. Enlace para jugar: <https://pokemon-rush-world.pokemonrush.workers.dev/jugar> (también en `../url.txt`). Para tener el juego 24/7 sin tu PC, lee [NUBE.md](NUBE.md). Consulta el [changelog completo](CHANGELOG.md).

> Fan game no oficial y sin ánimo de lucro. Pokémon y sus personajes son marcas de Nintendo, Game Freak y The Pokémon Company. Todos los gráficos (sprites, tiles, iconos) y sonidos de este proyecto se generan por código expresamente para él: no se usa ningún archivo oficial.

---

## 1. Ejecutar en Windows (un clic)

1. Instala **Node.js 22.13 o superior** (versión LTS) desde <https://nodejs.org> (o `winget install OpenJS.NodeJS.LTS`).
2. Haz doble clic en **`run.bat`**.

El script:
- comprueba que Node.js y npm están instalados y que la versión es suficiente,
- crea `.env` con la configuración por defecto,
- instala las dependencias con npm (solo la primera vez, 1-2 minutos),
- prepara y comprueba la base de datos SQLite (`data/pokemon-rush.db`),
- compila el cliente si hay cambios,
- arranca el servidor y abre el navegador en **http://localhost:3000**.

La ventana se queda abierta mostrando el registro del servidor. Para cerrarlo, pulsa **Ctrl+C** (se guardan todas las partidas). Si algo falla, el mensaje de error queda visible y la ventana no se cierra.

> La primera vez Windows puede preguntar por el **Firewall**: permite el acceso en **redes privadas** para que tus amigos de la LAN puedan entrar.

### Linux / macOS

```bash
npm install
npm run build
npm start
```

---

## 2. Jugar con amigos

El servidor es **autoritativo**: un ordenador hace de servidor (el tuyo, con `run.bat` abierto) y los demás solo necesitan un navegador. No hace falta que tus amigos instalen nada.

### A) En la misma red (casa, LAN, Wi-Fi)

Al arrancar, la consola muestra líneas como:

```
Amigos en tu red (LAN):   http://192.168.1.35:3000
```

Tus amigos abren esa dirección en su navegador. Cada uno crea su entrenador (invitado o cuenta).

### B) Por Internet — opción fácil: Tailscale (recomendada)

1. Tú y tus amigos instaláis **Tailscale** (<https://tailscale.com>, gratis) e iniciáis sesión; invítalos a tu red ("tailnet").
2. Tus amigos abren `http://<tu-IP-de-Tailscale>:3000` (la IP `100.x.y.z` que muestra Tailscale en tu PC).

Es privado (solo entran las personas invitadas) y no hay que tocar el router.

### C) Por Internet — enlace temporal con Cloudflare

1. Instala cloudflared una vez: `winget install --id Cloudflare.cloudflared`
2. Con `run.bat` abierto, ejecuta **`compartir-internet.bat`**.
3. Aparecerá una dirección `https://xxxxx.trycloudflare.com`: pásasela a tus amigos.

La conexión va cifrada (HTTPS y WSS automáticos). El enlace cambia cada vez que lo abres.

### D) Abrir un puerto en el router

Redirige el puerto TCP **3000** del router a la IP local de tu PC y comparte `http://<tu-IP-pública>:3000`. Funciona, pero sin cifrado; es preferible B o C.

### E) Servidor público permanente (VPS) con HTTPS/WSS

Ejecutar en `localhost` **no** es lo mismo que publicar un servidor mundial. Para tenerlo siempre disponible:

1. Contrata un VPS pequeño (1 vCPU / 1 GB basta para 20+ jugadores) con un dominio apuntando a su IP.
2. Opción Docker:
   ```bash
   docker build -t pokemon-rush .
   docker run -d --restart unless-stopped -p 3000:3000 -v prw-data:/data pokemon-rush
   ```
   u opción directa: instala Node 22+, copia el proyecto, `npm install && npm run build && npm start` (con `pm2` o un servicio systemd para mantenerlo vivo).
3. Pon delante un proxy con HTTPS. Con **Caddy** basta este `Caddyfile` (gestiona el certificado y los WebSockets solo):
   ```
   tu-dominio.com {
       reverse_proxy localhost:3000
   }
   ```
   Con Nginx, recuerda las cabeceras de WebSocket:
   ```nginx
   location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header X-Forwarded-For $remote_addr;
   }
   ```
4. Los jugadores entran en `https://tu-dominio.com`. El cliente usa `wss://` automáticamente cuando la página va por HTTPS.

Haz copias de seguridad del archivo de base de datos (`data/pokemon-rush.db`, o el volumen `/data` en Docker).

### F) Copia en la nube y web de ranking (Cloudflare, gratis y automático)

Una web siempre activa con el ranking, los perfiles y el estado del servidor, más una copia de cada partida. Si pierdes `data/` o cambias de PC, las cuentas con contraseña se recuperan solas al iniciar sesión.

**Primera vez (una sola vez):**

1. Ten una cuenta gratuita de Cloudflare (<https://dash.cloudflare.com/sign-up>).
2. Doble clic en **`web/desplegar.bat`**. Se abrirá el navegador: entra con tu cuenta de Cloudflare y pulsa **Allow**.
3. El script crea la base de datos, genera la clave secreta, publica la web y escribe `CLOUD_URL` y `CLOUD_KEY` en `.env`. Al final muestra la dirección de tu web (`https://pokemon-rush-world.TU-USUARIO.workers.dev`).

**Después, todo es automático:**

- Cada vez que abres **`run.bat`**, si cambió algo de la carpeta `web/` (por ejemplo, una actualización), la web se vuelve a publicar sola antes de arrancar el juego. Si no hay cambios, no hace nada; si no hay Internet, avisa y el juego arranca igual.
- Mientras el servidor está encendido, cada partida se sube a la nube como mucho cada 8 s, el servidor envía un latido cada minuto (la web muestra "Servidor activo") y al cerrarlo con Ctrl+C hace una última subida.
- La sesión de Cloudflare de este proyecto se guarda aparte, en `web/.wrangler-home/`, para no mezclarse con otras cuentas de este PC.

Opcional: pon en `.env` `PUBLIC_URL=` la dirección pública del juego (por ejemplo la de `compartir-internet.bat`) para que la web muestre el botón **Jugar ahora**. Detalles, despliegue manual, problemas al iniciar sesión y seguridad en [web/README.md](web/README.md).

**Web publicada:** <https://pokemon-rush-world.pokemonrush.workers.dev> — ya configurada en `.env`; no hay que repetir el paso de la primera vez.

**24/7 sin tu PC:** doble clic en `subir-a-render.bat` (Render gratis; lo sube a GitHub y abre Render listo para desplegar). A partir de ahí `run.bat` sube cada cambio solo. Más opciones en [NUBE.md](NUBE.md).

**Enlace para jugar desde cualquier PC o móvil, sin descargar nada:** <https://pokemon-rush-world.pokemonrush.workers.dev/jugar>. Al abrir `run.bat` el servidor abre solo una dirección pública con Cloudflare y la web redirige a ella.

**Entrar con Google:** sigue los 5 pasos de [web/README.md → Entrar con Google](web/README.md#entrar-con-google) para obtener el ID de cliente (gratis) y pégalo en `web/wrangler.toml`; `run.bat` publica el cambio solo.

---

## 3. Controles

| Acción | Tecla |
|---|---|
| Moverse | WASD / flechas / clic en el suelo (ruta local) |
| Interactuar (hablar, curar, abrir cofres, entrar en cuevas) | E |
| Seleccionar Pokémon salvaje | Clic izquierdo · Tab (siguiente) |
| Lanzar Ball al objetivo | C o clic derecho · B cambia de Ball |
| Habilidades | 1 Ataque Rush · 2 Pulso Curativo · 3 Orden Definitiva · 4/Espacio Esquiva |
| Equipo / Pokédex / Mochila / Mejoras | T / P / I / U |
| Expediciones / Mapa / Misiones / Social | X / M / J / O |
| Diario de campo / Gimnasios | R / G |
| Huir de los salvajes que te persiguen | F |
| Modo del equipo (Pasivo / Neutral / Ataque / Agresivo) | V |
| Tarjeta de Entrenador | K |
| Retar a un duelo PvP | Social (O) → ⚔ Retar · `/duelo nombre` |
| Ver un Pokémon / atacarlo | Clic (solo seleccionar) · doble clic o botón ⚔ Luchar |
| Acampar (tienda y hoguera) | Z, en un claro de una ruta |
| Invitar amigos a tu grupo | Social (O) → 🔗 Copiar enlace de invitación |
| Marcar un destino para la brújula | Clic en el mapa o botón Ir de una región |
| Chat | Enter (comandos `/g`, `/z`, `/p` para global, zona o grupo) |
| Cerrar ventanas / Ajustes | Esc |

**Consejo:** al seleccionar un Pokémon salvaje, tu equipo lo debilita hasta dejarlo a 1 PS sin derrotarlo, para que puedas capturarlo con calma.

---

## 4. Qué incluye esta versión (funcional)

**Mundo**
- Mundo continuo de 400×400 tiles + 3 mazmorras, generado con semilla (idéntico en servidor y cliente) y con geografía diseñada: praderas, bosque, lago, costa, pantano, campos eléctricos, cementerio, montañas, volcán en isla, picos nevados.
- 6 pueblos con Centro Pokémon (curación + punto de viaje rápido), Tienda, casas, fuente, farolas y NPC con diálogos (Profesor Oak, Enfermera Joy, guías...). Carteles en las rutas.
- 3 mazmorras con cuevas procedurales: Cueva Luna, Torre Pokémon y Cueva Celeste (nivel mínimo para entrar).
- Chunks de 32×32 cargados dinámicamente, transiciones orgánicas entre terrenos, espuma en las orillas, acantilados con relieve, agua animada, hierba alta que tapa a los personajes, ~5.000 objetos (árboles, rocas, lápidas, torres...), 110 cofres y 170 objetos recogibles con reaparición.
- Ciclo día/noche (20 min) con iluminación dinámica (farolas, Pokémon de fuego/eléctricos), clima por zona (nieve, ceniza, niebla, esporas, lluvia) y ambiente (mariposas, luciérnagas).
- 21 zonas con nivel recomendado y tablas de aparición diferentes (incluidas apariciones solo de noche y en el agua).

**Pokémon**
- **91 especies** (incluidos 11 legendarios y 4 míticos) con modelos propios en 64×64 (normal y **shiny**), ocho orientaciones y ocho poses, tipos reales, estadísticas base, ratio de captura, rareza, familias evolutivas, descripciones originales y movimientos aprendidos por nivel.
- 18 tipos con tabla de eficacias completa que afecta al daño (las inmunidades se reducen a x0,25 para que el combate automático no se bloquee).
- 78 movimientos con 6 comportamientos (cuerpo a cuerpo, proyectil, área, área propia, rayo y especial) y estados alterados (quemadura, veneno, parálisis, sueño, congelación).
- Evoluciones por nivel, por piedra (Fuego, Agua, Trueno, Hoja, Lunar), por "intercambio" (Cable Link), por amistad y por momento del día (Eevee → 5 evoluciones), con animación de evolución.
- IVs individuales, amistad, caramelos por familia, transferencia de repetidos.

**Combate**
- Hasta 6 Pokémon que te siguen en formación y atacan automáticamente, eligen objetivo, se colocan, esquivan las zonas de los jefes y reaparecen al debilitarse.
- Críticos, STAB, efectividad, drenaje, golpes múltiples, autodestrucción, partículas, números de daño, sacudidas de cámara.
- 4 habilidades manuales del entrenador (teclas 1-4), con recargas validadas en el servidor.
- El entrenador tiene PS: los salvajes agresivos y los jefes pueden atacarte; al caer vuelves al último Centro Pokémon.

**Pokémon Link (sinergias)** — 15 sinergias con reglas verificables: Electric Chain, Firestorm, Ocean Surge, Shadow Rift, Verdant Bloom, Stone Guard, Mind Link, Dragon Pride, Sky Squadron, Toxic Mist, Swarm, Fairy Light, Steel Core, Evolution Resonance y Prism Team. Se muestran como enlaces luminosos entre los miembros del equipo y con efectos propios.

**Captura** — lanzamiento con animación, sacudidas y resultado decidido por el servidor según especie, PS restantes, nivel, tipo de Ball, estado y mejoras. 4 tipos de Ball.

**Progresión incremental** — nivel de entrenador (desbloquea ranuras de equipo, habilidades y objetos de tienda), 32 mejoras permanentes (núcleo, automatización y 18 afinidades de tipo pagadas con esencias), recursos: Pokédólares, Cristales Rush, Fragmentos de Jefe, esencias por tipo y caramelos. Automatizaciones: lanzador automático de Balls, botiquín automático, imán de botín.

**Jefes y eventos**
- 7 jefes de mundo con patrones propios telegrafiados (golpes en círculo, anillos, rayos, lluvias de proyectiles, invocaciones, barreras, descanso interrumpible, furia por debajo del 30%): Snorlax, Gyarados, Onix, Arcanine, Gengar, Dragonite y Mewtwo. Escalan con el número de jugadores cercanos, dan recompensas a todos los participantes y tras derrotarlos tienes 25 s para intentar capturarlos.
- Eventos dinámicos cada pocos minutos: invasiones con líder alfa, Pokémon raros (incluido Mew), tormentas elementales, EXP doble, portales con oleadas y Pokémon alfa.

**Misiones y expediciones** — 20 misiones principales + encargos repetibles, progreso regional con estrellas por zona, 5 tipos de expedición simuladas en el servidor (también mientras estás desconectado).

**Multijugador real** — servidor autoritativo por ticks (20 Hz) con snapshots por proximidad (10 Hz) e interpolación en el cliente; jugadores, equipos, ataques y capturas visibles para todos; chat global/zona/grupo; grupos de hasta 4 con experiencia y recompensas compartidas; invitaciones; lista de conectados; inspección de equipos; emotes.

**Seguridad y persistencia** — el servidor valida movimiento (velocidad y colisiones), daño, capturas, economía, misiones, evoluciones y recompensas; límites de frecuencia y tamaño de mensajes; contraseñas con scrypt; tokens de sesión aleatorios guardados con hash; una sesión activa por cuenta; guardado en SQLite (modo WAL, transacciones y copia anterior para recuperar un guardado dañado) cada 60 s, al desconectar y al cerrar el servidor.

**Interfaz** — menú con acceso como invitado, cuenta o Google, elección de inicial en 3D (5 iniciales con giro 360° y vista Shiny) y creador de entrenador con vista 360° y botón aleatorio; Vestidor del Entrenador en vivo en Ajustes; Estudio 3D interactivo 360° en Pokédex y Equipo; calculadora elemental de debilidades y resistencias; Tarjeta de Entrenador con vitrina 3D del equipo titular; botón de Acampar y Revivir rápido; HUD con racha de combate, vida, experiencia, recursos, equipo, habilidades, Balls, minimapa, estación/clima, zona, hora, ping y jugadores en línea.

**Audio** — efectos y música chiptune generados con WebAudio (distinta según zona, de noche y en combate contra jefes), con volúmenes independientes.

---

## 5. Pruebas incluidas

Con el servidor arrancado:

```bash
npx tsx scripts/bot-test.ts      # 25 pruebas multijugador: visibilidad mutua, movimiento, anti-trampas, economía, chat, grupos, desconexión, persistencia, login
npx tsx scripts/load-test.ts 20  # 20 jugadores simultáneos: mide el coste del tick y el ancho de banda
npx tsx scripts/worldmap.ts mapa.png   # exporta una imagen del mundo generado
npm run test:models          # 11.648 fotogramas de modelos (91 especies × 2 paletas × 8 direcciones × 8 poses)
npm run test:exploration     # rutas, investigaciones, recompensas y gimnasios
npm run test:encounters      # apariciones y protección shiny
```

Resultados medidos en el desarrollo: 25/25 pruebas superadas; con 21 jugadores conectados el tick del servidor tarda ~2,6 ms de media (de 50 ms disponibles) y cada jugador recibe ~18 KB/s.

Para probar contenido avanzado en local puedes poner `DEV_CHEATS=true` en `.env` y usar en el chat `/dev money`, `/dev lvl 30`, `/dev boss snorlax`, `/dev event rare`... **No lo actives en un servidor público.**

---

## 6. Configuración (`.env`)

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | 3000 | Puerto HTTP + WebSocket |
| `HOST` | 0.0.0.0 | `127.0.0.1` para no aceptar conexiones de la red |
| `DB_FILE` | data/pokemon-rush.db | Base de datos SQLite |
| `MAX_PLAYERS` | 50 | Jugadores simultáneos |
| `SHINY_RATE` | 400 | Probabilidad shiny 1/N |
| `ALLOW_GUESTS` | true | Permitir acceso como invitado |
| `DEV_CHEATS` | false | Comandos de prueba en el chat |

---

## 7. Estructura del proyecto

```
PokemonRushWorld/
├── run.bat                  arranque con un clic (Windows)
├── compartir-internet.bat   enlace público temporal con Cloudflare
├── Dockerfile               despliegue en servidor
├── client/                  cliente (Vite + TypeScript + Phaser 3)
│   └── src/
│       ├── scenes/          escena del mundo (chunks, entidades, efectos, input)
│       ├── graphics/        motor de pixel art, sprites de Pokémon, tiles, objetos, entrenador, fuentes
│       ├── systems/         efectos visuales y audio sintetizado
│       ├── networking/      cliente WebSocket
│       └── ui/              HUD, menú y ventanas
├── server/                  servidor autoritativo (Node.js + ws + node:sqlite)
│   ├── world/               simulación, IA, combate, jefes, eventos
│   ├── players/             guardado y acciones validadas
│   ├── networking/          autenticación y límites
│   └── database/            SQLite
├── shared/                  datos y reglas comunes (especies, movimientos, tipos, zonas, progresión, generación del mundo)
└── scripts/                 pruebas multijugador, carga y utilidades de run.bat
```

---

## 8. Limitaciones conocidas y siguientes pasos

- Los Pokémon son modelos 3D rasterizados en ocho direcciones y ocho poses; el mundo y la cámara siguen siendo 2D. El movimiento con clic busca rutas locales y la brújula señala la dirección de destinos lejanos.
- El servidor es una sola instancia (un mundo compartido). La arquitectura (interés por proximidad, rejilla espacial) está preparada para repartir zonas en varios procesos, pero no está implementado.
- No hay intercambio directo de Pokémon entre jugadores (el Cable Link simula las evoluciones por intercambio).
- Las cuentas de invitado quedan ligadas al navegador mediante un token; no hay conversión de invitado a cuenta con contraseña.
- El PvP es por duelos 1 contra 1 cerca del rival; no hay combates por equipos de varios jugadores.
