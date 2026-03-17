require('dotenv').config();
const { initFirebase } = require('./config/firebase');
initFirebase();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const attractionsRoutes = require('./routes/attractions');
const advisoriesRoutes = require('./routes/advisories');
const emergencyRoutes = require('./routes/emergency');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const reportsRoutes = require('./routes/reports');
const weatherRoutes = require('./routes/weather');
const reviewsRoutes = require('./routes/reviews');

const path = require('path');
const fs   = require('fs');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Ensure upload directories exist
fs.mkdirSync(path.join(__dirname, '..', 'uploads', 'avatars'), { recursive: true });

const app = express();

// Security & parsing middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const _corsAllowed = (process.env.CORS_ORIGINS || process.env.ADMIN_URL || 'http://localhost:5173')
  .split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Native mobile apps and server-to-server requests have no origin — allow them
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
}));

// Serve uploaded files (avatars, etc.)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attractions', attractionsRoutes);
app.use('/api/advisories', advisoriesRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/reviews', reviewsRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`CebuSafeTour API running on port ${PORT}`));

module.exports = app;
