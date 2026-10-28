const { fail } = require('../utils/response');

function notFound(req, res) {
  return fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  const _next = next;
  console.error('[API Error]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  });

  if (err.code === 'LIMIT_FILE_SIZE') {
    return fail(res, 'File size exceeds the allowed limit', 400);
  }
  if (err.message && err.message.includes('Only')) {
    return fail(res, err.message, 400);
  }

  const status = err.status || err.statusCode || 500;
  const message =
    status === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return fail(res, message, status);
}

module.exports = { notFound, errorHandler };
