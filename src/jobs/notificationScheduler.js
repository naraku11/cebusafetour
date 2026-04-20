const cron   = require('node-cron');
const db     = require('../config/db');
const logger = require('../utils/logger');
const socket = require('../services/socketService');
const push   = require('../services/pushService');

// Target-aware push dispatch — mirrors notificationsController._dispatchPush.
// Kept inline to avoid a circular require through the controller.
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

// Runs every 30 seconds — picks up pending notifications whose scheduled_at has passed.
cron.schedule('*/30 * * * * *', async () => {
  try {
    const due = await db.findMany(
      `SELECT * FROM notifications
       WHERE status = 'pending' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()
       LIMIT 20`
    );
    for (const n of due) {
      const now = new Date();
      await db.run(
        "UPDATE notifications SET status = 'sent', sent_at = ?, updated_at = ? WHERE id = ?",
        [now, now, n.id]
      );
      // Deliver to connected tourists via Socket.IO
      socket.emitToAdmins('notification:new', { notification: n });
      socket.emitToTourists('notification:new', {
        id: n.id, title: n.title, body: n.body, type: n.type, priority: n.priority,
      });
      // Background push via OneSignal — target-aware (nationality/specific/all)
      _dispatchPush({ id: n.id, title: n.title, body: n.body, type: n.type, priority: n.priority, target: n.target })
        .catch(err => logger.warn(`Scheduled push failed for ${n.id}:`, err.message));
      logger.info(`Scheduled notification dispatched: ${n.id} ("${n.title}")`);
    }
  } catch (err) {
    logger.error('Notification scheduler error:', err.message);
  }
});

logger.info('Notification scheduler started (every 30s)');
