#!/bin/bash
# Lancé détaché du process Node (voir lib/selfUpdate.js) pour survivre
# au redémarrage automatique du serveur déclenché par node --watch
# dès que git pull modifie des fichiers du backend.
cd "$(dirname "$0")/../.."

echo "=== Mise à jour démarrée $(date) ==="
git pull
GIT_STATUS=$?
if [ $GIT_STATUS -ne 0 ]; then
  echo "UPDATE_FAILED (git pull a échoué) $(date)"
  exit 1
fi

npm install
INSTALL_STATUS=$?
if [ $INSTALL_STATUS -ne 0 ]; then
  echo "UPDATE_FAILED (npm install a échoué) $(date)"
  exit 1
fi

npm run build:client
BUILD_STATUS=$?
if [ $BUILD_STATUS -ne 0 ]; then
  echo "UPDATE_FAILED (build du frontend échoué) $(date)"
  exit 1
fi

echo "UPDATE_DONE $(date)"
