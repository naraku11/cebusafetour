const { Prisma } = require('@prisma/client');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack || err.message);

  // ── Prisma known errors ───────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Record already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
    return res.status(400).json({ error: 'Database request error', code: err.code });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Invalid data provided' });
  }

  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    logger.error('Database connection failed:', err.message);
    return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
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
