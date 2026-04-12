const express = require('express');
const jwt     = require('jsonwebtoken');
const logger  = require('../utils/logger');

const router = express.Router();

// Active SSE connections
const clients = new Set();

// Reserve headroom within Hostinger's 40-process budget:
//   25 WebSocket (WS_MAX_CONNECTIONS) + 15 SSE = 40 total connection slots.
// SSE connections are open HTTP responses, not OS processes, but they consume
// file descriptors and memory — cap them to protect the event loop.
const MAX_SSE = parseInt(process.env.SSE_MAX_CONNECTIONS || '20', 10);

const ADMIN_ROLES = ['admin_super', 'admin_content', 'admin_emergency'];

/**
 * GET /api/events?token=<jwt>
 *
 * Server-Sent Events stream — read-only fallback for clients where Socket.IO
 * WebSocket cannot connect (e.g. restrictive proxies).
 *
 * Auth via query-param token because the EventSource API does not support
 * custom request headers.
 *
 * The client (useRealtimeSync.js) only opens this stream after Socket.IO
 * fails to connect 3 consecutive times, and closes it as soon as WebSocket
 * re-establishes.
 */
router.get('/', (req, res) => {
  // ── Authentication ──────────────────────────────────────────────────────
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'token required' });

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // ── Capacity check ──────────────────────────────────────────────────────
  if (clients.size >= MAX_SSE) {
    logger.warn(`SSE at capacity (${MAX_SSE}) — rejecting new client`);
    return res.status(503).json({ error: 'SSE at capacity, please use WebSocket' });
  }

  // ── Open SSE stream ─────────────────────────────────────────────────────
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  // Disable nginx/proxy response buffering so events are flushed immediately
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const client = { res, role: user.role };
  clients.add(client);
  logger.info(`SSE client connected — role: ${user.role}, total: ${clients.size}`);

  // Send a comment-only heartbeat every 25 s.
  // Proxies typically close idle connections after 60 s; 25 s keeps them alive.
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n');
  }, 25_000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
    logger.info(`SSE client disconnected — total: ${clients.size}`);
  });
});

/**
 * Push a named SSE event to matching connected clients.
 *
 * @param {'admins'|'tourists'|null} room  Target room — null broadcasts to all.
 * @param {string}                   event  Event name (e.g. 'incident:new').
 * @param {object}                   data   JSON-serialisable payload.
 */
function emitSSE(room, event, data) {
  if (clients.size === 0) return; // fast-path — no one listening
  const payload = `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
  for (const c of clients) {
    if (c.res.writableEnded) continue;
    const isAdmin = ADMIN_ROLES.includes(c.role);
    if (room === 'admins'   && !isAdmin) continue;
    if (room === 'tourists' &&  isAdmin) continue;
    c.res.write(payload);
  }
}

module.exports = { router, emitSSE };
