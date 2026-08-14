import { Router } from 'express';
import { loginJoueur, loginEditeur, checkAdminExitCode, logout, updateEditeurCredentials, requireRole } from '../lib/auth.js';

export const authRouter = Router();

authRouter.post('/joueur/login', (req, res) => {
  const { id, code } = req.body;
  const result = loginJoueur(Number(id), code);
  if (!result) return res.status(401).json({ error: 'Identifiant ou code incorrect' });
  res.json(result);
});

authRouter.post('/editeur/login', (req, res) => {
  const { identifiant, code } = req.body;
  const result = loginEditeur(identifiant, code);
  if (!result) return res.status(401).json({ error: 'Identifiant ou code incorrect' });
  res.json(result);
});

authRouter.post('/admin-exit', (req, res) => {
  res.json({ ok: checkAdminExitCode(req.body.code) });
});

authRouter.patch('/editeur/credentials', requireRole('editeur'), (req, res) => {
  const { currentCode, newIdentifiant, newCode } = req.body;
  const result = updateEditeurCredentials(req.session.id, currentCode, newIdentifiant, newCode);
  if (!result) return res.status(401).json({ error: 'Code actuel incorrect' });
  res.json(result);
});

authRouter.post('/logout', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) logout(token);
  res.json({ ok: true });
});
