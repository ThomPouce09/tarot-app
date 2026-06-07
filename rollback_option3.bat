@echo off
REM ═══════════════════════════════════════════════════════════════════
REM Option 3 Wide Fan - Rollback Rapide
REM ═══════════════════════════════════════════════════════════════════
REM Restaure les fichiers originaux AVANT l'implémentation de l'Option 3
REM (éventail large avec interactions avancées)
REM ═══════════════════════════════════════════════════════════════════

setlocal EnableDelayedExpansion

set "BACKUP_DIR=C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space\backups\file_backups"
set "PROJECT_DIR=C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space"

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║     🔄 Option 3 Rollback - Retour version originale      ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM ► Trouver les backups les plus récents
echo 🔍 Recherche des backups originaux...
for /f "tokens=*" %%f in ('dir /b /o-d "!BACKUP_DIR!\config.ts.*.original" ^| findstr /c:"config.ts."') do (
    set "CONFIG_BACKUP=%%f"
    goto :found_config
)
:found_config

for /f "tokens=*" %%f in ('dir /b /o-d "!BACKUP_DIR!\card-fan.tsx.*.original" ^| findstr /c:"card-fan.tsx"') do (
    set "FAN_BACKUP=%%f"
    goto :found_fan
)
:found_fan

if not defined CONFIG_BACKUP (
    echo ❌ Erreur: Backup config.ts introuvable !
    pause
    exit /b 1
)

if not defined FAN_BACKUP (
    echo ❌ Erreur: Backup card-fan.tsx introuvable !
    pause
    exit /b 1
)

echo ✅ Backups trouvés :
echo    → !CONFIG_BACKUP!
echo    → !FAN_BACKUP!
echo.

echo ⚠️  ATTENTION :Cette operation va restaurer les fichiers originaux
echo    (avant l'option 3 - éventail large)
echo.
echo Fichiers à restaurer :
echo    1. lib\config.ts
echo    2. app\components\card-fan.tsx
echo.

set /p CONFIRM="Continuer la restauration ? (O/N): "
if /i not "!CONFIRM!"=="O" (
    echo ⚠️  Opération annulée.
    pause
    exit /b 0
)

echo.
echo 🔄 Restauration en cours...

copy "!BACKUP_DIR!\!CONFIG_BACKUP!" "!PROJECT_DIR!\lib\config.ts" /Y > nul
echo    ✓ config.ts restauré

copy "!BACKUP_DIR!\!FAN_BACKUP!" "!PROJECT_DIR!\app\components\card-fan.tsx" /Y > nul
echo    ✓ card-fan.tsx restauré

echo.
echo ✅ Restauration terminée avec succès !
echo.
echo 🎯 Prochaines étapes :
echo    1. Refresh ton navigateur (Ctrl+F5 pour hard refresh)
echo    2. Ou redémarre le serveur si nécessaire
echo.
echo 💡 Le backup de la version Option 3 est sauvegardé dans :
echo    backups\file_backups\ (cherche les fichiers .modified)
echo.

pause