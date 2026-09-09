-- Casino RP — schéma de base de données
PRAGMA foreign_keys = ON;

-- Table 1 : comptes joueurs
CREATE TABLE IF NOT EXISTS joueurs (
  id INTEGER PRIMARY KEY,              -- numéro du joueur = login + identification croupier
  nom TEXT NOT NULL,
  code TEXT NOT NULL,                  -- code de connexion
  solde_banque REAL NOT NULL DEFAULT 0,
  total_missions REAL NOT NULL DEFAULT 0,
  total_jeu REAL NOT NULL DEFAULT 0,
  nb_penalites INTEGER NOT NULL DEFAULT 0,
  total_achats REAL NOT NULL DEFAULT 0,
  paradis_fiscal_actif INTEGER NOT NULL DEFAULT 0,
  paradis_fiscal_fin TEXT,             -- horodatage ISO de fin d'effet
  veinard_actif INTEGER NOT NULL DEFAULT 0,      -- consommé au prochain crédit croupier
  mere_theresa_actif INTEGER NOT NULL DEFAULT 0, -- consommé à la prochaine mission scannée
  jetons_dus REAL NOT NULL DEFAULT 0,            -- total débité (converti en jetons) pas encore rendu au croupier
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Table 2 : missions / produits / pénalités (structure commune)
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('mission','produit','penalite')),
  nom TEXT NOT NULL,
  montant REAL NOT NULL,               -- positif ou négatif
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Configuration des 5 types de cartes (bonus, paradis_fiscal, veinard, mere_theresa, controle_fiscal, + futures)
CREATE TABLE IF NOT EXISTS cartes_config (
  code TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  image_path TEXT,
  montant REAL,                        -- utilisé par ex. pour "bonus" (crédit fixe)
  phrase_ecran TEXT,                   -- phrase affichée sur l'écran d'affichage à l'usage
  actif INTEGER NOT NULL DEFAULT 1
);

-- Table 3 : QR codes (chèques de mission / cartes physiques)
CREATE TABLE IF NOT EXISTS qrcodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash TEXT NOT NULL UNIQUE,
  cible_type TEXT NOT NULL CHECK (cible_type IN ('item','carte')),
  item_id INTEGER REFERENCES items(id),
  carte_code TEXT REFERENCES cartes_config(code),
  statut TEXT NOT NULL DEFAULT 'valide' CHECK (statut IN ('valide','utilise')),
  utilise_par INTEGER REFERENCES joueurs(id),
  utilise_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Deck : cartes possédées / activées par un joueur
CREATE TABLE IF NOT EXISTS deck (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  joueur_id INTEGER NOT NULL REFERENCES joueurs(id),
  carte_code TEXT NOT NULL REFERENCES cartes_config(code),
  statut TEXT NOT NULL DEFAULT 'en_main' CHECK (statut IN ('en_main','activee')),
  acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
  activated_at TEXT
);

-- Table 4 : configuration globale (clé/valeur, flexible)
CREATE TABLE IF NOT EXISTS config (
  cle TEXT PRIMARY KEY,
  valeur TEXT
);

-- Table 6 : dés et leurs 6 faces configurables
CREATE TABLE IF NOT EXISTS des (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS des_faces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  de_id INTEGER NOT NULL REFERENCES des(id),
  face_index INTEGER NOT NULL CHECK (face_index BETWEEN 1 AND 6),
  type TEXT NOT NULL CHECK (type IN ('rouge','vert','don')),
  pourcentage REAL NOT NULL,
  UNIQUE (de_id, face_index)
);

-- Table 5 : historique des contrôles fiscaux
CREATE TABLE IF NOT EXISTS historique_controles_fiscaux (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attaquant_id INTEGER NOT NULL REFERENCES joueurs(id),
  vise_id INTEGER NOT NULL REFERENCES joueurs(id),
  de_id INTEGER NOT NULL REFERENCES des(id),
  face_type TEXT NOT NULL,
  face_pourcentage REAL NOT NULL,
  montant_reel REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Historique complet des transactions croupier / banquier (audit + secours CSV)
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  joueur_id INTEGER NOT NULL REFERENCES joueurs(id),
  source TEXT NOT NULL CHECK (source IN ('croupier','banquier','systeme')),
  type TEXT NOT NULL,                  -- debit_jeu, credit_jeu, achat, penalite, mission, carte, controle_fiscal...
  montant REAL NOT NULL,               -- delta appliqué au solde (positif ou négatif)
  details TEXT,                        -- JSON libre (item, carte, veinard appliqué, opérateur...)
  operateur TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Comptes éditeur (accès protégé par identifiant + code)
CREATE TABLE IF NOT EXISTS editeurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifiant TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_joueur ON transactions(joueur_id);
CREATE INDEX IF NOT EXISTS idx_deck_joueur ON deck(joueur_id);
CREATE INDEX IF NOT EXISTS idx_qrcodes_hash ON qrcodes(hash);
