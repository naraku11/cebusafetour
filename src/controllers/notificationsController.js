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

const _targetObject = (target) =>
  typeof target === 'string' ? JSON.parse(target || '{}') : (target ?? {});

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
      const t = _targetObject(target);
      // Socket: delivers to connected tourists instantly
      socket.emitToTourists('notification:new', { id, title, body, type, priority });
      // Guest sockets only receive global announcements/advisories.
      if (t.type === 'all') {
        socket.emitToGuests('notification:new', { id, title, body, type, priority });
      }
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

// Public endpoint — authenticated users fetch their own sent notifications (cursor-paginated).
// Target filter: 'all' → everyone; 'nationality' → matching users; 'specific' → listed users only.
// GET /notifications/public?before=<ISO-date>&limit=<n>
exports.listPublic = async (req, res, next) => {
  try {
    const userId       = req.user.id;
    const limit        = Math.min(parseInt(req.query.limit) || 20, 100);
    const before       = req.query.before ? new Date(req.query.before) : null;
    const beforeClause = (before && !isNaN(before)) ? 'AND n.sent_at < ?' : '';

    const params = [
      userId,  // JOIN users u ON u.id = ?
      userId,  // LEFT JOIN … r.user_id = ?
      userId,  // nationality sub-query WHERE id = ?
      userId,  // JSON_CONTAINS JSON_QUOTE(?)
      ...(before && !isNaN(before) ? [before] : []),
      limit,
    ];

    const [notifications, userRow] = await Promise.all([
      db.findMany(
        `SELECT n.id, n.title, n.body, n.type, n.priority, n.sent_at, n.created_at,
           CASE
             WHEN u.last_read_notifications_at IS NOT NULL
                  AND n.sent_at <= u.last_read_notifications_at THEN 1
             WHEN r.notification_id IS NOT NULL THEN 1
             ELSE 0
           END AS is_read
         FROM notifications n
         JOIN  users u ON u.id = ?
         LEFT JOIN user_notification_reads r
                ON r.notification_id = n.id AND r.user_id = ?
         WHERE n.status = 'sent'
           AND (
             JSON_UNQUOTE(JSON_EXTRACT(n.target, '$.type')) = 'all'
             OR (
               JSON_UNQUOTE(JSON_EXTRACT(n.target, '$.type')) = 'nationality'
               AND JSON_UNQUOTE(JSON_EXTRACT(n.target, '$.value'))
                   = (SELECT nationality FROM users WHERE id = ? LIMIT 1)
             )
             OR (
               JSON_UNQUOTE(JSON_EXTRACT(n.target, '$.type')) = 'specific'
               AND JSON_CONTAINS(JSON_EXTRACT(n.target, '$.value'), JSON_QUOTE(?))
             )
           )
           ${beforeClause}
         ORDER BY n.sent_at DESC LIMIT ?`,
        params
      ),
      db.findOne(
        'SELECT last_read_notifications_at FROM users WHERE id = ? LIMIT 1',
        [userId]
      ),
    ]);

    const lastRead = userRow?.lastReadNotificationsAt ?? null;
    const enriched = notifications.map(n => ({
      ...n,
      isRead: n.isRead === 1 || n.isRead === true,
    }));

    res.json({ notifications: enriched, lastReadAt: lastRead });
  } catch (err) { next(err); }
};

// Mark all sent notifications as read for the current user.
// Updates the coarse timestamp AND batch-inserts individual read rows.
exports.markRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now    = new Date();
    await db.run(
      'UPDATE users SET last_read_notifications_at = ?, updated_at = ? WHERE id = ?',
      [now, now, userId]
    );
    await db.run(
      `INSERT IGNORE INTO user_notification_reads (user_id, notification_id, read_at)
       SELECT ?, id, ? FROM notifications WHERE status = 'sent'`,
      [userId, now]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// Mark a single notification as read for the current user.
// PATCH /notifications/:id/read
exports.markOneRead = async (req, res, next) => {
  try {
    const notif = await db.findOne(
      "SELECT id FROM notifications WHERE id = ? AND status = 'sent' LIMIT 1",
      [req.params.id]
    );
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    await db.run(
      'INSERT IGNORE INTO user_notification_reads (user_id, notification_id, read_at) VALUES (?, ?, ?)',
      [req.user.id, req.params.id, new Date()]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
};
