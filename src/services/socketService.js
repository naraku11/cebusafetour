const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;

const ADMIN_ROLES = ['admin_super', 'admin_content', 'admin_emergency'];

// Max concurrent WebSocket connections — keeps TCP socket count predictable on Hostinger.
// Admin portal (few tabs) + mobile tourists online at once.  Reject new connections
// beyond this to protect the process budget.
const MAX_CONNECTIONS = parseInt(process.env.WS_MAX_CONNECTIONS || '60', 10);

function init(httpServer) {
  const corsAllowed = (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',').map((o) => o.trim()).filter(Boolean);

  io = new Server(httpServer, {
    cors: { origin: corsAllowed, credentials: true },
    transports: ['websocket', 'polling'],
    pingInterval: 30000,      // check connection every 30s (default 25s)
    pingTimeout: 10000,       // disconnect if no pong in 10s
    maxHttpBufferSize: 1e5,   // 100KB max message (default 1MB)
    perMessageDeflate: false,  // disable compression to save CPU
  });

  // Connection-limit middleware — reject before auth to avoid wasted JWT work
  io.use((socket, next) => {
    if (io.engine.clientsCount >= MAX_CONNECTIONS) {
      logger.warn(`Socket.IO connection rejected — at capacity (${MAX_CONNECTIONS})`);
      return next(new Error('Server at capacity, please retry later'));
    }
    next();
  });

  // Auth middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || '').replace('Bearer ', '');
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    socket.join(`user:${id}`);
    if (ADMIN_ROLES.includes(role)) socket.join('admins');
    else socket.join('tourists');
  });

  return io;
}

function getIo() { return io; }

// Lazy-require events.js so there is no circular-dependency issue at module load
// time (app.js loads both this file and events.js, so events.js is guaranteed to
// be fully initialised before any event is ever emitted).
function _sse() {
  try { return require('../routes/events').emitSSE; } catch { return null; }
}

function emitToAdmins(event, data) {
  io?.to('admins').emit(event, data);
  _sse()?.('admins', event, data);
}
function emitToTourists(event, data) {
  io?.to('tourists').emit(event, data);
  _sse()?.('tourists', event, data);
}
function emitToAll(event, data) {
  io?.emit(event, data);
  _sse()?.(null, event, data);
}
function emitToUser(userId, event, data) {
  io?.to(`user:${userId}`).emit(event, data);
  // SSE has no user-level room; skip per-user targeted events
}

module.exports = { init, getIo, emitToAdmins, emitToTourists, emitToAll, emitToUser };
