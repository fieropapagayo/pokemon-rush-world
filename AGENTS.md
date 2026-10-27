# Instrucciones para IAs que trabajan en este proyecto (Claude, Gemini, Codex...)

Varias IAs trabajan a la vez en Pokémon Rush World. Sigue estas reglas.

## Al terminar CADA versión: publicar

1. Sube la versión en `package.json`, añade la entrada en `CHANGELOG.md` y en `shared/changelog.ts` (`RELEASE` y la primera línea de `CHANGELOG`).
2. Ejecuta las pruebas que afecten a lo que cambiaste (`npm run check`, `npm run test:world`, `test:models`, `test:visuals`, `test:nav`; con el servidor de pruebas en el puerto 3020: `test:gameplay`, `test:mechanics`, `test:bots`).
3. **Publica**: `publicar.bat` (o `node scripts/publish.mjs "mensaje"`). Esto:
   - comprueba TypeScript y compila el cliente (si falla, no sube nada),
   - hace commit y `git push` a GitHub (`origin main`) → **Render redespliega el servidor solo** (3-6 min),
   - publica la web de Cloudflare si cambió la carpeta `web/`.
4. Pon el changelog al final de tu respuesta al usuario.

## Nunca subas secretos

`.env` (CLOUD_KEY), `data/`, `*.db`, `web/.dev.vars`, `web/.wrangler-home/`, `web/cloudflare-token.txt`. `.gitignore` ya los excluye y `publish.mjs` se niega a subirlos.

## Arquitectura en una línea

Servidor autoritativo Node 22 (`server/`, 20 Hz), cliente Phaser 3 + Vite (`client/`), mundo determinista compartido (`shared/world/worldgen.ts`: cliente y servidor lo generan igual; si lo cambias, reinicia el servidor). Web y nube en Cloudflare Worker + D1 (`web/`). Servidor 24 h en Render (`render.yaml`, `Dockerfile`).

## Convivencia entre IAs

- Antes de editar un archivo, vuelve a leerlo: otra IA puede haberlo cambiado.
- No sobrescribas un archivo entero con una copia antigua; aplica cambios concretos.
- Textos del juego en español.
