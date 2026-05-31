@echo off
REM ═══════════════════════════════════════════════════════════════════
REM Tarot Divinatoire - Restauration
REM ═══════════════════════════════════════════════════════════════════
REM Restaure le projet depuis un backup précédent
REM ═══════════════════════════════════════════════════════════════════

setlocal EnableDelayedExpansion

set "BACKUP_ROOT=C:\Users\tsall\Projects\Application Tirage Tarot\backups"
set "PROJECT_DIR=C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space"

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║     🔄 Tarot Divinatoire - Restauration 🔄               ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM ► Lister les backups disponibles
echo 📜 Backups disponibles :
echo ═══════════════════════════════════════════════════════════
dir /b "!BACKUP_ROOT!" | findstr /c:"tarot_backup"
echo ═══════════════════════════════════════════════════════════
echo.

set /p BACKUP_NAME="Entrez le nom du backup à restaurer (ex: tarot_backup_20260531_220000): "

if not exist "!BACKUP_ROOT!\!BACKUP_NAME!" (
    echo ❌ Erreur: Ce backup n'existe pas !
    pause
    exit /b 1
)

echo.
echo ⚠️  ATTENTION : Cette opération va ÉCRASER les fichiers actuels !
echo.
echo Source      : !BACKUP_ROOT!\!BACKUP_NAME!
echo Destination : !PROJECT_DIR!
echo.

set /p CONFIRM="Continuer ? (O/N): "
if /i not "!CONFIRM!"=="O" (
    echo ⚠️  Opération annulée.
    pause
    exit /b 0
)

echo.
echo 🔄 Sauvegarde de la version actuelle (sécurité)...
set "TIMESTAMP=%DATE:~6,4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "TIMESTAMP=!TIMESTAMP: =0!"
set "TIMESTAMP=!TIMESTAMP:=!"
set "SAFE_BACKUP=!BACKUP_ROOT!\pre_restore_!TIMESTAMP!"

if not exist "!BACKUP_ROOT!" mkdir "!BACKUP_ROOT!"
robocopy "!PROJECT_DIR!" "!SAFE_BACKUP!" /MIR /XD node_modules .next /NFL /NDL /NJH /NJS /nc /ns /np
echo ✅ Version actuelle sauvegardée dans: !SAFE_BACKUP!
echo.

echo 🔄 Restauration en cours...
robocopy "!BACKUP_ROOT!\!BACKUP_NAME!" "!PROJECT_DIR!" /MIR /NFL /NDL /NJH /NJS /nc /ns /np

echo.
echo ✅ Restauration terminée !
echo.
echo 🎯 Prochaines étapes :
echo    1. Si node_modules a changed: npm install
echo    2. Redémarrer le serveur: npm run dev
echo.

pause