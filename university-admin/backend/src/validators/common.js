function requireFields(body, fields) {
  const missing = fields.filter((f) => {
    const value = body[f];
    return value === undefined || value === null || String(value).trim() === '';
  });
  if (missing.length) {
    const err = new Error(`Missing required fields: ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
}

module.exports = { requireFields };
