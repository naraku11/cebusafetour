const path = require('path');
// .env.local (local dev overrides) is loaded first; values already set are NOT overwritten.
// On Hostinger, .env.local doesn't exist so only .env is used — production values win.
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Firebase is lazy-initialized on first use (FCM send or Firestore write).
// This avoids holding gRPC connections open at startup on Hostinger.

// ── Hostinger Process Budget (Business Web Hosting: 40 max) ─────────────
// | Component               | Processes | Notes                          |
// |-------------------------|-----------|--------------------------------|
// | Node.js main            |     1     | Always running                 |
// | MySQL pool (idle→max)   |   0 – 5   | idleTimeout 30s reclaims fast  |
// | Firebase gRPC (lazy)    |   0 – 2   | Only when FCM/Firestore fires  |
// | SMTP (transient)        |   0 – 1   | Connection per email send      |
// | Socket.IO clients       |   0 – 25  | Capped by WS_MAX_CONNECTIONS   |
// |-------------------------|-----------|--------------------------------|
// | Baseline (idle)         |    ~2     | Node + 1 keep-alive DB conn    |
// | Typical (moderate load) |   ~12     | Node + 3 DB + 2 WS + extras   |
// | Peak (all services)     |   ~34     | Within 40-process limit        |
// ─────────────────────────────────────────────────────────────────────────

const http        = require('http');
const fs          = require('fs');
const express     = require('express');
const compression = require('compression');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');

const authRoutes          = require('./routes/auth');
const attractionsRoutes   = require('./routes/attractions');
const advisoriesRoutes    = require('./routes/advisories');
const emergencyRoutes     = require('./routes/emergency');
const usersRoutes         = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const reportsRoutes       = require('./routes/reports');
const reviewsRoutes       = require('./routes/reviews');

const { errorHandler } = require('./middleware/errorHandler');
const logger           = require('./utils/logger');
const socket           = require('./services/socketService');
const db               = require('./config/db');
const cache            = require('./utils/cache');

// Ensure upload directories exist
fs.mkdirSync(path.join(__dirname, '..', 'uploads', 'avatars'), { recursive: true });

const app    = express();
const server = http.createServer(app);

// Trust Hostinger's reverse proxy so express-rate-limit reads the real client IP
// from X-Forwarded-For instead of the proxy's internal IP.
app.set('trust proxy', 1);

// Attach Socket.IO
socket.init(server);

// Compress HTTP responses >1 KB (skip tiny payloads where overhead exceeds benefit)
app.use(compression({ threshold: 1024 }));

// Security & parsing middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const _corsAllowed = (process.env.CORS_ORIGINS || process.env.ADMIN_URL || 'http://localhost:5173')
  .split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (_corsAllowed.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(morgan(
  process.env.NODE_ENV === 'production' ? 'short' : 'combined',
  {
    stream: { write: msg => logger.info(msg.trim()) },
    // In production, only log errors (4xx/5xx) to save disk & CPU
    skip: (_req, res) => process.env.NODE_ENV === 'production' && res.statusCode < 400,
  }
));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Auth rate limiting — strict (brute-force protection)
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later.' },
  skipSuccessfulRequests: true,
}));

// Global rate limiting — generous enough for normal app + admin polling
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  message: { error: 'Too many requests, please try again later.' },
}));

// Serve uploaded files with cache headers
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d' }));

// Health check — tests all critical services
app.get('/health', async (req, res) => {
  const checks = {};

  // 1. Database
  try {
    const t = Date.now();
    await db.execute('SELECT 1');
    checks.database = { status: 'ok', latencyMs: Date.now() - t };
  } catch (e) {
    checks.database = { status: 'error', error: e.message };
  }

  // 2. SMTP config present
  checks.smtp = process.env.SMTP_HOST && process.env.SMTP_USER
    ? { status: 'configured', host: process.env.SMTP_HOST }
    : { status: 'missing', error: 'SMTP_HOST or SMTP_USER not set' };

  // 3. Firebase config present
  checks.firebase = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY
    ? { status: 'configured', project: process.env.FIREBASE_PROJECT_ID }
    : { status: 'missing', error: 'FIREBASE_PROJECT_ID or FIREBASE_PRIVATE_KEY not set' };

  // 4. JWT secret
  checks.jwt = process.env.JWT_SECRET
    ? { status: 'configured' }
    : { status: 'missing', error: 'JWT_SECRET not set' };

  // 5. OpenAI key — show first 12 chars so you can verify which key the server loaded
  const oaiKey = process.env.OPENAI_API_KEY;
  checks.openai = oaiKey
    ? { status: 'configured', keyPrefix: oaiKey.slice(0, 12) + '...' }
    : { status: 'missing', error: 'OPENAI_API_KEY not set' };

  // 6. In-memory cache
  const cacheStats = cache.getStats();
  checks.cache = {
    status: 'ok',
    keys: cache.keys().length,
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    hitRate: cacheStats.hits + cacheStats.misses > 0
      ? `${((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1)}%`
      : 'n/a',
  };

  // Overall status — 'ok' only if DB connected and JWT present
  const healthy = checks.database.status === 'ok' && checks.jwt.status === 'configured';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    env: process.env.NODE_ENV || 'unknown',
    uptime: `${Math.floor(process.uptime())}s`,
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/attractions',   attractionsRoutes);
app.use('/api/advisories',    advisoriesRoutes);
app.use('/api/emergency',     emergencyRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports',       reportsRoutes);
app.use('/api/reviews',       reviewsRoutes);

// Serve admin panel static files (built into backend/public during deployment)
const adminDist = path.join(__dirname, '..', 'public');
if (fs.existsSync(adminDist)) {
  app.use(express.static(adminDist, { maxAge: '1d' }));
  // SPA fallback — all non-API routes return index.html
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));
} else {
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
}

// Global error handler
app.use(errorHandler);

// ── Server timeouts ──────────────────────────────────────────────────────────
// Hostinger's proxy cuts connections at ~60 s.  Setting keepAliveTimeout just
// above that prevents premature 502/timeout errors on persistent connections.
server.keepAliveTimeout = 65_000;  // ms — must be > proxy idle timeout
server.headersTimeout   = 66_000;  // ms — must be > keepAliveTimeout
server.timeout          = 120_000; // ms — max time for a single request

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const _shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await db.end().catch(() => {});
    logger.info('Database disconnected. Process exiting.');
    process.exit(0);
  });
  // Force-exit if graceful shutdown stalls
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => _shutdown('SIGTERM'));
process.on('SIGINT',  () => _shutdown('SIGINT'));

// ── Start: pre-warm database pool BEFORE accepting HTTP traffic ───────────────
// Establishes one connection early so the pool is ready for the first request.
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    // Pre-warm the mysql2 connection pool before accepting HTTP traffic
    try {
      const conn = await db.getConnection();
      conn.release();
      logger.info('MySQL database connected successfully');
    } catch (e) {
      logger.error(`Database connection FAILED: ${e.message}`);
      // Continue anyway — individual requests will surface DB errors properly.
    }

    server.listen(PORT, () => {
      logger.info(`CebuSafeTour API running on port ${PORT}`);
    });
  })();
}

module.exports = app;
