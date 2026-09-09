import db from '../db/connection.js';
import { creditOrDebit, getJoueur } from './transactions.js';
import { getConfig } from './config.js';

export function listCartesConfig() {
  return db.prepare('SELECT * FROM cartes_config ORDER BY nom').all();
}

export function getCarteConfig(code) {
  return db.prepare('SELECT * FROM cartes_config WHERE code = ?').get(code);
}

export function getDeck(joueurId) {
  return db.prepare(
    `SELECT deck.*, cartes_config.nom, cartes_config.description, cartes_config.image_path
     FROM deck JOIN cartes_config ON cartes_config.code = deck.carte_code
     WHERE deck.joueur_id = ? AND deck.statut = 'en_main'
     ORDER BY deck.acquired_at`
  ).all(joueurId);
}

export function addCardToDeck(joueurId, carteCode) {
  return db.prepare('INSERT INTO deck (joueur_id, carte_code) VALUES (?, ?)').run(joueurId, carteCode);
}

function consumeDeckEntry(deckId) {
  db.prepare(`UPDATE deck SET statut = 'activee', activated_at = datetime('now') WHERE id = ?`).run(deckId);
}

function fillPhrase(template, vars) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] ?? `{${key}}`));
}

/**
 * Active une carte simple (bonus, paradis_fiscal, veinard, mere_theresa).
 * "controle_fiscal" ne passe pas par ici : elle nécessite un choix de
 * joueur visé + dé, géré par la route dédiée qui appelle rollControleFiscal.
 */
export const activateCard = db.transaction((joueurId, deckId, operateur) => {
  const deckEntry = db.prepare('SELECT * FROM deck WHERE id = ? AND joueur_id = ?').get(deckId, joueurId);
  if (!deckEntry || deckEntry.statut !== 'en_main') throw new Error('Carte indisponible');
  const carte = getCarteConfig(deckEntry.carte_code);
  if (!carte) throw new Error('Carte inconnue');

  const joueur = getJoueur(joueurId);
  let phrase = '';

  switch (carte.code) {
    case 'bonus': {
      const montant = carte.montant ?? 0;
      creditOrDebit(joueurId, montant, { source: 'systeme', type: 'carte_bonus', operateur });
      phrase = fillPhrase(carte.phrase_ecran, { joueur: joueur.nom, montant });
      consumeDeckEntry(deckId);
      break;
    }
    case 'paradis_fiscal': {
      const dureeMin = Number(getConfig('duree_paradis_fiscal_minutes', 15));
      const fin = new Date(Date.now() + dureeMin * 60000).toISOString();
      db.prepare('UPDATE joueurs SET paradis_fiscal_actif = 1, paradis_fiscal_fin = ? WHERE id = ?').run(fin, joueurId);
      phrase = fillPhrase(carte.phrase_ecran, { joueur: joueur.nom });
      consumeDeckEntry(deckId);
      break;
    }
    case 'veinard': {
      db.prepare('UPDATE joueurs SET veinard_actif = 1 WHERE id = ?').run(joueurId);
      phrase = fillPhrase(carte.phrase_ecran, { joueur: joueur.nom });
      consumeDeckEntry(deckId);
      break;
    }
    case 'mere_theresa': {
      db.prepare('UPDATE joueurs SET mere_theresa_actif = 1 WHERE id = ?').run(joueurId);
      phrase = fillPhrase(carte.phrase_ecran, { joueur: joueur.nom });
      consumeDeckEntry(deckId);
      break;
    }
    case 'controle_fiscal': {
      // Ne consomme rien ici : le front doit ensuite appeler l'endpoint de tirage.
      return { carte, requiresRoll: true };
    }
    default:
      throw new Error(`Carte non gérée : ${carte.code}`);
  }

  return { carte, phrase, joueur: getJoueur(joueurId) };
});

/** Consomme la carte contrôle fiscal du deck (appelé juste après le tirage du dé). */
export function consumeControleFiscalCard(joueurId, deckId) {
  const deckEntry = db.prepare('SELECT * FROM deck WHERE id = ? AND joueur_id = ?').get(deckId, joueurId);
  if (!deckEntry || deckEntry.statut !== 'en_main') throw new Error('Carte indisponible');
  consumeDeckEntry(deckId);
}

/**
 * Applique le crédit d'une mission scannée par un joueur, en tenant compte
 * du bonus Mère Thérésa en attente le cas échéant.
 * Retourne { montantOfficiel, montantRecu, mereTheresa } pour affichage.
 */
export const crediterMission = db.transaction((joueurId, montantMission, source, operateur) => {
  const joueur = getJoueur(joueurId);
  let montantRecu = montantMission;
  let mereTheresa = null;

  if (joueur.mere_theresa_actif) {
    const bonus = Math.round(montantMission * 0.5 * 100) / 100;
    montantRecu = montantMission + bonus;

    // Les deux joueurs les plus pauvres (hors activateur) reçoivent un montant
    // équivalent à la mission.
    const autres = db.prepare('SELECT id, solde_banque FROM joueurs WHERE id != ?').all(joueurId);
    const pauvres = autres.sort((a, b) => a.solde_banque - b.solde_banque).slice(0, 2);
    for (const p of pauvres) {
      creditOrDebit(p.id, montantMission, {
        source: 'systeme',
        type: 'mere_theresa_don',
        details: { depuis: joueurId },
        operateur
      });
    }

    db.prepare('UPDATE joueurs SET mere_theresa_actif = 0 WHERE id = ?').run(joueurId);
    mereTheresa = { bonus, beneficiaires: pauvres.map((p) => p.id) };
  }

  creditOrDebit(joueurId, montantRecu, {
    source,
    type: 'mission',
    details: { montantOfficiel: montantMission, mereTheresa },
    operateur,
    extraColumn: 'total_missions'
  });

  return { montantOfficiel: montantMission, montantRecu, mereTheresa, joueur: getJoueur(joueurId) };
});
