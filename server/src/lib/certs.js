import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import selfsigned from 'selfsigned';

const CERT_DIR = path.join(process.cwd(), 'data', 'certs');
const KEY_PATH = path.join(CERT_DIR, 'key.pem');
const CERT_PATH = path.join(CERT_DIR, 'cert.pem');
const META_PATH = path.join(CERT_DIR, 'meta.json');

function localIPs() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address)
    .sort();
}

function generate(ips) {
  const attrs = [{ name: 'commonName', value: 'Casino RP Local' }];
  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' },
    ...ips.map((ip) => ({ type: 7, ip }))
  ];
  const pems = selfsigned.generate(attrs, {
    days: 825,
    keySize: 2048,
    algorithm: 'sha256', // iOS rejette les certificats signés en SHA-1
    extensions: [
      { name: 'basicConstraints', cA: true },
      { name: 'keyUsage', keyCertSign: true, digitalSignature: true, keyEncipherment: true, cRLSign: true },
      { name: 'subjectAltName', altNames }
    ]
  });
  return pems;
}

/**
 * Renvoie un certificat auto-signé (CA:true) couvrant localhost + les IP
 * locales actuelles, à installer une fois comme profil de confiance sur
 * chaque borne iPad pour que le scan caméra fonctionne en HTTPS.
 * Régénéré automatiquement si les IP locales changent (nouveau réseau Wi-Fi).
 */
export function ensureCert() {
  const ips = localIPs();
  let meta = null;
  if (fs.existsSync(META_PATH)) {
    try { meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8')); } catch { /* régénère */ }
  }

  const upToDate = meta && JSON.stringify(meta.ips) === JSON.stringify(ips) &&
    fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH);

  if (!upToDate) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
    const pems = generate(ips);
    fs.writeFileSync(KEY_PATH, pems.private);
    fs.writeFileSync(CERT_PATH, pems.cert);
    fs.writeFileSync(META_PATH, JSON.stringify({ ips, generatedAt: new Date().toISOString() }, null, 2));
    console.log(`Certificat HTTPS local (re)généré pour : localhost, 127.0.0.1, ${ips.join(', ') || '(aucune IP réseau détectée)'}`);
  }

  return {
    key: fs.readFileSync(KEY_PATH, 'utf8'),
    cert: fs.readFileSync(CERT_PATH, 'utf8'),
    certPath: CERT_PATH
  };
}
