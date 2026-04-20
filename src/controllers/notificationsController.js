const { v4: uuidv4 } = require('uuid');
const db     = require('../config/db');
const logger = require('../utils/logger');
const socket = require('../services/socketService');
const push   = require('../services/pushService');

const _dispatchPush = async ({ id, title, body, type, priority, target }) => {
  const payload = { title, body, data: { type, priority, notificationId: id } };
  const t = typeof target === 'string' ? JSON.parse(target || '{}') : (target ?? {});
  if (t.type === 'all') {
    await push.sendToAll(payload);
  } else if (t.type === 'nationality') {
    await push.sendToNationality(t.value, payload);
  } else if (t.type === 'specific') {
    const ids = Array.isArray(t.value) ? t.value : [t.value];
    await push.sendToUsers(ids, payload);
  }
};

exports.send = async (req, res, next) => {
  try {
    const { title, body, type, priority = 'normal', target, scheduledAt } = req.body;

    const id  = uuidv4();
    const now = new Date();
    await db.run(
      `INSERT INTO notifications
         (id, title, body, type, priority, target, scheduled_at, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [
        id, title, body, type, priority,
        JSON.stringify(target),
        scheduledAt ? new Date(scheduledAt) : null,
        req.user.id,
        now, now,
      ]
    );

    const notification = await db.findOne('SELECT * FROM notifications WHERE id = ? LIMIT 1', [id]);

    if (!scheduledAt) {
      await db.run(
        "UPDATE notifications SET status = 'sent', sent_at = ?, updated_at = ? WHERE id = ?",
        [now, now, id]
      );
    }

    socket.emitToAdmins('notification:new', { notification });
    if (!scheduledAt) {
      // Socket: delivers to connected tourists instantly
      socket.emitToTourists('notification:new', { id, title, body, type, priority });
      // OneSignal: delivers to background/killed app via push
      _dispatchPush({ id, title, body, type, priority, target }).catch(
        err => logger.warn('Push dispatch failed:', err.message)
      );
    }
    res.status(201).json({
      notification,
      message: scheduledAt ? 'Notification scheduled' : 'Notification sent',
    });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const conditions = [];
    const params     = [];
    if (status) { conditions.push('status = ?');                  params.push(status); }
    if (type)   { conditions.push('type = ?');                    params.push(type); }
    if (search) { conditions.push('title LIKE ?');                params.push(`%${search}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [notifications, countRow] = await Promise.all([
      db.findMany(
        `SELECT id, title, body, type, priority, target, status, sent_at, created_by, created_at
         FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, take, skip]
      ),
      db.findOne(`SELECT COUNT(*) as n FROM notifications ${where}`, params),
    ]);

    res.json({ notifications, total: countRow.n });
  } catch (err) { next(err); }
};


exports.remove = async (req, res, next) => {
  try {
    const existing = await db.findOne('SELECT id FROM notifications WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Notification not found' });
    await db.run('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    socket.emitToAdmins('notification:deleted', { id: req.params.id });
    res.json({ message: 'Notification deleted' });
  } catch (err) { next(err); }
};

// Public endpoint — any authenticated user can fetch sent notifications (cursor-paginated).
// GET /notifications/public?before=<ISO-date>&limit=<n>
exports.listPublic = async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const before = req.query.before ? new Date(req.query.before) : null;

    const params = [];
    let   where  = "WHERE status = 'sent'";
    if (before && !isNaN(before)) {
      where += ' AND sent_at < ?';
      params.push(before);
    }

    // Fetch last_read_notifications_at for the current user so mobile can
    // derive isRead without a separate round-trip.
    const [notifications, userRow] = await Promise.all([
      db.findMany(
        `SELECT id, title, body, type, priority, sent_at, created_at
         FROM notifications ${where} ORDER BY sent_at DESC LIMIT ?`,
        [...params, limit]
      ),
      db.findOne(
        'SELECT last_read_notifications_at FROM users WHERE id = ? LIMIT 1',
        [req.user.id]
      ),
    ]);

    const lastRead = userRow?.lastReadNotificationsAt ?? null;
    const enriched = notifications.map(n => ({
      ...n,
      isRead: lastRead ? new Date(n.sentAt ?? n.createdAt) <= new Date(lastRead) : false,
    }));

    res.json({ notifications: enriched, lastReadAt: lastRead });
  } catch (err) { next(err); }
};

// Mark all notifications as read for the current user
exports.markRead = async (req, res, next) => {
  try {
    await db.run(
      'UPDATE users SET last_read_notifications_at = ? WHERE id = ?',
      [new Date(), req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
};
