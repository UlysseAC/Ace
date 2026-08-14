import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

function storageFor(sub) {
  return multer.diskStorage({
    destination: path.join(UPLOADS_DIR, sub),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    }
  });
}

const imageFilter = (req, file, cb) => {
  if (/^image\/(png|jpe?g)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Seules les images PNG/JPEG sont acceptées'));
};

export const uploadCarteImage = multer({ storage: storageFor('cartes'), fileFilter: imageFilter });
export const uploadChequeTemplate = multer({ storage: storageFor('cheques'), fileFilter: imageFilter });
