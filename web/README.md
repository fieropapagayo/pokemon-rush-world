# Web y nube de Pokémon Rush World (Cloudflare, gratis)

Esta carpeta publica en **tu cuenta de Cloudflare** (plan gratuito) tres cosas:

1. **Copia de seguridad en la nube** de todas las partidas: el servidor de juego sube cada guardado (como mucho cada 8 s). Si pierdes la carpeta `data/` o cambias de PC, al iniciar sesión con usuario y contraseña la cuenta se recupera sola.
2. **Web pública** con el ranking (nivel, Pokédex, shinies, legendarios, Elo PvP, capturas, tiempo jugado), el perfil de cada entrenador, el muro de momentos épicos (shinies, legendarios, duelos) y si el servidor está encendido, con botón **Jugar ahora**.
3. **API** que la web usa y que el servidor de juego alimenta (`/api/...`). Un *cron* cada hora guarda el histórico diario.

Siempre está activa: los Workers de Cloudflare no se apagan ni hay que mantener un ordenador encendido para la web y los datos. El **juego en sí** (servidor en tiempo real a 20 Hz) sigue corriendo en tu PC o en un VPS con `run.bat`; cuando está encendido envía sus datos aquí.

## Despliegue en un clic

1. Crea una cuenta gratuita en <https://dash.cloudflare.com/sign-up> (si no la tienes).
2. Doble clic en **`desplegar.bat`**. Hará esto por ti:
   - instala `wrangler` (la herramienta oficial de Cloudflare),
   - abre el navegador para que inicies sesión en Cloudflare (solo la primera vez),
   - crea la base de datos D1 `prw` y sus tablas (`schema.sql`),
   - genera una clave secreta y la guarda cifrada en Cloudflare (`SYNC_KEY`),
   - publica el Worker y te muestra su dirección `https://pokemon-rush-world.TU-USUARIO.workers.dev`,
   - escribe `CLOUD_URL` y `CLOUD_KEY` en el `.env` del juego.
3. Cierra el servidor de juego (Ctrl+C) y vuelve a abrir `run.bat`. En la consola verás `[nube] sincronizando con ...`.

A partir de ahí **no tienes que volver a hacer nada**: `run.bat` ejecuta `web/autodeploy.mjs` al arrancar y, si cambió algo de esta carpeta desde la última publicación, aplica el esquema (no borra datos) y vuelve a publicar el Worker. La sesión de Cloudflare se guarda en `web/.wrangler-home/`, separada de cualquier otra cuenta de wrangler del PC.

Opcional: pon en `.env` `PUBLIC_URL=` la dirección pública del juego (por ejemplo la de `compartir-internet.bat`) para que la web muestre el botón **Jugar ahora**.

## Tu web

Publicada en **<https://pokemon-rush-world.pokemonrush.workers.dev>** (cuenta pajaroramos55, subdominio `pokemonrush.workers.dev`, base de datos D1 `prw`).

## Jugar desde cualquier PC o móvil (sin descargar nada)

Los jugadores solo necesitan un navegador. Comparte siempre el mismo enlace:

**<https://pokemon-rush-world.pokemonrush.workers.dev/jugar>**

Cuando abres `run.bat`, el servidor abre solo una dirección pública con Cloudflare (`https://xxxx.trycloudflare.com`, gratis, sin tocar el router) y se la comunica a la web; `/jugar` y el botón **Jugar ahora** redirigen siempre a la dirección vigente. Si tu PC servidor está apagado, `/jugar` muestra "El servidor está apagado". Solo el PC servidor necesita `cloudflared` (ya instalado; en otro PC: `winget install --id Cloudflare.cloudflared`). Para desactivarlo: `TUNNEL=false` en `.env`.

## Entrar con Google

El botón **Entrar con Google** aparece en el menú del juego y en la web. El inicio de sesión se hace en la web fija (la dirección del túnel cambia cada vez y Google solo admite direcciones registradas); la web comprueba la cuenta con Google y envía al juego un pase firmado con la clave secreta, válido 5 minutos. La primera vez se elige el nombre de entrenador; después se entra directo desde cualquier sitio, y la cuenta se recupera de la nube aunque el servidor pierda `data/`.

Para activarlo hace falta un **ID de cliente de Google** (gratis, una sola vez, unos 5 minutos):

1. Entra en <https://console.cloud.google.com/> con tu cuenta de Google y crea un proyecto (por ejemplo "Pokemon Rush World").
2. *APIs y servicios → Pantalla de consentimiento de OAuth*: tipo **Externo**, nombre de la app y tu correo. Publica la app (o añade como "usuarios de prueba" los correos que vayan a jugar).
3. *APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth*: tipo **Aplicación web**. En **Orígenes de JavaScript autorizados** añade `https://pokemon-rush-world.pokemonrush.workers.dev`. Crea.
4. Copia el **ID de cliente** (acaba en `.apps.googleusercontent.com`; no es secreto) y pégalo en `web/wrangler.toml`, en `GOOGLE_CLIENT_ID = "..."`.
5. Abre `run.bat`: detecta el cambio y publica la web sola. Ya aparece el botón.

## Si falla el inicio de sesión

- **`Timed out waiting for authorization code`**: no se pulsó "Allow" a tiempo. Vuelve a ejecutar `desplegar.bat`.
- **`request_forbidden` / `CSRF value ... does not match`**: se usó la pestaña de un intento anterior o el navegador no tenía la sesión de Cloudflare abierta. Cierra todas las pestañas de Cloudflare, entra primero en <https://dash.cloudflare.com> en tu navegador predeterminado, ejecuta `desplegar.bat` y usa solo la pestaña nueva.
- **Sale otra cuenta**: responde `n` a la pregunta "¿Es la cuenta...?"; se cierra la sesión de este proyecto y puedes entrar con la buena. La sesión se guarda en `web/.wrangler-home/` y no afecta a otras cuentas de wrangler del PC.
- **Plan B sin navegador**: en el panel de Cloudflare crea un token en *Mi perfil → API Tokens* con la plantilla "Edit Cloudflare Workers" más permiso *D1: Edit*, y guárdalo en `web/cloudflare-token.txt` (primera palabra: el token; opcional, segunda: el Account ID). `desplegar.bat` y el despliegue automático lo usarán. Ese archivo no se comparte ni se sube a git.
- **`You need to register a workers.dev subdomain`**: tu cuenta es nueva; elige un subdominio gratis en *Workers & Pages* del panel y repite.

## Manualmente

```bash
cd web
npm install
npx wrangler login
npx wrangler d1 create prw          # copia el database_id en wrangler.toml
npx wrangler d1 execute prw --remote --file=schema.sql
npx wrangler secret put SYNC_KEY    # escribe una clave larga y aleatoria
npx wrangler deploy
```

Y en el `.env` del juego: `CLOUD_URL=https://...workers.dev` y `CLOUD_KEY=` la misma clave.

## Probar en local

```bash
cd web
echo SYNC_KEY=clave-de-prueba-local-123456 > .dev.vars
npx wrangler d1 execute prw --local --file=schema.sql
npx wrangler dev --local --port 8787
```

Con el Worker local arrancado, `npx tsx scripts/cloud-test.ts 3020 3021 http://127.0.0.1:8787` (desde la carpeta del juego, con dos servidores en 3020 y 3021 apuntando a él) comprueba la subida y la recuperación de cuentas.

## Seguridad y privacidad

- Las rutas que escriben o leen copias completas (`/api/sync`, `/api/heartbeat`, `/api/feed`, `/api/backup/...`) exigen la cabecera `Authorization: Bearer SYNC_KEY`. Sin ella responden 401.
- La web pública solo ve el perfil (nivel, equipo, estadísticas). Nunca la partida completa ni datos de acceso.
- Para poder restaurar cuentas, el servidor sube el **hash scrypt** de la contraseña (nunca la contraseña). Si no quieres que salga de tu PC, pon `CLOUD_AUTH=false` en `.env`: se seguirán guardando partidas y estadísticas, pero la recuperación automática de cuentas no funcionará.

## Límites del plan gratuito

100.000 peticiones al día en Workers y 5 GB en D1. Con un latido por minuto y una subida cada pocos segundos como mucho, un servidor con decenas de jugadores queda muy por debajo.
