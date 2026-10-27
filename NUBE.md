# Pokémon Rush World 24/7 en la nube (sin tu PC encendido)

`run.bat` sirve para jugar en tu PC. Para que el juego esté siempre en Internet aunque apagues el ordenador, el **servidor de juego** tiene que correr en un hosting. La web, el ranking y las copias de las partidas ya están en Cloudflare y no dependen de tu PC.

## Qué ya está preparado

- **Las partidas viven en la nube** (Cloudflare D1). El servidor sube cada guardado como mucho cada 8 s. Si el hosting se reinicia o pierde su disco, cada jugador recupera su partida al entrar: con contraseña, con Google o como invitado (desde el mismo navegador).
- **Dirección pública automática**: en Render, Fly.io, Koyeb o Railway el servidor detecta su propia dirección y se la pasa a la web. El enlace fijo <https://pokemon-rush-world.pokemonrush.workers.dev/jugar> lleva siempre a él.
- **Siempre despierto**: los hostings gratuitos duermen el servidor si nadie entra; la web de Cloudflare lo despierta cada 10 minutos.
- `Dockerfile` y `render.yaml` listos.

## Opción A · Render (gratis, la más sencilla)

Necesita una cuenta gratuita de GitHub y otra de Render.

1. Crea un repositorio **privado** en GitHub y sube esta carpeta (`PokemonRushWorld`). El `.gitignore` ya excluye `.env`, `data/` y las claves.
2. En <https://dashboard.render.com> → **New → Blueprint** → elige el repositorio. Render lee `render.yaml`.
3. Cuando pida `CLOUD_KEY`, pega el valor de `CLOUD_KEY=` de tu `.env`.
4. En unos minutos el juego estará en `https://pokemon-rush-world.onrender.com` y `/jugar` apuntará allí.

Límites del plan gratuito: 512 MB de RAM y 750 h al mes (suficiente para un servicio encendido todo el mes). El primer acceso tras un reinicio tarda ~1 minuto.

## Opción B · Oracle Cloud "Always Free" (un servidor de verdad, gratis para siempre)

Una máquina virtual de 1 GB (o ARM de hasta 24 GB) gratuita sin límite de tiempo. Pide una tarjeta para verificar la identidad, pero no cobra si te quedas en los recursos gratuitos.

1. Crea la VM (Ubuntu) en <https://cloud.oracle.com> y abre el puerto 3000 en su lista de seguridad.
2. En la VM: instala Node 22 (`curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs`), copia la carpeta del juego y ejecuta `npm install && npm run build`.
3. Crea el `.env` con `CLOUD_URL`, `CLOUD_KEY`, `TUNNEL=true` (o `PUBLIC_URL=http://IP:3000`) y déjalo como servicio: `sudo npm i -g pm2 && pm2 start "npx tsx server/index.ts" --name prw && pm2 save && pm2 startup`.

## Opción C · Fly.io / Railway / Koyeb

Funcionan con el mismo `Dockerfile`. Fly.io y Railway piden tarjeta y su plan gratuito es limitado; Koyeb tiene un servicio gratuito pequeño. En todos: variables `CLOUD_URL`, `CLOUD_KEY` y `TUNNEL=false`.

## ¿Y no se puede todo en Cloudflare?

La web y la base de datos sí (ya lo están). El servidor de juego es un bucle en tiempo real a 20 ticks por segundo con WebSockets; en Cloudflare tendría que reescribirse como *Durable Object*, y el plan gratuito no da para más de un par de jugadores a la vez. Por eso se usa un hosting aparte.
