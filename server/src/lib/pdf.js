import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'node:fs';
import db from '../db/connection.js';
import { getConfig, setConfig } from './config.js';
import { createQrCodesForItem } from './qrcode.js';

const TEMPLATE_KEY = 'cheque_template';

export function getChequeTemplate() {
  const raw = getConfig(TEMPLATE_KEY);
  return raw ? JSON.parse(raw) : null;
}

/** placement: { imagePath, nom:{x,y,size}, montant:{x,y,size}, qr:{x,y,size} } — coordonnées fixes en points PDF, origine en bas à gauche. */
export function setChequeTemplate(placement) {
  setConfig(TEMPLATE_KEY, JSON.stringify(placement));
  return placement;
}

/** Génère un PDF regroupant `quantite` chèques uniques pour la mission `itemId`. */
export async function generateChequesPdf(itemId, quantite) {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!item) throw new Error('Mission/produit introuvable');

  const template = getChequeTemplate();
  if (!template || !template.imagePath || !fs.existsSync(template.imagePath)) {
    throw new Error("Aucun modèle de chèque configuré (image manquante). Configurez-le depuis l'éditeur.");
  }

  const hashes = createQrCodesForItem(itemId, quantite);

  const pdfDoc = await PDFDocument.create();
  const templateBytes = fs.readFileSync(template.imagePath);
  const isPng = template.imagePath.toLowerCase().endsWith('.png');
  const templateImage = isPng ? await pdfDoc.embedPng(templateBytes) : await pdfDoc.embedJpg(templateBytes);
  const font = await pdfDoc.embedFont('Helvetica-Bold');
  const codeFont = await pdfDoc.embedFont('Helvetica');

  for (const hash of hashes) {
    const page = pdfDoc.addPage([templateImage.width, templateImage.height]);
    page.drawImage(templateImage, { x: 0, y: 0, width: templateImage.width, height: templateImage.height });

    const qrDataUrl = await QRCode.toDataURL(hash, { margin: 0 });
    const qrBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrBytes);
    const qrSize = template.qr?.size ?? 100;
    const qrX = template.qr?.x ?? 20;
    const qrY = template.qr?.y ?? 20;
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    // Code lisible sous le QR : permet la saisie manuelle si le scan caméra
    // ne fonctionne pas (ex: Safari iOS hors HTTPS/localhost).
    const codeSize = 10;
    const codeWidth = codeFont.widthOfTextAtSize(hash, codeSize);
    page.drawText(hash, {
      x: qrX + qrSize / 2 - codeWidth / 2,
      y: qrY - codeSize - 4,
      size: codeSize,
      font: codeFont
    });

    page.drawText(item.nom, {
      x: template.nom?.x ?? 20,
      y: template.nom?.y ?? 200,
      size: template.nom?.size ?? 18,
      font
    });
    page.drawText(String(item.montant), {
      x: template.montant?.x ?? 20,
      y: template.montant?.y ?? 170,
      size: template.montant?.size ?? 18,
      font
    });
  }

  return Buffer.from(await pdfDoc.save());
}
