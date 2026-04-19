// ── /api/meta — Dynamic Named Ranges ─────────────────────────────────────
// Single source of truth for every categorical/enum value used across the
// system.  Changing a range here (e.g. adding a new advisory source) is
// automatically reflected in the admin panel and mobile app without any
// additional code changes.
//
// The response is intentionally static and public so both the React admin
// and Flutter mobile can cache it with stale-time = Infinity.

exports.getMeta = (_req, res) => {
  res.json({
    advisory: {
      severities: ['critical', 'warning', 'advisory'],
      sources:    ['pagasa', 'ndrrmc', 'lgu', 'cdrrmo', 'admin'],
      statuses:   ['active', 'resolved', 'archived'],
    },
    attraction: {
      categories:    ['beach', 'mountain', 'heritage', 'museum', 'park', 'waterfall', 'market', 'church', 'resort', 'other'],
      safetyStatuses:['safe', 'caution', 'restricted'],
      crowdLevels:   ['low', 'moderate', 'high'],
      statuses:      ['published', 'draft', 'archived'],
    },
    notification: {
      types:     ['safety_alert', 'advisory', 'trip_reminder', 'announcement', 'emergency'],
      priorities:['normal', 'high'],
      statuses:  ['pending', 'sent', 'failed'],
    },
    user: {
      roles:      ['tourist', 'admin_super', 'admin_content', 'admin_emergency'],
      staffRoles: ['admin_content', 'admin_emergency'],
      statuses:   ['active', 'suspended', 'banned', 'archived'],
      languages:  ['en', 'fil', 'zh', 'ko', 'ja'],
    },
    incident: {
      types:   ['medical', 'fire', 'crime', 'natural_disaster', 'lost_person'],
      statuses:['new', 'in_progress', 'resolved', 'archived'],
    },
  });
};
