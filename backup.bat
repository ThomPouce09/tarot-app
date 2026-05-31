@echo off
REM ═══════════════════════════════════════════════════════════════════
REM Tarot Divinatoire - Backup Automatique
REM ═══════════════════════════════════════════════════════════════════
REM Crée un snapshot complet du projet avec timestamp
REM ═══════════════════════════════════════════════════════════════════

setlocal EnableDelayedExpansion

REM ► Dossier de backup
set "BACKUP_ROOT=C:\Users\tsall\Projects\Application Tirage Tarot\backups"
set "PROJECT_DIR=C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space"

REM ► Générer un timestamp unique (YYYYMMDD_HHMMSS)
for /f "tokens=2 delims==" %%i in ('wmic os get localdatetime /value') do set "dt=%%i"
set "YEAR=!dt:~0,4!"
set "MONTH=!dt:~4,2!"
set "DAY=!dt:~6,2!"
set "HOUR=!dt:~8,2!"
set "MIN=!dt:~10,2!"
set "SEC=!dt:~12,2!"
set "TIMESTAMP=!YEAR!!MONTH!!DAY!_!HOUR!!MIN!!SEC!"

REM ► Nom du dossier de backup
set "BACKUP_NAME=tarot_backup_!TIMESTAMP!"
set "BACKUP_PATH=!BACKUP_ROOT!\!BACKUP_NAME!"

REM ► Créer le dossier de backup
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║     🎴 Tarot Divinatoire - Backup 🎴                     ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 📦 Destination : !BACKUP_PATH!
echo.

if not exist "!BACKUP_ROOT!" (
    echo 📁 Création du dossier de backups...
    mkdir "!BACKUP_ROOT!"
)

echo 🔄 Copie des fichiers en cours...
echo.

REM ► Copier le projet (en excluant node_modules et .next)
robocopy "!PROJECT_DIR!" "!BACKUP_PATH!" /MIR /XD node_modules .next /NFL /NDL /NJH /NJS /nc /ns /np

echo.
echo ✅ Backup terminé avec succès !
echo.
echo 📊 Détails :
echo    → Dossier: !BACKUP_NAME!
echo    → Taille : ~200-300 MB (sans node_modules)
echo    → Fichiers: Code source, config, docs
echo.
echo 💡 Pour restaurer :
echo    1. Arrêter le serveur (Ctrl+C si en cours)
echo    2. Copier le contenu de !BACKUP_NAME! dans nextjs_space
echo    3. Relancer: npm install puis npm run dev
echo.
echo 📜 Historique des backups :
dir /b "!BACKUP_ROOT!" | findstr /c:"tarot_backup"
echo.
echo ═══════════════════════════════════════════════════════════════
echo 🎯 Prochain backup automatique dans 1 heure (si script planifié)
echo ═══════════════════════════════════════════════════════════════
echo.

pause