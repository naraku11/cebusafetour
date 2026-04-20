const cron   = require('node-cron');
const db     = require('../config/db');
const logger = require('../utils/logger');
const socket = require('../services/socketService');
const push   = require('../services/pushService');

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
      // Background push via OneSignal (fire-and-forget)
      push.sendToAll({
        title: n.title, body: n.body,
        data: { type: n.type, priority: n.priority, notificationId: n.id },
      }).catch(err => logger.warn(`Scheduled push failed for ${n.id}:`, err.message));
      logger.info(`Scheduled notification dispatched: ${n.id} ("${n.title}")`);
    }
  } catch (err) {
    logger.error('Notification scheduler error:', err.message);
  }
});

logger.info('Notification scheduler started (every 30s)');
