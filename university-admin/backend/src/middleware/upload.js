const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const MAX_SIZE_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB || '10', 10);

const ALLOWED_MIME = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function createUploader(subdir) {
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      const dest = path.join(__dirname, '..', 'uploads', subdir);
      ensureDir(dest);
      cb(null, dest);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = Object.values(ALLOWED_MIME).flat().includes(ext) ? ext : '';
      cb(null, `${Date.now()}_${uuidv4()}${safeExt}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ALLOWED_MIME[file.mimetype];
    if (!allowedExts || !allowedExts.includes(ext)) {
      return cb(new Error('Only JPG, JPEG, PNG, WEBP, PDF, and DOCX files are allowed'));
    }
    // Block path traversal in original name
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      return cb(new Error('Invalid file name'));
    }
    return cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  });
}

module.exports = {
  createUploader,
  ALLOWED_MIME,
  ensureDir,
};
