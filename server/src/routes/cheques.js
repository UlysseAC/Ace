import { Router } from 'express';
import { requireRole } from '../lib/auth.js';
import { uploadChequeTemplate } from '../lib/uploads.js';
import { getChequeTemplate, setChequeTemplate, generateChequesPdf } from '../lib/pdf.js';

export const chequesRouter = Router();

chequesRouter.get('/template', requireRole('editeur'), (req, res) => {
  res.json(getChequeTemplate());
});

// multipart/form-data: image + nomX, nomY, nomSize, montantX, montantY, montantSize, qrX, qrY, qrSize
chequesRouter.post('/template', requireRole('editeur'), uploadChequeTemplate.single('image'), (req, res) => {
  try {
    const b = req.body;
    const existing = getChequeTemplate();
    const placement = {
      imagePath: req.file ? req.file.path : existing?.imagePath,
      nom: { x: Number(b.nomX), y: Number(b.nomY), size: Number(b.nomSize) || 18 },
      montant: { x: Number(b.montantX), y: Number(b.montantY), size: Number(b.montantSize) || 18 },
      qr: { x: Number(b.qrX), y: Number(b.qrY), size: Number(b.qrSize) || 100 }
    };
    if (!placement.imagePath) throw new Error("Aucune image de modèle de chèque n'est encore définie");
    res.json(setChequeTemplate(placement));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

chequesRouter.post('/generer', requireRole('editeur'), async (req, res) => {
  try {
    const { itemId, quantite } = req.body;
    const pdfBuffer = await generateChequesPdf(Number(itemId), Number(quantite));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cheques-${itemId}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
