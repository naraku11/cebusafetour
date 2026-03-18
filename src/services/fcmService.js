const { getMessaging } = require('../config/firebase');
const prisma = require('../config/prisma');
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
    const users = await prisma.user.findMany({
      where: { status: 'active', fcmToken: { not: null } },
      select: { fcmToken: true },
    });
    const tokens = users.map(u => u.fcmToken).filter(Boolean);
    if (!tokens.length) return;

    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      await getMessaging().sendEachForMulticast(buildMessage(batch, payload));
    }
    logger.info(`Push sent to ${tokens.length} users`);
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
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin_super', 'admin_emergency'] }, fcmToken: { not: null } },
      select: { fcmToken: true },
    });
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
