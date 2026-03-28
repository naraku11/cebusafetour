const mysql = require('mysql2/promise');

function buildPool(prismaUrl) {
  const u = new URL(prismaUrl);
  const limit   = parseInt(u.searchParams.get('connection_limit') || '10', 10);
  const timeout = parseInt(u.searchParams.get('connect_timeout') || '10', 10) * 1000;
  // Strip Prisma-specific query params before passing URI to mysql2
  ['connection_limit', 'connect_timeout', 'socket_timeout'].forEach(p => u.searchParams.delete(p));

  return mysql.createPool({
    uri: u.toString(),
    connectionLimit: limit,
    connectTimeout: timeout,
    idleTimeout: 60_000,          // release idle connections after 60s
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    typeCast(field, next) {
      // Auto-parse JSON columns
      if (field.type === 'JSON') {
        const str = field.string();
        try { return str === null ? null : JSON.parse(str); } catch { return str; }
      }
      // Return DECIMAL as float instead of string
      if (field.type === 'DECIMAL' || field.type === 'NEWDECIMAL') {
        const s = field.string();
        return s === null ? null : parseFloat(s);
      }
      // Return TINYINT(1) as boolean
      if (field.type === 'TINY' && field.length === 1) {
        const v = field.string();
        return v === null ? null : v === '1';
      }
      return next();
    },
  });
}

const pool = buildPool(process.env.DATABASE_URL);

// Convert snake_case column names to camelCase
const camel = s => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const camelizeRow = row =>
  row ? Object.fromEntries(Object.entries(row).map(([k, v]) => [camel(k), v])) : null;

/** Return first matching row as a camelCase object, or null */
pool.findOne = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return camelizeRow(rows[0]) ?? null;
};

/** Return all matching rows as camelCase objects */
pool.findMany = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows.map(camelizeRow);
};

/** Run INSERT / UPDATE / DELETE — returns the mysql2 OkPacket */
pool.run = async (sql, params = []) => {
  const [result] = await pool.execute(sql, params);
  return result;
};

module.exports = pool;
