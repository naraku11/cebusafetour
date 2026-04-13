const { v4: uuidv4 } = require('uuid');
const db     = require('../config/db');
const logger = require('../utils/logger');
const { sendPushToAll, sendPushToUsers } = require('../services/fcmService');
const socket = require('../services/socketService');

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

    if (!scheduledAt) await dispatchNotification(notification);

    socket.emitToAdmins('notification:new', { notification });
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

const dispatchNotification = async (notification) => {
  const { target, title, body, type, priority } = notification;
  const fcmPayload = { title, body, data: { type, priority, notificationId: notification.id } };

  try {
    if (target.type === 'all') {
      await sendPushToAll(fcmPayload);
    } else if (target.type === 'nationality') {
      const users  = await db.findMany(
        'SELECT fcm_token FROM users WHERE nationality = ? AND fcm_token IS NOT NULL',
        [target.value]
      );
      const tokens = users.map(u => u.fcmToken).filter(Boolean);
      if (tokens.length) await sendPushToUsers(tokens, fcmPayload);
    } else if (target.type === 'specific') {
      const ids    = Array.isArray(target.value) ? target.value : [target.value];
      const placeholders = ids.map(() => '?').join(',');
      const users  = await db.findMany(
        `SELECT fcm_token FROM users WHERE id IN (${placeholders}) AND fcm_token IS NOT NULL`,
        ids
      );
      const tokens = users.map(u => u.fcmToken).filter(Boolean);
      if (tokens.length) await sendPushToUsers(tokens, fcmPayload);
    }

    await db.run(
      "UPDATE notifications SET status = 'sent', sent_at = ?, updated_at = ? WHERE id = ?",
      [new Date(), new Date(), notification.id]
    );
  } catch (err) {
    logger.error(`Notification dispatch failed for ${notification.id}:`, err.message);
    await db.run(
      "UPDATE notifications SET status = 'failed', updated_at = ? WHERE id = ?",
      [new Date(), notification.id]
    );
  }
};

exports.dispatchNotification = dispatchNotification;

exports.remove = async (req, res, next) => {
  try {
    const existing = await db.findOne('SELECT id FROM notifications WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Notification not found' });
    await db.run('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification deleted' });
  } catch (err) { next(err); }
};

// Public endpoint — any authenticated user can fetch recent sent announcements
exports.listPublic = async (req, res, next) => {
  try {
    const notifications = await db.findMany(
      `SELECT id, title, body, type, priority, sent_at, created_at
       FROM notifications WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 50`
    );
    res.json({ notifications });
  } catch (err) { next(err); }
};
