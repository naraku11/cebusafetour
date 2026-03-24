const { createLogger, format, transports } = require('winston');

const isProduction = process.env.NODE_ENV === 'production';

const logger = createLogger({
  level: isProduction ? 'warn' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) =>
      `${timestamp} [${level.toUpperCase()}]: ${stack || message}`
    )
  ),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 2 * 1024 * 1024,  // 2 MB per file
      maxFiles: 2,                // keep 2 rotated files (4 MB total)
      tailable: true,
    }),
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 5 * 1024 * 1024,  // 5 MB per file
      maxFiles: 2,                // keep 2 rotated files (10 MB total)
      tailable: true,
    }),
  ],
});

module.exports = logger;
