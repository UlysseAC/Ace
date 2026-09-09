import db from '../db/connection.js';
import { creditOrDebit, getJoueur } from './transactions.js';

export function listDes() {
  const des = db.prepare('SELECT * FROM des').all();
  return des.map((d) => ({
    ...d,
    faces: db.prepare('SELECT * FROM des_faces WHERE de_id = ? ORDER BY face_index').all(d.id)
  }));
}

export function getDeAvecFaces(deId) {
  const de = db.prepare('SELECT * FROM des WHERE id = ?').get(deId);
  if (!de) return null;
  de.faces = db.prepare('SELECT * FROM des_faces WHERE de_id = ? ORDER BY face_index').all(deId);
  return de;
}

export function setFacesDe(deId, faces) {
  const upsert = db.prepare(
    `INSERT INTO des_faces (de_id, face_index, type, pourcentage) VALUES (@de_id, @face_index, @type, @pourcentage)
     ON CONFLICT(de_id, face_index) DO UPDATE SET type = excluded.type, pourcentage = excluded.pourcentage`
  );
  const tx = db.transaction((rows) => {
    for (const f of rows) upsert.run({ de_id: deId, face_index: f.face_index, type: f.type, pourcentage: f.pourcentage });
  });
  tx(faces);
  return getDeAvecFaces(deId);
}

function pct(montant, pourcentage) {
  return Math.round(montant * (pourcentage / 100) * 100) / 100;
}

/**
 * Exécute un contrôle fiscal : tire une face au hasard sur le dé choisi et
 * applique l'effet correspondant. Tout se déroule dans une seule transaction
 * SQLite pour garantir la cohérence des soldes.
 */
export const rollControleFiscal = db.transaction((attaquantId, viseId, deId, operateur) => {
  const de = getDeAvecFaces(deId);
  if (!de) throw new Error('Dé introuvable');
  if (de.faces.length !== 6) throw new Error('Le dé doit avoir 6 faces configurées');

  const faceIndex = 1 + Math.floor(Math.random() * 6);
  const face = de.faces.find((f) => f.face_index === faceIndex);

  const attaquant = getJoueur(attaquantId);
  const vise = getJoueur(viseId);
  if (!attaquant || !vise) throw new Error('Joueur introuvable');

  let montantReel = 0;
  const details = { de_id: deId, de_nom: de.nom, face_index: faceIndex };

  if (face.type === 'rouge') {
    // L'attaquant perd le %, le visé encaisse.
    montantReel = pct(attaquant.solde_banque, face.pourcentage);
    creditOrDebit(attaquantId, -montantReel, { source: 'systeme', type: 'controle_fiscal_rouge', details, operateur });
    creditOrDebit(viseId, montantReel, { source: 'systeme', type: 'controle_fiscal_rouge', details, operateur });
  } else if (face.type === 'vert') {
    // Le visé perd le %, l'attaquant encaisse.
    montantReel = pct(vise.solde_banque, face.pourcentage);
    creditOrDebit(viseId, -montantReel, { source: 'systeme', type: 'controle_fiscal_vert', details, operateur });
    creditOrDebit(attaquantId, montantReel, { source: 'systeme', type: 'controle_fiscal_vert', details, operateur });
  } else if (face.type === 'don') {
    // Les deux perdent le %, la cagnotte va au(x) joueur(s) le(s) plus pauvre(s)
    // du classement général. Si l'attaquant ou le visé est déjà dernier, il est
    // exempté de la perte et reçoit directement la cagnotte.
    const tous = db.prepare('SELECT id, solde_banque FROM joueurs').all();
    const minSolde = Math.min(...tous.map((j) => j.solde_banque));
    const dernierIds = tous.filter((j) => j.solde_banque === minSolde).map((j) => j.id);

    const attaquantDernier = dernierIds.includes(attaquantId);
    const viseDernier = dernierIds.includes(viseId);

    const perteAttaquant = attaquantDernier ? 0 : pct(attaquant.solde_banque, face.pourcentage);
    const perteVise = viseDernier ? 0 : pct(vise.solde_banque, face.pourcentage);
    const pot = perteAttaquant + perteVise;
    montantReel = pot;

    let recipients;
    if (attaquantDernier || viseDernier) {
      recipients = [attaquantId, viseId].filter((id) => dernierIds.includes(id));
    } else {
      recipients = dernierIds;
    }

    if (perteAttaquant > 0) {
      creditOrDebit(attaquantId, -perteAttaquant, { source: 'systeme', type: 'controle_fiscal_don_perte', details, operateur });
    }
    if (perteVise > 0) {
      creditOrDebit(viseId, -perteVise, { source: 'systeme', type: 'controle_fiscal_don_perte', details, operateur });
    }
    if (pot > 0 && recipients.length > 0) {
      const part = Math.round((pot / recipients.length) * 100) / 100;
      for (const rid of recipients) {
        creditOrDebit(rid, part, { source: 'systeme', type: 'controle_fiscal_don_gain', details, operateur });
      }
    }
    details.recipients = recipients;
  }

  db.prepare(
    `INSERT INTO historique_controles_fiscaux (attaquant_id, vise_id, de_id, face_type, face_pourcentage, montant_reel)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(attaquantId, viseId, deId, face.type, face.pourcentage, montantReel);

  return {
    face,
    de: { id: de.id, nom: de.nom },
    montantReel,
    attaquant: getJoueur(attaquantId),
    vise: getJoueur(viseId)
  };
});

export function listHistoriqueControlesFiscaux(limit = 2) {
  return db.prepare('SELECT * FROM historique_controles_fiscaux ORDER BY created_at DESC LIMIT ?').all(limit);
}

export function listHistoriqueJoueur(joueurId) {
  return db.prepare(
    'SELECT * FROM historique_controles_fiscaux WHERE attaquant_id = ? OR vise_id = ? ORDER BY created_at DESC'
  ).all(joueurId, joueurId);
}
