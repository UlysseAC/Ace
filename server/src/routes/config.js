import { Router } from 'express';
import { requireRole } from '../lib/auth.js';
import { getAllConfig, setConfigMany } from '../lib/config.js';

export const configRouter = Router();

// Lecture publique : les interfaces croupier/banquier/affichage/joueur en ont besoin sans être éditeur.
configRouter.get('/', (req, res) => {
  const config = getAllConfig();
  delete config.code_admin_sortie; // ne jamais exposer le code de sortie en clair
  res.json(config);
});

configRouter.patch('/', requireRole('editeur'), (req, res) => {
  setConfigMany(req.body);
  res.json(getAllConfig());
});
