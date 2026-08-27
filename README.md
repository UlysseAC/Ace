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

`npm start` surveille automatiquement les fichiers du serveur et redémarre tout seul dès qu'ils changent (ex: après un `git pull`) — pas besoin de faire Ctrl+C manuellement.

### Mettre à jour vers la dernière version

Dans un **second terminal** (sans toucher à celui où `npm start` tourne) :

```bash
npm run update   # git pull + npm install + rebuild du frontend
```

Le serveur détecte le changement et redémarre tout seul (quelques secondes de coupure). Le frontend, lui, se met à jour dès qu'on recharge la page dans le navigateur — pas besoin de relancer quoi que ce soit pour lui.

**Bouton "Mettre à jour" dans l'interface** (test uniquement) : Éditeur → Configuration → "🔄 Mettre à jour depuis GitHub" fait exactement la même chose sans passer par le terminal — pratique pour tester depuis un iPad. Le processus de mise à jour tourne détaché du serveur, donc il continue même si le serveur redémarre en plein milieu. À ne pas garder actif le soir de l'événement (pas de raison de mettre à jour en pleine soirée, et ça évite qu'un joueur curieux tombe dessus).

### Mode développement

```bash
npm run dev:server   # backend avec rechargement automatique (port 3000)
npm run dev:client   # frontend Vite avec proxy vers le backend (port 5173)
```

## 🧪 Tester sans laptop, depuis un iPad (GitHub Codespaces)

Pas d'ordinateur sous la main pour configurer/tester en amont ? Utilise [GitHub Codespaces](https://github.com/features/codespaces), qui fait tourner tout le projet dans le cloud et te donne une URL accessible depuis Safari sur iPad :

1. Sur la page GitHub du repo (branche du projet) → bouton **"Code"** → onglet **"Codespaces"** → **"Create codespace"**.
2. **Réutilise toujours ce même Codespace** aux sessions suivantes (ne recrée pas un nouveau Codespace à chaque fois) : il se met juste en pause après inactivité, et tes données (joueurs, missions, cartes...) restent intactes quand tu le rouvres.
3. Dans le terminal intégré : `npm install && npm run build:client && npm start`.
4. Un pop-up "Open in Browser" apparaît pour les ports détectés — ouvre le port **3443**. Passe-le en visibilité **"Public"** (onglet "Ports" en bas) si plusieurs onglets/appareils doivent y accéder.
5. Avantage bonus : l'URL Codespaces est déjà en HTTPS de confiance (certificat GitHub), donc **le scan caméra fonctionne directement, sans installer de certificat**.

⚠️ Codespaces est uniquement pour la configuration et les tests en amont — le soir de l'événement, il faut repasser sur un vrai laptop en local (voir plus bas), pour ne pas dépendre d'internet sur place.

### Transférer la configuration du Codespace vers le laptop du soir J

Toute la configuration (joueurs, missions, cartes, dés, images, modèle de chèque) est stockée dans des fichiers non versionnés sur Git (exprès, car propres à chaque déploiement) : `server/data/casino.db` et le dossier `server/uploads/`. Avant l'événement, il faut les récupérer du Codespace et les mettre au même endroit sur le laptop :

1. Arrête le serveur dans le Codespace (Ctrl+C dans le terminal) pour figer la base.
2. Dans l'explorateur de fichiers du Codespace (panneau de gauche), clic droit sur `server/data/casino.db` → **Download**. Fais de même pour tout le contenu de `server/uploads/`.
3. Sur le laptop, après avoir fait `npm install` une première fois (ce qui crée les dossiers), copie ces fichiers téléchargés aux mêmes emplacements (`server/data/casino.db`, `server/uploads/cartes/...`, `server/uploads/cheques/...`) avant de lancer `npm start`.
4. Refais un tour rapide de chaque interface sur le laptop pour confirmer que tout est bien là (comptes joueurs, cartes, chèque...).

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
