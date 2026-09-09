import db from '../db/connection.js';
import { creditOrDebit, getJoueur } from './transactions.js';
import { crediterMission } from './cards.js';

/**
 * Valide un item (mission, produit ou pénalité) pour un joueur — utilisé à
 * la fois par le scan QR (mission) et par la validation manuelle du
 * banquier (boutique ou mode secours), pour un comportement identique.
 */
export const validerItem = db.transaction((joueurId, itemId, source, operateur) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!item) throw new Error('Item introuvable');

  if (item.type === 'mission') {
    return crediterMission(joueurId, item.montant, source, operateur);
  }

  if (item.type === 'produit') {
    creditOrDebit(joueurId, item.montant, { source, type: 'achat', details: { itemId }, operateur });
    db.prepare('UPDATE joueurs SET total_achats = total_achats + ? WHERE id = ?').run(Math.abs(item.montant), joueurId);
  } else if (item.type === 'penalite') {
    creditOrDebit(joueurId, item.montant, { source, type: 'penalite', details: { itemId }, operateur });
    db.prepare('UPDATE joueurs SET nb_penalites = nb_penalites + 1 WHERE id = ?').run(joueurId);
  } else {
    throw new Error(`Type d'item non géré : ${item.type}`);
  }

  return { item, joueur: getJoueur(joueurId) };
});
