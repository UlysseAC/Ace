import db from '../db/connection.js';

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Export de secours : un joueur par ligne, ouvrable dans LibreOffice Calc en cas de panne serveur totale. */
export function exportJoueursCsv() {
  const joueurs = db.prepare('SELECT * FROM joueurs ORDER BY id').all();
  const headers = [
    'id', 'nom', 'solde_banque', 'total_missions', 'total_jeu',
    'nb_penalites', 'total_achats', 'paradis_fiscal_actif', 'paradis_fiscal_fin'
  ];
  const lines = [headers.join(';')];
  for (const j of joueurs) {
    lines.push(headers.map((h) => csvEscape(j[h])).join(';'));
  }
  return lines.join('\n');
}
