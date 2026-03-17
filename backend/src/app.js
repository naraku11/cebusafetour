const path = require('path');
// .env.local (local dev overrides) is loaded first; values already set are NOT overwritten.
// On Hostinger, .env.local doesn't exist so only .env is used — production values win.
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { initFirebase } = require('./config/firebase');
try { initFirebase(); } catch (e) {
  console.warn('Firebase init failed (non-fatal):', e.message);
}

const http    = require('http');
const fs      = require('fs');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

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
const prisma           = require('./config/prisma');

// Ensure upload directories exist
fs.mkdirSync(path.join(__dirname, '..', 'uploads', 'avatars'), { recursive: true });

const app    = express();
const server = http.createServer(app);

// Attach Socket.IO
socket.init(server);

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
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
}));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check — tests all critical services
app.get('/health', async (req, res) => {
  const checks = {};

  // 1. Database
  try {
    const t = Date.now();
    await prisma.$queryRaw`SELECT 1`;
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

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`CebuSafeTour API running on port ${PORT}`);
  // Verify DB connection after startup (non-blocking)
  prisma.$connect()
    .then(() => logger.info('MySQL database connected successfully'))
    .catch((e) => logger.error(`Database connection FAILED: ${e.message}`));
});

module.exports = app;
