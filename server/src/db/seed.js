import db from './connection.js';

function countOf(table) {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
}

const defaultConfig = {
  nb_joueurs_affiches: '10',
  duree_paradis_fiscal_minutes: '15',
  limite_retrait_croupier: '500',
  boutons_rapides_croupier: JSON.stringify([10, 20, 50, 100]),
  mode_local: '0',
  phrase_habitants_paradis: "Nombre d'habitants d'un paradis fiscal : {n}",
  veinard_bonus_pct: '5',
  veinard_reduction_pct: '50',
  code_admin_sortie: '0000',
  solde_depart: '1000',
  regles_du_jeu: 'Les règles du jeu seront affichées ici. Modifiable depuis l\'interface éditeur.'
};

const defaultCartes = [
  {
    code: 'bonus',
    nom: 'Bonus',
    description: 'Crédit fixe immédiat sur le compte du joueur.',
    montant: 50,
    phrase_ecran: 'Le joueur {joueur} active Bonus et reçoit {montant} !'
  },
  {
    code: 'paradis_fiscal',
    nom: 'Paradis fiscal',
    description: 'Le joueur devient temporairement invisible du classement public.',
    montant: null,
    phrase_ecran: 'Le joueur {joueur} entre en Paradis fiscal !'
  },
  {
    code: 'veinard',
    nom: 'Le Veinard',
    description: "Augmente les gains et réduit les pertes lors du prochain retrait/crédit au jeu.",
    montant: null,
    phrase_ecran: 'Le joueur {joueur} active Le Veinard !'
  },
  {
    code: 'mere_theresa',
    nom: 'Mère Thérésa',
    description: "À la prochaine mission scannée, le joueur reçoit sa mission +50% de bonus, et les deux joueurs les plus pauvres reçoivent chacun un montant équivalent à la mission.",
    montant: null,
    phrase_ecran: 'Le joueur {joueur} active Mère Thérésa !'
  },
  {
    code: 'controle_fiscal',
    nom: 'Contrôle fiscal',
    description: 'Le joueur vise un autre joueur et lance un dé configuré.',
    montant: null,
    phrase_ecran: 'Le joueur {attaquant} utilise Contrôle fiscal avec le dé {de} sur le joueur {vise}'
  }
];

const defaultDiceFaces = [
  ['rouge', 10], ['rouge', 10], ['vert', 10], ['vert', 10], ['don', 10], ['don', 10]
];

export function seed() {
  const insertConfig = db.prepare('INSERT OR IGNORE INTO config (cle, valeur) VALUES (?, ?)');
  const seedConfig = db.transaction(() => {
    for (const [cle, valeur] of Object.entries(defaultConfig)) insertConfig.run(cle, valeur);
  });
  seedConfig();

  if (countOf('cartes_config') === 0) {
    const insertCarte = db.prepare(
      'INSERT INTO cartes_config (code, nom, description, montant, phrase_ecran) VALUES (@code, @nom, @description, @montant, @phrase_ecran)'
    );
    const seedCartes = db.transaction(() => {
      for (const c of defaultCartes) insertCarte.run(c);
    });
    seedCartes();
  }

  if (countOf('des') === 0) {
    const insertDe = db.prepare('INSERT INTO des (nom) VALUES (?)');
    const insertFace = db.prepare(
      'INSERT INTO des_faces (de_id, face_index, type, pourcentage) VALUES (?, ?, ?, ?)'
    );
    const seedDice = db.transaction(() => {
      for (let i = 1; i <= 3; i++) {
        const { lastInsertRowid: deId } = insertDe.run(`Dé ${i}`);
        defaultDiceFaces.forEach(([type, pct], idx) => {
          insertFace.run(deId, idx + 1, type, pct);
        });
      }
    });
    seedDice();
  }

  if (countOf('editeurs') === 0) {
    db.prepare('INSERT INTO editeurs (identifiant, code) VALUES (?, ?)').run('admin', 'admin');
  }
}

seed();
console.log('Base de données initialisée et pré-remplie avec les valeurs par défaut.');
