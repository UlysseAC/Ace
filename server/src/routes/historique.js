import { Router } from 'express';
import { requireRole } from '../lib/auth.js';
import { listAllTransactions } from '../lib/transactions.js';
import { listHistoriqueControlesFiscaux } from '../lib/dice.js';

export const historiqueRouter = Router();

historiqueRouter.get('/transactions', requireRole('editeur'), (req, res) => {
  res.json(listAllTransactions());
});

// Utilisé par l'écran d'affichage pour les 2 dernières actions de contrôle fiscal.
historiqueRouter.get('/controles-fiscaux', (req, res) => {
  const limit = Number(req.query.limit) || 2;
  res.json(listHistoriqueControlesFiscaux(limit));
});
