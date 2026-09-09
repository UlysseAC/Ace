import { Router } from 'express';
import { requireRole } from '../lib/auth.js';
import { listDes, getDeAvecFaces, setFacesDe } from '../lib/dice.js';

export const desRouter = Router();

desRouter.get('/', (req, res) => {
  res.json(listDes());
});

desRouter.get('/:id', (req, res) => {
  const de = getDeAvecFaces(Number(req.params.id));
  if (!de) return res.status(404).json({ error: 'Dé introuvable' });
  res.json(de);
});

// body: { faces: [{ face_index, type, pourcentage }, ...] } (jusqu'à 6 faces)
desRouter.patch('/:id/faces', requireRole('editeur'), (req, res) => {
  try {
    const faces = req.body.faces;
    if (!Array.isArray(faces) || faces.length === 0) throw new Error('Faces manquantes');
    for (const f of faces) {
      if (!['rouge', 'vert', 'don'].includes(f.type)) throw new Error(`Type de face invalide : ${f.type}`);
    }
    res.json(setFacesDe(Number(req.params.id), faces));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
