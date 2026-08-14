import db from '../db/connection.js';

// Toutes les écritures d'argent passent par ici : mise à jour du solde +
// écriture dans la table d'audit, dans une transaction SQLite atomique.
// better-sqlite3 est synchrone et Node est mono-thread : tant qu'aucun
// `await` n'a lieu à l'intérieur d'un `db.transaction()`, deux requêtes
// concurrentes (ex: deux croupiers sur le même joueur) ne peuvent jamais
// s'entrelacer — ça élimine les races sur le solde par construction.

export function getJoueur(id) {
  return db.prepare('SELECT * FROM joueurs WHERE id = ?').get(id);
}

const applyDelta = db.transaction((joueurId, montant, extraSql, extraParams, entry) => {
  const joueur = db.prepare('SELECT * FROM joueurs WHERE id = ?').get(joueurId);
  if (!joueur) throw new Error(`Joueur ${joueurId} introuvable`);

  db.prepare(`UPDATE joueurs SET solde_banque = solde_banque + ? ${extraSql} WHERE id = ?`)
    .run(montant, ...extraParams, joueurId);

  db.prepare(
    `INSERT INTO transactions (joueur_id, source, type, montant, details, operateur)
     VALUES (@joueur_id, @source, @type, @montant, @details, @operateur)`
  ).run({
    joueur_id: joueurId,
    source: entry.source,
    type: entry.type,
    montant,
    details: entry.details ? JSON.stringify(entry.details) : null,
    operateur: entry.operateur ?? null
  });

  return db.prepare('SELECT * FROM joueurs WHERE id = ?').get(joueurId);
});

/** Mouvement générique du solde, avec mise à jour optionnelle d'une colonne annexe (total_missions, total_jeu, ...). */
export function creditOrDebit(joueurId, montant, { source, type, details, operateur, extraColumn } = {}) {
  let extraSql = '';
  let extraParams = [];
  if (extraColumn) {
    extraSql = `, ${extraColumn} = ${extraColumn} + ?`;
    extraParams = [montant];
  }
  return applyDelta(joueurId, montant, extraSql, extraParams, { source, type, details, operateur });
}

export function listTransactions(joueurId) {
  return db.prepare('SELECT * FROM transactions WHERE joueur_id = ? ORDER BY created_at DESC').all(joueurId);
}

export function listAllTransactions() {
  return db.prepare('SELECT * FROM transactions ORDER BY created_at DESC').all();
}
