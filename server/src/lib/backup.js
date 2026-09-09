import fs from 'node:fs';
import path from 'node:path';
import db from '../db/connection.js';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

export function backupNow() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `casino-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
  db.backup(file)
    .then(() => console.log(`Sauvegarde de la base effectuée : ${file}`))
    .catch((err) => console.error('Échec de la sauvegarde automatique', err));
}

/** Démarre une sauvegarde automatique périodique (par défaut toutes les 5 minutes). */
export function startAutoBackup(intervalMinutes = 5) {
  backupNow();
  setInterval(backupNow, intervalMinutes * 60000);
}
