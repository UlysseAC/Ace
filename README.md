# Casino RP

Plateforme multi-interfaces pour une soirée casino RP, déployée en local (aucun accès internet requis le jour J).

## Les 5 interfaces

| Interface | URL | Accès |
|---|---|---|
| Écran d'affichage | `/affichage` | Public, sans connexion |
| Banque automatisée (joueur) | `/joueur` | Login numéro + code |
| Croupier | `/croupier` | Public, sans connexion |
| Banquier | `/banquier` | Public, sans connexion |
| Éditeur / Admin | `/editeur` | Login identifiant + code |

Depuis `/`, chaque appareil choisit son interface le jour J.

## Installation

Prérequis : Node.js 20+.

```bash
npm install          # installe les deux workspaces (server + client)
npm run build:client # build de production du frontend
npm start             # démarre le serveur (sert aussi le frontend buildé)
```

Le serveur affiche au démarrage l'adresse IP locale à utiliser depuis les autres appareils (ex: `http://192.168.1.42:3000`). Tous les appareils doivent être sur le **même réseau Wi-Fi**.

### Mode développement

```bash
npm run dev:server   # backend avec rechargement automatique (port 3000)
npm run dev:client   # frontend Vite avec proxy vers le backend (port 5173)
```

## ⚠️ À faire avant la soirée

1. **Changer les identifiants éditeur par défaut** (`admin` / `admin`) : Éditeur → Configuration, ou directement en base.
2. **Changer le code admin de sortie** (par défaut `0000`) : Éditeur → Configuration → "Code admin de sortie de la banque automatisée".
3. **Créer les comptes joueurs** : Éditeur → Joueurs.
4. **Configurer les 3 dés, les cartes, les missions/produits/pénalités, les montants et les phrases affichées.**
5. **Uploader le modèle de chèque** et générer les QR codes des missions (Éditeur → Imprimerie) et des cartes physiques (Éditeur → Cartes).
6. **Faire un tour de chaque interface sur un vrai appareil** (caméra du scan notamment) avant l'arrivée des joueurs.
7. Garder l'appareil serveur **branché sur secteur** pendant toute la soirée.

## Sauvegardes

Le serveur sauvegarde automatiquement la base de données toutes les 5 minutes dans `server/data/backups/` (réglable via `BACKUP_INTERVAL_MIN`). En cas de plantage, arrêtez le serveur, remplacez `server/data/casino.db` par la sauvegarde la plus récente, puis relancez.

## Procédures de secours (panne serveur)

- **Banquier** : bouton "Export CSV de secours" (ouvrable dans LibreOffice Calc) pour continuer à pointer les comptes à la main.
- **Croupiers** : chèques papier manuscrits, à réconcilier dans le système au retour du serveur.
- **Mode Local** (Éditeur/Banquier) : bloque le scan des cartes physiques en cas de doute sur la fiabilité du réseau, et bascule le banquier en validation manuelle des chèques papier.

## Structure du projet

```
server/   API Node.js + Express + Socket.io + SQLite (better-sqlite3)
client/   Frontend React (Vite)
```

Toutes les écritures d'argent passent par des transactions SQLite atomiques (voir `server/src/lib/transactions.js`), ce qui élimine les problèmes de concurrence entre croupiers/banquier/joueurs agissant simultanément sur un même compte.
