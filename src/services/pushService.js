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
const CH_EMERGENCY = process.env.ONESIGNAL_ANDROID_CHANNEL_ID_EMERGENCY || null;
const CH_ALERTS    = process.env.ONESIGNAL_ANDROID_CHANNEL_ID_ALERTS || null;
const CH_INFO      = process.env.ONESIGNAL_ANDROID_CHANNEL_ID_INFO || null;
const _recentAttempts = [];
const _maxAttempts = 20;

const _channelFor = (data = {}) => {
  if (data.severity === 'critical' || data.priority === 'high' || data.type === 'emergency') {
    return CH_EMERGENCY;
  }
  if (data.type === 'advisory' || data.type === 'safety_alert' || data.severity === 'warning') {
    return CH_ALERTS;
  }
  return CH_INFO;
};

const _post = async (payload) => {
  if (!APP_ID || !API_KEY) {
    const evt = {
      at: new Date().toISOString(),
      ok: false,
      reason: 'missing_credentials',
      target: payload?.included_segments ? 'all' : payload?.filters ? 'nationality' : 'specific',
      title: payload?.headings?.en ?? null,
    };
    _recentAttempts.unshift(evt);
    _recentAttempts.length = Math.min(_recentAttempts.length, _maxAttempts);
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
  return res.json().catch(() => ({}));
};

const _sendWithChannelFallback = async (payload) => {
  try {
    return await _post(payload);
  } catch (err) {
    const msg = String(err?.message || '');
    const badChannel = msg.includes('Could not find android_channel_id');
    if (badChannel && payload?.android_channel_id) {
      const { android_channel_id, ...withoutChannel } = payload;
      logger.warn(`OneSignal channel "${android_channel_id}" invalid; retrying without android_channel_id`);
      return _post(withoutChannel);
    }
    throw err;
  }
};

// ── Send to all subscribers ────────────────────────────────────────────────
exports.sendToAll = async ({ title, body, data = {} }) => {
  try {
    const finalChannelId = _channelFor(data);
    const out = await _sendWithChannelFallback({
      app_id: APP_ID,
      included_segments: ['All'],
      headings:  { en: title },
      contents:  { en: body },
      data,
      ...(finalChannelId ? { android_channel_id: finalChannelId } : {}),
      priority:  10,
    });
    _recentAttempts.unshift({
      at: new Date().toISOString(),
      ok: true,
      target: 'all',
      title,
      oneSignalId: out?.id ?? null,
    });
    _recentAttempts.length = Math.min(_recentAttempts.length, _maxAttempts);
    logger.info(`OneSignal push → All: "${title}"`);
  } catch (err) {
    _recentAttempts.unshift({
      at: new Date().toISOString(),
      ok: false,
      target: 'all',
      title,
      error: err.message,
    });
    _recentAttempts.length = Math.min(_recentAttempts.length, _maxAttempts);
    logger.error('OneSignal sendToAll:', err.message);
  }
};

// ── Send to users with a specific nationality tag ─────────────────────────
exports.sendToNationality = async (nationality, { title, body, data = {} }) => {
  try {
    const finalChannelId = _channelFor(data);
    const out = await _sendWithChannelFallback({
      app_id: APP_ID,
      filters: [{ field: 'tag', key: 'nationality', relation: '=', value: nationality }],
      headings:  { en: title },
      contents:  { en: body },
      data,
      ...(finalChannelId ? { android_channel_id: finalChannelId } : {}),
      priority:  10,
    });
    _recentAttempts.unshift({
      at: new Date().toISOString(),
      ok: true,
      target: 'nationality',
      value: nationality,
      title,
      oneSignalId: out?.id ?? null,
    });
    _recentAttempts.length = Math.min(_recentAttempts.length, _maxAttempts);
    logger.info(`OneSignal push → nationality "${nationality}": "${title}"`);
  } catch (err) {
    _recentAttempts.unshift({
      at: new Date().toISOString(),
      ok: false,
      target: 'nationality',
      value: nationality,
      title,
      error: err.message,
    });
    _recentAttempts.length = Math.min(_recentAttempts.length, _maxAttempts);
    logger.error('OneSignal sendToNationality:', err.message);
  }
};

// ── Send to specific users by their app user ID (external_id) ─────────────
exports.sendToUsers = async (userIds, { title, body, data = {} }) => {
  if (!userIds?.length) return;
  try {
    const finalChannelId = _channelFor(data);
    const out = await _sendWithChannelFallback({
      app_id: APP_ID,
      include_aliases: { external_id: userIds },
      target_channel: 'push',
      headings:  { en: title },
      contents:  { en: body },
      data,
      ...(finalChannelId ? { android_channel_id: finalChannelId } : {}),
      priority:  10,
    });
    _recentAttempts.unshift({
      at: new Date().toISOString(),
      ok: true,
      target: 'specific',
      value: userIds.length,
      title,
      oneSignalId: out?.id ?? null,
    });
    _recentAttempts.length = Math.min(_recentAttempts.length, _maxAttempts);
    logger.info(`OneSignal push → ${userIds.length} user(s): "${title}"`);
  } catch (err) {
    _recentAttempts.unshift({
      at: new Date().toISOString(),
      ok: false,
      target: 'specific',
      value: userIds.length,
      title,
      error: err.message,
    });
    _recentAttempts.length = Math.min(_recentAttempts.length, _maxAttempts);
    logger.error('OneSignal sendToUsers:', err.message);
  }
};

exports.getDiagnostics = () => ({
  configured: Boolean(APP_ID && API_KEY),
  appId: APP_ID || null,
  hasRestKey: Boolean(API_KEY),
  androidChannels: {
    emergency: CH_EMERGENCY,
    alerts: CH_ALERTS,
    info: CH_INFO,
  },
  recentAttempts: [..._recentAttempts],
});

exports.clearDiagnostics = () => {
  _recentAttempts.length = 0;
};
