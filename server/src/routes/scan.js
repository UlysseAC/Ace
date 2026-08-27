import { Router } from 'express';
import { requireRole } from '../lib/auth.js';
import { consumeQrCode } from '../lib/qrcode.js';
import { validerItem } from '../lib/boutique.js';
import { addCardToDeck, getDeck, activateCard, consumeControleFiscalCard } from '../lib/cards.js';
import { rollControleFiscal } from '../lib/dice.js';
import { broadcastClassement, broadcastControleFiscal } from '../realtime/socket.js';
import { getCarteConfig } from '../lib/cards.js';

export const scanRouter = Router();

scanRouter.post('/scan', requireRole('joueur'), (req, res) => {
  try {
    const { hash } = req.body;
    const qr = consumeQrCode(hash, req.session.id);

    if (qr.cible_type === 'item') {
      const result = validerItem(req.session.id, qr.item_id, 'systeme', 'scan-joueur');
      broadcastClassement();
      return res.json({ type: 'item', item: qr.item, result });
    }

    addCardToDeck(req.session.id, qr.carte_code);
    const carte = getCarteConfig(qr.carte_code);
    res.json({ type: 'carte', carte });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

scanRouter.get('/deck', requireRole('joueur'), (req, res) => {
  res.json(getDeck(req.session.id));
});

scanRouter.post('/deck/:deckId/activer', requireRole('joueur'), (req, res) => {
  try {
    const result = activateCard(req.session.id, Number(req.params.deckId), 'joueur');
    broadcastClassement();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

scanRouter.post('/deck/:deckId/controle-fiscal/tirer', requireRole('joueur'), (req, res) => {
  try {
    const { viseId, deId } = req.body;
    const result = rollControleFiscal(req.session.id, Number(viseId), Number(deId), 'joueur');
    consumeControleFiscalCard(req.session.id, Number(req.params.deckId));
    broadcastControleFiscal({
      attaquant: result.attaquant,
      vise: result.vise,
      face: result.face,
      de: result.de,
      montantReel: result.montantReel
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
