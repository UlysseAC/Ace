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

Le serveur affiche au démarrage les adresses IP locales à utiliser depuis les autres appareils (HTTP sur le port `3000`, HTTPS sur le port `3443` — voir la section certificat ci-dessous). Tous les appareils doivent être sur le **même réseau Wi-Fi**.

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

## 📷 Scan caméra sur les bornes iPad (Safari)

Safari sur iOS bloque l'accès à la caméra pour les pages qui ne sont pas en HTTPS de confiance (hors `localhost`). Le serveur tourne donc en HTTPS avec un certificat local auto-signé, sur un port dédié :

- **Port `3000` (HTTP)** : sert uniquement au téléchargement du certificat, à faire une seule fois par borne.
- **Port `3443` (HTTPS)** : l'application complète, à utiliser pour tout le reste — c'est cette adresse qu'il faut ouvrir/mettre en favori sur chaque borne.

### Installer le certificat sur un iPad (une seule fois par appareil)

1. Sur l'iPad, dans Safari, aller sur `http://<IP-du-serveur>:3000/cert.pem`.
2. Safari propose de télécharger un profil : accepter, puis ouvrir **Réglages**.
3. **Réglages → Général → VPN et gestion de l'appareil** → toucher le profil téléchargé → **Installer** (code de l'iPad demandé).
4. Toujours dans **Réglages → Général → Informations → Paramètres de confiance des certificats**, activer la confiance totale pour **"Casino RP Local"**.
5. Ouvrir ensuite `https://<IP-du-serveur>:3443` — le cadenas doit apparaître, et le scan caméra fonctionne.

Le certificat est régénéré automatiquement si l'IP du serveur change (ex: nouveau réseau Wi-Fi) — il faudra alors refaire l'installation sur chaque borne.

En secours (caméra indisponible ou certificat pas encore installé), **chaque chèque et carte physique imprime aussi un code en texte lisible sous le QR**, saisissable à la main dans l'interface banque automatisée. Teste les deux méthodes avant la soirée.

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
