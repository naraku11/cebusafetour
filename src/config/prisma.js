const { PrismaClient } = require('@prisma/client');
const { PrismaMysql }  = require('@prisma/adapter-mysql');
const mysql  = require('mysql2/promise');
const logger = require('../utils/logger');

// Strip Prisma-specific URL params that mysql2 doesn't understand,
// and extract pool settings from them.
function buildPool(prismaUrl) {
  const u       = new URL(prismaUrl);
  const limit   = parseInt(u.searchParams.get('connection_limit') || '5',  10);
  const timeout = parseInt(u.searchParams.get('connect_timeout')  || '10', 10) * 1000;
  ['connection_limit', 'connect_timeout', 'socket_timeout'].forEach(p => u.searchParams.delete(p));

  return mysql.createPool({
    uri:              u.toString(),
    connectionLimit:  limit,
    connectTimeout:   timeout,
  });
}

const pool    = buildPool(process.env.DATABASE_URL);
const adapter = new PrismaMysql(pool);

const prisma = new PrismaClient({
  adapter,
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
