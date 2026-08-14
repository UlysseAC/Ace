import express from 'express';
import cors from 'cors';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import './db/seed.js';

import { initSocket } from './realtime/socket.js';
import { ensureCert } from './lib/certs.js';
import { authRouter } from './routes/auth.js';
import { joueursRouter } from './routes/joueurs.js';
import { itemsRouter } from './routes/items.js';
import { cartesRouter } from './routes/cartes.js';
import { desRouter } from './routes/des.js';
import { configRouter } from './routes/config.js';
import { scanRouter } from './routes/scan.js';
import { croupierRouter } from './routes/croupier.js';
import { banquierRouter } from './routes/banquier.js';
import { chequesRouter } from './routes/cheques.js';
import { historiqueRouter } from './routes/historique.js';
import { UPLOADS_DIR } from './lib/uploads.js';
import { startAutoBackup } from './lib/backup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api/auth', authRouter);
app.use('/api/joueurs', joueursRouter);
app.use('/api/items', itemsRouter);
app.use('/api/cartes', cartesRouter);
app.use('/api/des', desRouter);
app.use('/api/config', configRouter);
app.use('/api', scanRouter);
app.use('/api/croupier', croupierRouter);
app.use('/api/banquier', banquierRouter);
app.use('/api/cheques', chequesRouter);
app.use('/api/historique', historiqueRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Téléchargement du certificat local à installer une fois par appareil (nécessaire
// pour que Safari iOS autorise la caméra, qui exige un contexte HTTPS de confiance).
const { key: certKey, cert: certPem } = ensureCert();
app.get('/cert.pem', (req, res) => {
  res.setHeader('Content-Type', 'application/x-x509-ca-cert');
  res.setHeader('Content-Disposition', 'attachment; filename="casino-rp.pem"');
  res.send(certPem);
});

// En production, le client React compilé (npm run build:client) est servi directement par ce serveur.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

// Le serveur HTTPS héberge l'application complète (dont le temps réel).
// Le serveur HTTP ne sert que le téléchargement initial du certificat.
const httpsServer = https.createServer({ key: certKey, cert: certPem }, app);
const httpServer = http.createServer(app);
initSocket(httpsServer);

function localIPs() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const HOST = process.env.HOST || '0.0.0.0';

httpsServer.listen(HTTPS_PORT, HOST, () => {
  const ips = localIPs();
  console.log(`Serveur casino RP démarré — HTTPS sur le port ${HTTPS_PORT}, HTTP (secours + certificat) sur le port ${PORT}`);
  console.log(`Accès depuis cette machine : https://localhost:${HTTPS_PORT}`);
  for (const ip of ips) {
    console.log(`Accès depuis les autres appareils (une fois le certificat installé) : https://${ip}:${HTTPS_PORT}`);
  }
  console.log(`Première connexion sur chaque appareil : installer le certificat via http://${ips[0] ?? 'localhost'}:${PORT}/cert.pem (voir README)`);
  startAutoBackup(Number(process.env.BACKUP_INTERVAL_MIN) || 5);
});

httpServer.listen(PORT, HOST);
