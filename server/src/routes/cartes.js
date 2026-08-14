import { Router } from 'express';
import db from '../db/connection.js';
import { requireRole } from '../lib/auth.js';
import { listCartesConfig } from '../lib/cards.js';
import { uploadCarteImage } from '../lib/uploads.js';
import { createQrCodesForCarte } from '../lib/qrcode.js';

export const cartesRouter = Router();

cartesRouter.get('/', (req, res) => {
  res.json(listCartesConfig());
});

cartesRouter.post('/', requireRole('editeur'), (req, res) => {
  const { code, nom, description, montant, phrase_ecran } = req.body;
  if (!code || !nom) return res.status(400).json({ error: 'code et nom requis' });
  try {
    db.prepare(
      'INSERT INTO cartes_config (code, nom, description, montant, phrase_ecran) VALUES (?, ?, ?, ?, ?)'
    ).run(code, nom, description ?? null, montant ?? null, phrase_ecran ?? null);
    res.status(201).json(db.prepare('SELECT * FROM cartes_config WHERE code = ?').get(code));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

cartesRouter.patch('/:code', requireRole('editeur'), (req, res) => {
  const fields = ['nom', 'description', 'montant', 'phrase_ecran', 'actif'];
  const updates = Object.entries(req.body).filter(([k]) => fields.includes(k));
  if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ valide à modifier' });
  const setSql = updates.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE cartes_config SET ${setSql} WHERE code = ?`).run(...updates.map(([, v]) => v), req.params.code);
  res.json(db.prepare('SELECT * FROM cartes_config WHERE code = ?').get(req.params.code));
});

cartesRouter.post('/:code/image', requireRole('editeur'), uploadCarteImage.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image manquante' });
  db.prepare('UPDATE cartes_config SET image_path = ? WHERE code = ?').run(req.file.path, req.params.code);
  res.json(db.prepare('SELECT * FROM cartes_config WHERE code = ?').get(req.params.code));
});

cartesRouter.post('/:code/qrcodes', requireRole('editeur'), (req, res) => {
  try {
    const quantite = Number(req.body.quantite);
    if (!(quantite > 0)) throw new Error('Quantité invalide');
    const hashes = createQrCodesForCarte(req.params.code, quantite);
    res.json({ hashes });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
