const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// In production only log errors/warnings — query logging adds overhead.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ]
    : [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => logger.debug(`Query: ${e.query} (${e.duration}ms)`));
}
prisma.$on('error', (e) => logger.error('Prisma error:', e));
prisma.$on('warn',  (e) => logger.warn('Prisma warn:', e));

module.exports = prisma;
