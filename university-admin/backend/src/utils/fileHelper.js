const fs = require('fs');
const path = require('path');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

function toPublicPath(subdir, filename) {
  if (!filename) return null;
  return `/uploads/${subdir}/${filename}`;
}

function absoluteFromPublic(publicPath) {
  if (!publicPath) return null;
  const normalized = publicPath.replace(/^\/uploads\//, '').replace(/\.\./g, '');
  return path.join(UPLOADS_ROOT, normalized);
}

/**
 * Delete a file only after DB update succeeds.
 * Never touches paths outside the project's uploads folder.
 */
function safeDeleteFile(publicPath) {
  if (!publicPath) return;
  const abs = absoluteFromPublic(publicPath);
  if (!abs || !abs.startsWith(UPLOADS_ROOT)) return;
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
  }
}

module.exports = {
  UPLOADS_ROOT,
  toPublicPath,
  absoluteFromPublic,
  safeDeleteFile,
};
