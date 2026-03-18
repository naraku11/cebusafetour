const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

const ADMIN_ROLES = ['admin_super', 'admin_content', 'admin_emergency'];

function init(httpServer) {
  const corsAllowed = (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',').map((o) => o.trim()).filter(Boolean);

  io = new Server(httpServer, {
    cors: { origin: corsAllowed, credentials: true },
    transports: ['websocket', 'polling'],
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

function emitToAdmins(event, data) { io?.to('admins').emit(event, data); }
function emitToTourists(event, data) { io?.to('tourists').emit(event, data); }
function emitToAll(event, data) { io?.emit(event, data); }
function emitToUser(userId, event, data) { io?.to(`user:${userId}`).emit(event, data); }

module.exports = { init, getIo, emitToAdmins, emitToTourists, emitToAll, emitToUser };
