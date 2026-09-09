import { Router } from 'express';
import db from '../db/connection.js';
import { creditOrDebit, getJoueur } from '../lib/transactions.js';
import { getConfig } from '../lib/config.js';
import { broadcastClassement } from '../realtime/socket.js';

export const croupierRouter = Router();

// Pas d'authentification pour cette interface (accès physique contrôlé le jour J).

croupierRouter.get('/joueur/:id', (req, res) => {
  const joueur = getJoueur(Number(req.params.id));
  if (!joueur) return res.status(404).json({ error: 'Joueur introuvable' });
  res.json(joueur);
});

croupierRouter.get('/boutons-rapides', (req, res) => {
  res.json({
    boutons: JSON.parse(getConfig('boutons_rapides_croupier', '[]')),
    limite: Number(getConfig('limite_retrait_croupier', 0))
  });
});

const debitTx = db.transaction((joueurId, montant, operateur) => {
  const joueur = getJoueur(joueurId);
  if (!joueur) throw new Error('Joueur introuvable');
  const limite = Number(getConfig('limite_retrait_croupier', 0));
  if (montant > limite) throw new Error(`Retrait supérieur à la limite autorisée (${limite})`);
  if (montant > joueur.solde_banque) throw new Error('Solde insuffisant');

  creditOrDebit(joueurId, -montant, { source: 'croupier', type: 'debit_jeu', operateur });
  db.prepare('UPDATE joueurs SET jetons_dus = jetons_dus + ? WHERE id = ?').run(montant, joueurId);
  return getJoueur(joueurId);
});

croupierRouter.post('/:id/debit', (req, res) => {
  try {
    const montant = Number(req.body.montant);
    if (!(montant > 0)) throw new Error('Montant invalide');
    const joueur = debitTx(Number(req.params.id), montant, req.body.operateur ?? null);
    broadcastClassement();
    res.json({ joueur });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Crédit : le joueur rend ses jetons. `montantRendu` = total de jetons rendus.
// Le gain/la perte nette (montantRendu - jetons_dus) bénéficie du Veinard si actif.
const creditTx = db.transaction((joueurId, montantRendu, operateur) => {
  const joueur = getJoueur(joueurId);
  if (!joueur) throw new Error('Joueur introuvable');

  const net = montantRendu - joueur.jetons_dus;
  let netAjuste = net;
  let veinardApplique = null;

  if (joueur.veinard_actif) {
    const bonusPct = Number(getConfig('veinard_bonus_pct', 0));
    const reductionPct = Number(getConfig('veinard_reduction_pct', 0));
    if (net >= 0) {
      const bonus = Math.round(net * (bonusPct / 100) * 100) / 100;
      netAjuste = net + bonus;
      veinardApplique = { type: 'bonus_gain', pct: bonusPct, valeur: bonus };
    } else {
      const reduction = Math.round(Math.abs(net) * (reductionPct / 100) * 100) / 100;
      netAjuste = net + reduction; // réduit la perte (net est négatif)
      veinardApplique = { type: 'reduction_perte', pct: reductionPct, valeur: reduction };
    }
    db.prepare('UPDATE joueurs SET veinard_actif = 0 WHERE id = ?').run(joueurId);
  }

  const montantCredite = Math.round((joueur.jetons_dus + netAjuste) * 100) / 100;

  creditOrDebit(joueurId, montantCredite, {
    source: 'croupier',
    type: 'credit_jeu',
    details: { montantRendu, jetonsDus: joueur.jetons_dus, net, veinardApplique },
    operateur,
    extraColumn: 'total_jeu'
  });
  db.prepare('UPDATE joueurs SET jetons_dus = 0 WHERE id = ?').run(joueurId);

  return { joueur: getJoueur(joueurId), veinardApplique, montantCredite };
});

croupierRouter.post('/:id/credit', (req, res) => {
  try {
    const montantRendu = Number(req.body.montantRendu);
    if (!(montantRendu >= 0)) throw new Error('Montant invalide');
    const result = creditTx(Number(req.params.id), montantRendu, req.body.operateur ?? null);
    broadcastClassement();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
