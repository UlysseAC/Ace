import { Server } from 'socket.io';
import db from '../db/connection.js';
import { getConfig } from '../lib/config.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    socket.emit('classement', buildClassement());
  });
  return io;
}

export function getIO() {
  return io;
}

function buildClassement() {
  db.prepare(
    `UPDATE joueurs SET paradis_fiscal_actif = 0
     WHERE paradis_fiscal_actif = 1 AND paradis_fiscal_fin IS NOT NULL AND paradis_fiscal_fin <= datetime('now')`
  ).run();
  const nbAffiches = Number(getConfig('nb_joueurs_affiches', 10));
  const classement = db.prepare(
    `SELECT id, nom, solde_banque FROM joueurs WHERE paradis_fiscal_actif = 0 ORDER BY solde_banque DESC, id ASC LIMIT ?`
  ).all(nbAffiches);
  const habitantsParadis = db.prepare('SELECT COUNT(*) AS n FROM joueurs WHERE paradis_fiscal_actif = 1').get().n;
  return { classement, habitantsParadis };
}

/** À appeler après tout mouvement d'argent pour rafraîchir le classement en direct. */
export function broadcastClassement() {
  if (!io) return;
  io.emit('classement', buildClassement());
}

/** À appeler après un tirage de contrôle fiscal pour déclencher l'animation sur l'écran d'affichage. */
export function broadcastControleFiscal(payload) {
  if (!io) return;
  io.emit('controle-fiscal', payload);
  broadcastClassement();
}
