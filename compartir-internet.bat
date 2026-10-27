@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
title Pokemon Rush World - Compartir por Internet

echo.
echo  Compartir tu servidor por Internet con Cloudflare Quick Tunnel (gratis, sin abrir puertos)
echo  ----------------------------------------------------------------------------------------
echo  1) Deja run.bat abierto (el servidor debe estar funcionando).
echo  2) Este script crea una direccion https://xxxx.trycloudflare.com temporal.
echo  3) Pasa esa direccion a tus amigos: la abren en el navegador y juegan contigo.
echo.

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo  [!] No tienes cloudflared instalado.
  echo      Instalalo con este comando en una terminal y vuelve a abrir este archivo:
  echo.
  echo        winget install --id Cloudflare.cloudflared
  echo.
  echo      Alternativa sin instalar nada: usa Tailscale ^(ver README^).
  pause
  exit /b 1
)

set PORT=3000
if exist ".env" for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
  if /i "%%a"=="PORT" set PORT=%%b
)

echo  Busca abajo una linea con  https://....trycloudflare.com  y compartela.
echo  Cierra esta ventana para dejar de compartir.
echo.
cloudflared tunnel --url http://localhost:!PORT!
pause
endlocal
