import { Router } from 'express';
import { requireRole } from '../lib/auth.js';
import { startUpdate, readUpdateLog, isUpdateInProgress } from '../lib/selfUpdate.js';

export const systemRouter = Router();

systemRouter.post('/update', requireRole('editeur'), (req, res) => {
  const result = startUpdate();
  res.json(result);
});

systemRouter.get('/update-log', requireRole('editeur'), (req, res) => {
  res.json({ log: readUpdateLog(), enCours: isUpdateInProgress() });
});
