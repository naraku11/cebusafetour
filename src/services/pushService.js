// OneSignal REST API — background push delivery for all 3 notification channels.
//
// Channel mapping (matches Android channels created in notification_service.dart):
//   cebusafetour_emergency  → IMPORTANCE_MAX  (heads-up floating card)
//   cebusafetour_alerts     → IMPORTANCE_HIGH (status-bar banner slide-in)
//   cebusafetour_info       → IMPORTANCE_DEFAULT (drawer only, silent)
//
// Set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in .env
// Get both from: https://app.onesignal.com → Your App → Keys & IDs
const logger = require('../utils/logger');

const APP_ID  = process.env.ONESIGNAL_APP_ID;
const API_KEY = process.env.ONESIGNAL_REST_API_KEY;

const _channelFor = (data = {}) => {
  if (data.severity === 'critical' || data.priority === 'high' || data.type === 'emergency') {
    return 'cebusafetour_emergency';
  }
  if (data.type === 'advisory' || data.type === 'safety_alert' || data.severity === 'warning') {
    return 'cebusafetour_alerts';
  }
  return 'cebusafetour_info';
};

const _post = async (payload) => {
  if (!APP_ID || !API_KEY) {
    logger.warn('OneSignal credentials missing — push skipped');
    return;
  }
  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OneSignal ${res.status}: ${text}`);
  }
};

// ── Send to all subscribers ────────────────────────────────────────────────
exports.sendToAll = async ({ title, body, data = {} }) => {
  try {
    await _post({
      app_id: APP_ID,
      included_segments: ['All'],
      headings:  { en: title },
      contents:  { en: body },
      data,
      android_channel_id: _channelFor(data),
      priority:  10,
    });
    logger.info(`OneSignal push → All: "${title}"`);
  } catch (err) {
    logger.error('OneSignal sendToAll:', err.message);
  }
};

// ── Send to users with a specific nationality tag ─────────────────────────
exports.sendToNationality = async (nationality, { title, body, data = {} }) => {
  try {
    await _post({
      app_id: APP_ID,
      filters: [{ field: 'tag', key: 'nationality', relation: '=', value: nationality }],
      headings:  { en: title },
      contents:  { en: body },
      data,
      android_channel_id: _channelFor(data),
      priority:  10,
    });
    logger.info(`OneSignal push → nationality "${nationality}": "${title}"`);
  } catch (err) {
    logger.error('OneSignal sendToNationality:', err.message);
  }
};

// ── Send to specific users by their app user ID (external_id) ─────────────
exports.sendToUsers = async (userIds, { title, body, data = {} }) => {
  if (!userIds?.length) return;
  try {
    await _post({
      app_id: APP_ID,
      include_aliases: { external_id: userIds },
      target_channel: 'push',
      headings:  { en: title },
      contents:  { en: body },
      data,
      android_channel_id: _channelFor(data),
      priority:  10,
    });
    logger.info(`OneSignal push → ${userIds.length} user(s): "${title}"`);
  } catch (err) {
    logger.error('OneSignal sendToUsers:', err.message);
  }
};
