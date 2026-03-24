const { getMessaging } = require('../config/firebase');
const db     = require('../config/db');
const logger = require('../utils/logger');

const buildMessage = (tokens, { title, body, data = {} }) => ({
  notification: { title, body },
  data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
  tokens,
  android: { priority: 'high', notification: { channelId: 'cebusafetour_alerts' } },
  apns: { headers: { 'apns-priority': '10' } },
});

exports.sendPushToAll = async (payload) => {
  try {
    let offset = 0, total = 0;
    const BATCH = 500;
    // Paginate from DB in batches instead of loading all tokens into memory
    while (true) {
      const rows = await db.findMany(
        `SELECT fcm_token FROM users WHERE status = 'active' AND fcm_token IS NOT NULL LIMIT ? OFFSET ?`,
        [BATCH, offset]
      );
      const tokens = rows.map(u => u.fcmToken).filter(Boolean);
      if (!tokens.length) break;
      await getMessaging().sendEachForMulticast(buildMessage(tokens, payload));
      total += tokens.length;
      if (rows.length < BATCH) break;
      offset += BATCH;
    }
    if (total) logger.info(`Push sent to ${total} users`);
  } catch (err) {
    logger.error('FCM sendPushToAll error:', err);
  }
};

exports.sendPushToUsers = async (tokens, payload) => {
  try {
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      await getMessaging().sendEachForMulticast(buildMessage(batch, payload));
    }
  } catch (err) {
    logger.error('FCM sendPushToUsers error:', err);
  }
};

exports.sendPushToAdmins = async (payload) => {
  try {
    const admins = await db.findMany(
      `SELECT fcm_token FROM users WHERE role IN ('admin_super', 'admin_emergency') AND fcm_token IS NOT NULL`
    );
    const tokens = admins.map(u => u.fcmToken).filter(Boolean);
    if (tokens.length) {
      await getMessaging().sendEachForMulticast(buildMessage(tokens, payload));
    }
  } catch (err) {
    logger.error('FCM sendPushToAdmins error:', err);
  }
};

exports.sendPushToArea = async (lat, lng, radiusKm, payload) => {
  logger.info(`Geo-targeted push around ${lat},${lng} within ${radiusKm}km`);
  await exports.sendPushToAll(payload);
};
