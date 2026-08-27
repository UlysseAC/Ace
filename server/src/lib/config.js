import db from '../db/connection.js';

export function getConfig(cle, fallback = null) {
  const row = db.prepare('SELECT valeur FROM config WHERE cle = ?').get(cle);
  return row ? row.valeur : fallback;
}

export function getAllConfig() {
  const rows = db.prepare('SELECT cle, valeur FROM config').all();
  return Object.fromEntries(rows.map((r) => [r.cle, r.valeur]));
}

export function setConfig(cle, valeur) {
  db.prepare(
    `INSERT INTO config (cle, valeur) VALUES (?, ?)
     ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur`
  ).run(cle, String(valeur));
}

export function setConfigMany(entries) {
  const tx = db.transaction((obj) => {
    for (const [cle, valeur] of Object.entries(obj)) setConfig(cle, valeur);
  });
  tx(entries);
}
