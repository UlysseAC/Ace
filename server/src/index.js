import express from 'express';
import cors from 'cors';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import './db/seed.js';

import { initSocket } from './realtime/socket.js';
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

const httpServer = http.createServer(app);
initSocket(httpServer);

function localIPs() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
httpServer.listen(PORT, HOST, () => {
  console.log(`Serveur casino RP démarré sur le port ${PORT}`);
  console.log('Accès depuis cette machine : http://localhost:' + PORT);
  for (const ip of localIPs()) {
    console.log(`Accès depuis les autres appareils du même réseau : http://${ip}:${PORT}`);
  }
  startAutoBackup(Number(process.env.BACKUP_INTERVAL_MIN) || 5);
});
