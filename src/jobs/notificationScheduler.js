const cron   = require('node-cron');
const db     = require('../config/db');
const logger = require('../utils/logger');
const { dispatchNotification } = require('../controllers/notificationsController');

// Runs every 30 seconds — picks up pending notifications whose scheduled_at has passed.
cron.schedule('*/30 * * * * *', async () => {
  try {
    const due = await db.findMany(
      `SELECT * FROM notifications
       WHERE status = 'pending' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()
       LIMIT 20`
    );
    for (const n of due) {
      // Parse target from JSON string (stored as TEXT in DB)
      if (typeof n.target === 'string') {
        try { n.target = JSON.parse(n.target); } catch { n.target = { type: 'all' }; }
      }
      await dispatchNotification(n);
      logger.info(`Scheduled notification dispatched: ${n.id} ("${n.title}")`);
    }
  } catch (err) {
    logger.error('Notification scheduler error:', err.message);
  }
});

logger.info('Notification scheduler started (every 30s)');
