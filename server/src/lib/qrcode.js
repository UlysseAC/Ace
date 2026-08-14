import crypto from 'node:crypto';
import db from '../db/connection.js';

function generateHash() {
  return crypto.randomUUID();
}

/** Génère `quantite` QR codes uniques pointant vers une mission/produit/pénalité. */
export function createQrCodesForItem(itemId, quantite) {
  const insert = db.prepare(
    `INSERT INTO qrcodes (hash, cible_type, item_id) VALUES (?, 'item', ?)`
  );
  const tx = db.transaction((n) => {
    const hashes = [];
    for (let i = 0; i < n; i++) {
      const hash = generateHash();
      insert.run(hash, itemId);
      hashes.push(hash);
    }
    return hashes;
  });
  return tx(quantite);
}

/** Génère `quantite` QR codes uniques pointant vers une carte physique. */
export function createQrCodesForCarte(carteCode, quantite) {
  const insert = db.prepare(
    `INSERT INTO qrcodes (hash, cible_type, carte_code) VALUES (?, 'carte', ?)`
  );
  const tx = db.transaction((n) => {
    const hashes = [];
    for (let i = 0; i < n; i++) {
      const hash = generateHash();
      insert.run(hash, carteCode);
      hashes.push(hash);
    }
    return hashes;
  });
  return tx(quantite);
}

/**
 * Verrouillage transactionnel anti double-scan : le UPDATE conditionnel
 * (WHERE statut = 'valide') est atomique — si deux scans arrivent en même
 * temps, un seul obtient `changes === 1`, l'autre est rejeté.
 */
export function consumeQrCode(hash, joueurId) {
  const result = db.prepare(
    `UPDATE qrcodes SET statut = 'utilise', utilise_par = ?, utilise_at = datetime('now')
     WHERE hash = ? AND statut = 'valide'`
  ).run(joueurId, hash);

  if (result.changes === 0) {
    const existing = db.prepare('SELECT * FROM qrcodes WHERE hash = ?').get(hash);
    if (!existing) throw new Error('QR code inconnu');
    throw new Error('QR code déjà utilisé');
  }

  const qr = db.prepare('SELECT * FROM qrcodes WHERE hash = ?').get(hash);
  if (qr.cible_type === 'item') {
    qr.item = db.prepare('SELECT * FROM items WHERE id = ?').get(qr.item_id);
  } else {
    qr.carte = db.prepare('SELECT * FROM cartes_config WHERE code = ?').get(qr.carte_code);
  }
  return qr;
}

export function countQrCodesForItem(itemId) {
  return db.prepare(
    `SELECT
       SUM(CASE WHEN statut = 'valide' THEN 1 ELSE 0 END) AS valides,
       SUM(CASE WHEN statut = 'utilise' THEN 1 ELSE 0 END) AS utilises
     FROM qrcodes WHERE item_id = ?`
  ).get(itemId);
}
