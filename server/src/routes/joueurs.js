import { Router } from 'express';
import db from '../db/connection.js';
import { getJoueur, listTransactions } from '../lib/transactions.js';
import { listHistoriqueJoueur } from '../lib/dice.js';
import { getDeck } from '../lib/cards.js';
import { getConfig } from '../lib/config.js';
import { requireRole } from '../lib/auth.js';

export const joueursRouter = Router();

function expireParadisFiscal() {
  db.prepare(
    `UPDATE joueurs SET paradis_fiscal_actif = 0
     WHERE paradis_fiscal_actif = 1 AND paradis_fiscal_fin IS NOT NULL AND paradis_fiscal_fin <= datetime('now')`
  ).run();
}

// --- Classement public (écran d'affichage) ---
joueursRouter.get('/classement', (req, res) => {
  expireParadisFiscal();
  const nbAffiches = Number(getConfig('nb_joueurs_affiches', 10));
  const visibles = db.prepare(
    `SELECT id, nom, solde_banque FROM joueurs
     WHERE paradis_fiscal_actif = 0
     ORDER BY solde_banque DESC, id ASC
     LIMIT ?`
  ).all(nbAffiches);
  const habitantsParadis = db.prepare('SELECT COUNT(*) AS n FROM joueurs WHERE paradis_fiscal_actif = 1').get().n;
  res.json({ classement: visibles, habitantsParadis });
});

// Liste minimale publique (id + nom), utilisée pour choisir une cible en contrôle fiscal.
joueursRouter.get('/liste', (req, res) => {
  res.json(db.prepare('SELECT id, nom FROM joueurs ORDER BY id').all());
});

// --- Éditeur : gestion des comptes ---
joueursRouter.get('/', requireRole('editeur'), (req, res) => {
  res.json(db.prepare('SELECT * FROM joueurs ORDER BY id').all());
});

joueursRouter.post('/', requireRole('editeur'), (req, res) => {
  try {
    const { id, nom, code } = req.body;
    const soldeDepart = Number(getConfig('solde_depart', 0));
    if (id) {
      db.prepare('INSERT INTO joueurs (id, nom, code, solde_banque) VALUES (?, ?, ?, ?)').run(id, nom, code, soldeDepart);
    } else {
      db.prepare('INSERT INTO joueurs (nom, code, solde_banque) VALUES (?, ?, ?)').run(nom, code, soldeDepart);
    }
    res.status(201).json(getJoueur(id ?? db.prepare('SELECT last_insert_rowid() AS id').get().id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

joueursRouter.patch('/:id', requireRole('editeur'), (req, res) => {
  const fields = ['nom', 'code', 'solde_banque', 'total_missions', 'total_jeu', 'nb_penalites', 'total_achats'];
  const updates = Object.entries(req.body).filter(([k]) => fields.includes(k));
  if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ valide à modifier' });
  const setSql = updates.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE joueurs SET ${setSql} WHERE id = ?`).run(...updates.map(([, v]) => v), Number(req.params.id));
  res.json(getJoueur(Number(req.params.id)));
});

joueursRouter.delete('/:id', requireRole('editeur'), (req, res) => {
  db.prepare('DELETE FROM joueurs WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// --- Joueur : son propre profil ---
joueursRouter.get('/me', requireRole('joueur'), (req, res) => {
  res.json(getJoueur(req.session.id));
});

joueursRouter.get('/me/deck', requireRole('joueur'), (req, res) => {
  res.json(getDeck(req.session.id));
});

joueursRouter.get('/me/historique', requireRole('joueur'), (req, res) => {
  res.json({
    transactions: listTransactions(req.session.id),
    controlesFiscaux: listHistoriqueJoueur(req.session.id)
  });
});
