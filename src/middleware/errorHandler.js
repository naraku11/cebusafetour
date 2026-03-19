const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack || err.message);

  // mysql2 duplicate entry error
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Record already exists' });
  }

  // ── HTTP errors with explicit status ─────────────────────────────────────
  if (err.status || err.statusCode) {
    return res.status(err.status || err.statusCode).json({
      error: err.message || 'An error occurred',
    });
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  res.status(500).json({ error: 'Internal server error' });
};

module.exports = { errorHandler };
