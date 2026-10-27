@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Pokemon Rush World - Publicar (GitHub + Render + web)
echo.
echo  =====================================================
echo     POKEMON RUSH WORLD  -  Publicar la nueva version
echo  =====================================================
echo   Comprueba, compila, sube a GitHub (Render se actualiza solo)
echo   y publica la web de Cloudflare.
echo.
node scripts\publish.mjs %*
echo.
pause
