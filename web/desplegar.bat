@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Pokemon Rush World - Desplegar en Cloudflare
echo.
echo  =====================================================
echo     POKEMON RUSH WORLD  -  Web y copias en Cloudflare
echo  =====================================================
echo.
echo  Esto publica GRATIS en tu cuenta de Cloudflare:
echo   - la web de ranking y perfiles de los jugadores
echo   - la base de datos con las estadisticas y copias de las partidas
echo  Si no tienes cuenta, creala antes en https://dash.cloudflare.com/sign-up
echo.
pause
where node >nul 2>nul
if errorlevel 1 ( echo [ERROR] Necesitas Node.js 22+ ^(https://nodejs.org^) & pause & exit /b 1 )
if not exist "node_modules\wrangler\package.json" (
  echo  Instalando wrangler ^(herramienta oficial de Cloudflare^)...
  call npm install --no-fund --no-audit
  if errorlevel 1 ( echo [ERROR] No se pudo instalar wrangler & pause & exit /b 1 )
)
node setup.mjs
echo.
pause
