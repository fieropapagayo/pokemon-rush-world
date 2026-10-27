# Imagen para desplegar Pokémon Rush World en un servidor (Render, Fly.io, Koyeb, Railway, VPS...)
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build
ENV PORT=3000 HOST=0.0.0.0 DB_FILE=/data/pokemon-rush.db TUNNEL=false
VOLUME ["/data"]
EXPOSE 3000
CMD ["npx", "tsx", "server/index.ts"]
