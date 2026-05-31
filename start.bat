@echo off
REM ═══════════════════════════════════════════════════════════════════
REM Tarot Divinatoire - Lancement Rapide
REM ═══════════════════════════════════════════════════════════════════
REM Ce script lance le serveur de développement accessible depuis ton réseau local
REM ═══════════════════════════════════════════════════════════════════

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║     🎴 Tarot Divinatoire - Lancement 🎴                  ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Obtenir l'adresse IP locale
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "IPADDR=%%a"
    goto :found
)
:found
set "IPADDR=%IPADDR: =%"

echo 📡 Adresse IP locale: %IPADDR%
echo.
echo 🚀 Lancement du serveur de développement...
echo.
echo ─────────────────────────────────────────────────────────────
echo 📱 Pour accéder à l'app depuis ton smartphone :
echo    → http://%IPADDR%:3000
echo    → Ou http://localhost:3000 depuis cet ordinateur
echo ─────────────────────────────────────────────────────────────
echo.
echo 💡 Mode : SANS BASE DE DONNÉES (stockage en mémoire)
echo 🎮 Appuyez sur Ctrl+C pour arrêter le serveur
echo.

REM Lancer Next.js en écoutant sur toutes les interfaces
set NEXT_HOST=0.0.0.0
set NEXT_PORT=3000

npm run dev -- --hostname 0.0.0.0 --port 3000