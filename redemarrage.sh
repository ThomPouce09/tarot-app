#!/bin/bash
# Script de redémarrage Next.js - Version Basique
# Ce script nettoie les caches et redémarre l'application Next.js

# Configuration - modifier si nécessaire
PROJECT_PATH="$(pwd)"
NEXT_PORT=3002
BUILD_LOG="$PROJECT_PATH/build.log"
SERVER_LOG="$PROJECT_PATH/server.log"

echo "=== Redémarrage Net de Next.js ==="
echo "Projet: $PROJECT_PATH"
echo "Port: $NEXT_PORT"
echo "Logs: $BUILD_LOG et $SERVER_LOG"

# Phase 1 : Arrêter tous les processus Node.js en arrière-plan
echo "Arrêt du serveur Next.js existant..."
pkill -f "node.*next" 2>/dev/null || echo "Aucun processus Node.js trouvé."
sleep 2

# Phase 2 : Supprimer les caches obsolètes
echo "Nettoyage des caches .next et .cache..."
rm -rf .next .cache 2>/dev/null || echo "Pas de caches trouvés."
echo "Caches nettoyés."

# Phase 3 : Installer/mettre à jour les dépendances (optionnel)
if [ -f package-lock.json ]; then
    echo "Installation/mise à jour des npm packages..."
    npm install --silent
else
    echo "package-lock.json non trouvé - en sautant l'installation."
fi

# Phase 4 : Construire l'application Next.js
echo "Construction Next.js..."
npm run build --verbose > "$BUILD_LOG" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Construction terminée avec succès !"
else
    echo "❌ Construction échouée !"
    echo "Derniers 20 lignes du build.log :"
    tail -n 20 "$BUILD_LOG" 2>/dev/null || echo "Pas de build.log disponible."
    exit 1
fi

# Phase 5 : Démarrer le serveur Next.js
echo "Démarrage du serveur Next.js sur le port $NEXT_PORT..."
npm run start --port $NEXT_PORT > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
echo "Serveur démarré (PID: $SERVER_PID)"

# Phase 6 : Test de santé du serveur
echo "Test de santé du serveur..."
sleep 3  # Donner le temps au serveur de démarrer

echo "Test de l'API health-check..."
if curl -s -X POST http://localhost:$NEXT_PORT/api/auth/update-account \
       -H "Content-Type: application/json" \
       -d '{"email":"health-check@test.com"}' > /dev/null 2>&1; then
    echo "✅ Health check réussi !"
else
    echo "❌ Health check échoué après plusieurs tentatives."
    echo "Vérification des logs du serveur..."
    tail -n 30 "$SERVER_LOG" 2>/dev/null || echo "Pas de logs serveur."
    # Tuer le processus serveur 
    echo "Nettoyage : arrêt du processus serveur..."
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Affichage des informations finales
echo ""
echo "=== Résumé du redémarrage ==="
echo "URL : http://localhost:$NEXT_PORT"
echo "Log de construction : $BUILD_LOG"
echo "Log serveur : $SERVER_LOG"
echo "✅ Application prête à l'emploi !"
echo "================================================="

# Ne pas tuer le processus serveur (laisser les tests continuer)
# Enlever le commentaire suivant si vous voulez arrêter le serveur ensuite :
# echo "Arrêt du serveur..."
# kill $SERVER_PID
echo "Serveur toujours en fonctionnement (PID: $SERVER_PID)"

