const { getMessaging } = require('../config/firebase');
const db     = require('../config/db');
const logger = require('../utils/logger');

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

// Removes tokens that Firebase reports as invalid/unregistered from the users table.
const pruneInvalidTokens = async (tokens, batchResponse) => {
  const invalid = tokens.filter((_, i) => {
    const err = batchResponse.responses[i]?.error;
    return err && INVALID_TOKEN_CODES.has(err.code);
  });
  if (!invalid.length) return;
  const placeholders = invalid.map(() => '?').join(',');
  await db.run(
    `UPDATE users SET fcm_token = NULL WHERE fcm_token IN (${placeholders})`,
    invalid
  ).catch(e => logger.warn('FCM token prune failed:', e.message));
  logger.info(`Pruned ${invalid.length} invalid FCM token(s)`);
};

const buildMessage = (tokens, { title, body, data = {} }) => ({
  notification: { title, body },
  data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
  tokens,
  android: { priority: 'high', notification: { channelId: 'cebusafetour_alerts' } },
  apns: { headers: { 'apns-priority': '10' } },
});

exports.sendPushToAll = async (payload) => {
  try {
    const messaging = getMessaging();
    if (!messaging) return; // Firebase not configured

    let offset = 0, total = 0;
    const BATCH = 500;
    const PARALLEL = 2; // send up to 2 batches concurrently (conserve processes on Hostinger)
    while (true) {
      const rows = await db.findMany(
        `SELECT fcm_token FROM users WHERE status = 'active' AND fcm_token IS NOT NULL LIMIT ? OFFSET ?`,
        [BATCH * PARALLEL, offset]
      );
      const tokens = rows.map(u => u.fcmToken).filter(Boolean);
      if (!tokens.length) break;

      // Split into sub-batches and send in parallel
      const batches = [];
      for (let i = 0; i < tokens.length; i += BATCH) {
        batches.push(tokens.slice(i, i + BATCH));
      }
      await Promise.all(batches.map(async b => {
        const result = await messaging.sendEachForMulticast(buildMessage(b, payload));
        await pruneInvalidTokens(b, result);
      }));
      total += tokens.length;
      if (rows.length < BATCH * PARALLEL) break;
      offset += BATCH * PARALLEL;
    }
    if (total) logger.info(`Push sent to ${total} users`);
  } catch (err) {
    logger.error('FCM sendPushToAll error:', err);
  }
};

exports.sendPushToUsers = async (tokens, payload) => {
  try {
    const messaging = getMessaging();
    if (!messaging) return;

    const batches = [];
    for (let i = 0; i < tokens.length; i += 500) {
      batches.push(tokens.slice(i, i + 500));
    }
    await Promise.all(batches.map(async b => {
      const result = await messaging.sendEachForMulticast(buildMessage(b, payload));
      await pruneInvalidTokens(b, result);
    }));
  } catch (err) {
    logger.error('FCM sendPushToUsers error:', err);
  }
};

exports.sendPushToAdmins = async (payload) => {
  try {
    const messaging = getMessaging();
    if (!messaging) return;

    const admins = await db.findMany(
      `SELECT fcm_token FROM users WHERE role IN ('admin_super', 'admin_emergency') AND fcm_token IS NOT NULL`
    );
    const tokens = admins.map(u => u.fcmToken).filter(Boolean);
    if (tokens.length) {
      await messaging.sendEachForMulticast(buildMessage(tokens, payload));
    }
  } catch (err) {
    logger.error('FCM sendPushToAdmins error:', err);
  }
};

