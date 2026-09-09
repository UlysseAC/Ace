import { Router } from 'express';
import db from '../db/connection.js';
import { requireRole } from '../lib/auth.js';
import { countQrCodesForItem } from '../lib/qrcode.js';

export const itemsRouter = Router();

itemsRouter.get('/', (req, res) => {
  const { type } = req.query;
  const rows = type
    ? db.prepare('SELECT * FROM items WHERE type = ? AND actif = 1 ORDER BY nom').all(type)
    : db.prepare('SELECT * FROM items WHERE actif = 1 ORDER BY type, nom').all();
  res.json(rows);
});

itemsRouter.get('/:id/qrcodes', requireRole('editeur'), (req, res) => {
  res.json(countQrCodesForItem(Number(req.params.id)));
});

itemsRouter.post('/', requireRole('editeur'), (req, res) => {
  const { type, nom, montant } = req.body;
  if (!['mission', 'produit', 'penalite'].includes(type)) {
    return res.status(400).json({ error: 'Type invalide' });
  }
  const { lastInsertRowid } = db.prepare('INSERT INTO items (type, nom, montant) VALUES (?, ?, ?)').run(type, nom, montant);
  res.status(201).json(db.prepare('SELECT * FROM items WHERE id = ?').get(lastInsertRowid));
});

itemsRouter.patch('/:id', requireRole('editeur'), (req, res) => {
  const fields = ['nom', 'montant', 'actif'];
  const updates = Object.entries(req.body).filter(([k]) => fields.includes(k));
  if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ valide à modifier' });
  const setSql = updates.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE items SET ${setSql} WHERE id = ?`).run(...updates.map(([, v]) => v), Number(req.params.id));
  res.json(db.prepare('SELECT * FROM items WHERE id = ?').get(Number(req.params.id)));
});

itemsRouter.delete('/:id', requireRole('editeur'), (req, res) => {
  db.prepare('UPDATE items SET actif = 0 WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});
