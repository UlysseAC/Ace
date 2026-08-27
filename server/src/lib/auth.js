import crypto from 'node:crypto';
import db from '../db/connection.js';
import { getConfig } from './config.js';

// Sessions en mémoire : suffisant pour un déploiement local, un soir donné.
const sessions = new Map(); // token -> { role: 'joueur'|'editeur', id }

function issueToken(role, id) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { role, id });
  return token;
}

export function loginJoueur(id, code) {
  const joueur = db.prepare('SELECT * FROM joueurs WHERE id = ?').get(id);
  if (!joueur || joueur.code !== String(code)) return null;
  const token = issueToken('joueur', joueur.id);
  return { token, joueur };
}

export function loginEditeur(identifiant, code) {
  const editeur = db.prepare('SELECT * FROM editeurs WHERE identifiant = ?').get(identifiant);
  if (!editeur || editeur.code !== String(code)) return null;
  const token = issueToken('editeur', editeur.id);
  return { token, editeur };
}

export function checkAdminExitCode(code) {
  return getConfig('code_admin_sortie') === String(code);
}

export function updateEditeurCredentials(editeurId, currentCode, newIdentifiant, newCode) {
  const editeur = db.prepare('SELECT * FROM editeurs WHERE id = ?').get(editeurId);
  if (!editeur || editeur.code !== String(currentCode)) return null;
  db.prepare('UPDATE editeurs SET identifiant = ?, code = ? WHERE id = ?').run(
    newIdentifiant || editeur.identifiant,
    newCode || editeur.code,
    editeurId
  );
  return db.prepare('SELECT id, identifiant FROM editeurs WHERE id = ?').get(editeurId);
}

export function getSession(token) {
  return sessions.get(token) || null;
}

export function logout(token) {
  sessions.delete(token);
}

export function requireRole(role) {
  return (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const session = token ? getSession(token) : null;
    if (!session || session.role !== role) {
      return res.status(401).json({ error: 'Authentification requise' });
    }
    req.session = session;
    next();
  };
}
