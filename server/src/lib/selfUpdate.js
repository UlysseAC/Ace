import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, '..', '..', 'scripts', 'update.sh');
const LOG_PATH = path.join(__dirname, '..', '..', 'data', 'update.log');

function ensureDataDir() {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function isUpdateInProgress() {
  if (!fs.existsSync(LOG_PATH)) return false;
  const content = fs.readFileSync(LOG_PATH, 'utf8');
  return !/UPDATE_DONE|UPDATE_FAILED/.test(content);
}

export function readUpdateLog() {
  if (!fs.existsSync(LOG_PATH)) return '';
  return fs.readFileSync(LOG_PATH, 'utf8');
}

/**
 * Lance git pull + npm install + build du frontend dans un process détaché
 * (survit au redémarrage du serveur par node --watch une fois que git pull
 * a modifié des fichiers backend). Le résultat est suivi via le fichier log.
 */
export function startUpdate() {
  if (isUpdateInProgress()) return { alreadyRunning: true };
  ensureDataDir();
  fs.writeFileSync(LOG_PATH, ''); // reset du log précédent
  const logFd = fs.openSync(LOG_PATH, 'a');

  const child = spawn('bash', [SCRIPT_PATH], {
    detached: true,
    stdio: ['ignore', logFd, logFd]
  });
  child.unref();
  fs.closeSync(logFd);

  return { alreadyRunning: false };
}
