import { Router } from 'express';
import db from '../db/connection.js';
import { getJoueur } from '../lib/transactions.js';
import { validerItem } from '../lib/boutique.js';
import { getConfig, setConfig } from '../lib/config.js';
import { exportJoueursCsv } from '../lib/csvExport.js';
import { broadcastClassement } from '../realtime/socket.js';

export const banquierRouter = Router();

// Pas d'authentification pour cette interface (accès physique contrôlé le jour J).

banquierRouter.get('/joueur/:id', (req, res) => {
  const joueur = getJoueur(Number(req.params.id));
  if (!joueur) return res.status(404).json({ error: 'Joueur introuvable' });
  res.json(joueur);
});

banquierRouter.get('/items', (req, res) => {
  const items = db.prepare('SELECT * FROM items WHERE actif = 1 ORDER BY type, nom').all();
  res.json(items);
});

banquierRouter.post('/:joueurId/valider', (req, res) => {
  try {
    const { itemId, manuel } = req.body;
    const result = validerItem(
      Number(req.params.joueurId),
      Number(itemId),
      'banquier',
      manuel ? 'banquier-mode-local' : 'banquier'
    );
    broadcastClassement();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

banquierRouter.get('/mode-local', (req, res) => {
  res.json({ actif: getConfig('mode_local', '0') === '1' });
});

banquierRouter.post('/mode-local', (req, res) => {
  setConfig('mode_local', req.body.actif ? '1' : '0');
  res.json({ actif: req.body.actif ? true : false });
});

banquierRouter.get('/export.csv', (req, res) => {
  const csv = exportJoueursCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="export-joueurs-${Date.now()}.csv"`);
  res.send('﻿' + csv); // BOM pour un import propre dans LibreOffice/Excel
});
