@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
title Pokemon Rush World - Servidor

echo.
echo  =====================================================
echo     POKEMON RUSH WORLD  -  Servidor multijugador
echo  =====================================================
echo.

REM ---------- 1. Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] No se ha encontrado Node.js.
  echo.
  echo  Instala Node.js 22 LTS o superior desde https://nodejs.org
  echo  ^(o ejecuta: winget install OpenJS.NodeJS.LTS^) y vuelve a abrir run.bat
  echo.
  pause
  exit /b 1
)
for /f "tokens=1 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
for /f "tokens=2 delims=." %%a in ('node -v') do set NODE_MINOR=%%a
echo  Node.js detectado: & node -v
if !NODE_MAJOR! LSS 22 (
  echo  [ERROR] Se necesita Node.js 22.13 o superior ^(usa SQLite integrado^). Tienes la version !NODE_MAJOR!.
  echo  Descarga la version LTS en https://nodejs.org
  pause
  exit /b 1
)
if !NODE_MAJOR! EQU 22 if !NODE_MINOR! LSS 13 (
  echo  [ERROR] Se necesita Node.js 22.13 o superior. Actualiza desde https://nodejs.org
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] npm no esta disponible. Reinstala Node.js desde https://nodejs.org
  pause
  exit /b 1
)

REM ---------- 2. Configuracion ----------
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo  Creado .env con la configuracion por defecto.
)
set PORT=3000
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
  if /i "%%a"=="PORT" set PORT=%%b
)

REM ---------- 3. Dependencias ----------
set NEED_INSTALL=0
if not exist "node_modules\phaser\package.json" set NEED_INSTALL=1
if not exist "node_modules\ws\package.json" set NEED_INSTALL=1
if not exist "node_modules\tsx\package.json" set NEED_INSTALL=1
if not exist "node_modules\vite\package.json" set NEED_INSTALL=1
if !NEED_INSTALL! EQU 1 (
  echo.
  echo  Instalando dependencias ^(solo la primera vez, puede tardar 1-2 minutos^)...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo al instalar dependencias. Revisa tu conexion a Internet y vuelve a intentarlo.
    pause
    exit /b 1
  )
)

REM ---------- 4. Base de datos ----------
echo.
call npx tsx server/database/check.ts
if errorlevel 1 (
  echo  [ERROR] No se pudo preparar la base de datos.
  pause
  exit /b 1
)

REM ---------- 5. Compilar cliente ----------
node scripts/needs-build.mjs
if errorlevel 1 (
  echo.
  echo  Compilando el cliente del juego...
  call npm run build
  if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo al compilar el cliente.
    pause
    exit /b 1
  )
) else (
  echo  Cliente ya compilado y actualizado.
)

REM ---------- 6. Web en Cloudflare (se publica sola si cambia la carpeta web) ----------
if exist "web\autodeploy.mjs" node web\autodeploy.mjs
REM ---------- 6b. Servidor 24 h en Render (si ya ejecutaste subir-a-render.bat) ----------
if exist "scripts\auto-push.mjs" node scripts\auto-push.mjs
set JUGAR_EN_NUBE=false
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
  if /i "%%a"=="JUGAR_EN_NUBE" set JUGAR_EN_NUBE=%%b
)
if /i "!JUGAR_EN_NUBE!"=="true" (
  echo.
  echo  Abriendo el juego de la nube ^(servidor 24 h, no hace falta este PC^)...
  start "" "https://pokemon-rush-world.pokemonrush.workers.dev/jugar"
  timeout /t 4 >nul
  exit /b 0
)

REM ---------- 7. Arrancar servidor + abrir navegador ----------
echo.
echo  Arrancando el servidor en el puerto !PORT! ...
echo  ^(si Windows pregunta por el Firewall, permite el acceso en redes privadas para jugar en LAN^)
if not defined PRW_NO_BROWSER start "" /b node scripts/open-when-ready.mjs !PORT!
call npx tsx server/index.ts
set CODE=!errorlevel!

echo.
if not "!CODE!"=="0" (
  echo  [ERROR] El servidor se ha detenido con codigo !CODE!. Revisa los mensajes de arriba.
) else (
  echo  Servidor detenido.
)
pause
endlocal
