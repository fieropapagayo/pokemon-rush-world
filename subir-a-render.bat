@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Pokemon Rush World - Subir a Render (24 h gratis)
echo.
echo  =====================================================
echo     POKEMON RUSH WORLD  -  Servidor 24 h en Render
echo  =====================================================
echo.
echo  Necesitas (gratis): una cuenta de GitHub y otra de Render
echo   https://github.com/signup     https://dashboard.render.com/register
echo  En Render puedes registrarte directamente con tu GitHub.
echo.
pause
where git >nul 2>nul
if errorlevel 1 ( echo [ERROR] Falta Git: winget install --id Git.Git & pause & exit /b 1 )
node scripts\render-setup.mjs
echo.
pause
