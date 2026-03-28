const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const db = require('../config/db');

// ── helpers ───────────────────────────────────────────────────────────────────
const monthRange = (offsetFromNow) => {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offsetFromNow, 1);
  const end   = new Date(now.getFullYear(), now.getMonth() - offsetFromNow + 1, 0, 23, 59, 59);
  return { start, end };
};

const monthLabel = (offsetFromNow) => {
  const d = new Date();
  d.setMonth(d.getMonth() - offsetFromNow);
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
};

const count = (sql, params = []) => db.findOne(sql, params).then(r => r.n);

// ── GET /reports/summary ─────────────────────────────────────────────────────
// Consolidated: 16 COUNT queries → 4 grouped queries (one per table)
router.get('/summary', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [userStats, attrStats, incidentStats, advisoryStats] = await Promise.all([
      db.findOne(
        `SELECT
           COUNT(*) as total,
           SUM(status = 'active') as active,
           SUM(status = 'suspended') as suspended,
           SUM(status = 'banned') as banned,
           SUM(created_at >= ?) as newThisMonth
         FROM users WHERE role = 'tourist'`,
        [monthStart]
      ),
      db.findOne(
        `SELECT
           COUNT(*) as total,
           SUM(safety_status = 'safe') as safe,
           SUM(safety_status = 'caution') as caution
         FROM attractions WHERE status = 'published'`
      ),
      db.findOne(
        `SELECT
           COUNT(*) as total,
           SUM(status IN ('new', 'in_progress')) as active,
           SUM(status = 'resolved') as resolved,
           SUM(created_at >= ?) as today,
           SUM(created_at >= ?) as thisMonth
         FROM incidents`,
        [todayStart, monthStart]
      ),
      db.findOne(
        `SELECT
           COUNT(*) as total,
           SUM(status = 'active') as active,
           SUM(status = 'active' AND severity = 'critical') as critical
         FROM advisories`
      ),
    ]);

    const totalIncidents = Number(incidentStats.total);
    const resolvedIncidents = Number(incidentStats.resolved);
    const resolveRate = totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0;

    res.json({
      users:       { total: Number(userStats.total), active: Number(userStats.active), suspended: Number(userStats.suspended), banned: Number(userStats.banned), newThisMonth: Number(userStats.newThisMonth) },
      attractions: { total: Number(attrStats.total), safe: Number(attrStats.safe), caution: Number(attrStats.caution), danger: Number(attrStats.total) - Number(attrStats.safe) - Number(attrStats.caution) },
      incidents:   { total: totalIncidents, active: Number(incidentStats.active), resolved: resolvedIncidents, today: Number(incidentStats.today), thisMonth: Number(incidentStats.thisMonth), resolveRate },
      advisories:  { total: Number(advisoryStats.total), active: Number(advisoryStats.active), critical: Number(advisoryStats.critical) },
    });
  } catch (err) { next(err); }
});

// ── GET /reports/trends ──────────────────────────────────────────────────────
// Consolidated: 18 queries → 3 (one per table with GROUP BY month)
router.get('/trends', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const MONTHS  = 6;
    const offsets = Array.from({ length: MONTHS }, (_, i) => MONTHS - 1 - i); // [5,4,3,2,1,0]
    const { start: rangeStart } = monthRange(MONTHS - 1);
    const { end: rangeEnd } = monthRange(0);

    const [incidentRows, advisoryRows, userRows] = await Promise.all([
      db.findMany(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as m, COUNT(*) as n
         FROM incidents WHERE created_at >= ? AND created_at <= ?
         GROUP BY m ORDER BY m`,
        [rangeStart, rangeEnd]
      ),
      db.findMany(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as m, COUNT(*) as n
         FROM advisories WHERE created_at >= ? AND created_at <= ?
         GROUP BY m ORDER BY m`,
        [rangeStart, rangeEnd]
      ),
      db.findMany(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as m, COUNT(*) as n
         FROM users WHERE role = 'tourist' AND created_at >= ? AND created_at <= ?
         GROUP BY m ORDER BY m`,
        [rangeStart, rangeEnd]
      ),
    ]);

    // Build month keys for the 6-month window and fill counts (default 0)
    const monthKeys = offsets.map(o => {
      const { start } = monthRange(o);
      return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    });
    const toCountMap = (rows) => {
      const map = {};
      for (const r of rows) map[r.m] = Number(r.n);
      return monthKeys.map(k => map[k] || 0);
    };

    res.json({
      labels:     offsets.map(o => monthLabel(o)),
      incidents:  toCountMap(incidentRows),
      advisories: toCountMap(advisoryRows),
      users:      toCountMap(userRows),
    });
  } catch (err) { next(err); }
});

// ── GET /reports/incidents ───────────────────────────────────────────────────
router.get('/incidents', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { from, to, type, status, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const conditions = [];
    const params     = [];
    if (type)   { conditions.push('type = ?');   params.push(type); }
    if (status) { conditions.push('status = ?'); params.push(status); }
    if (from)   { conditions.push('created_at >= ?'); params.push(new Date(from)); }
    if (to)     { conditions.push('created_at <= ?'); params.push(new Date(to)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [incidents, total, byType, byStatus] = await Promise.all([
      db.findMany(`SELECT id, type, description, latitude, longitude, nearest_landmark, reported_by, status, assigned_to, resolved_at, created_at, updated_at FROM incidents ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, take, skip]),
      count(`SELECT COUNT(*) as n FROM incidents ${where}`, params),
      db.findMany(`SELECT type, COUNT(*) as n FROM incidents ${where} GROUP BY type`, params),
      db.findMany(`SELECT status, COUNT(*) as n FROM incidents ${where} GROUP BY status`, params),
    ]);

    res.json({
      incidents, total,
      byType:   byType.map(r => ({ type: r.type, count: r.n })),
      byStatus: byStatus.map(r => ({ status: r.status, count: r.n })),
    });
  } catch (err) { next(err); }
});

// ── GET /reports/advisories ──────────────────────────────────────────────────
router.get('/advisories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [bySeverity, byStatus, recent, total] = await Promise.all([
      db.findMany('SELECT severity, COUNT(*) as n FROM advisories GROUP BY severity'),
      db.findMany('SELECT status, COUNT(*) as n FROM advisories GROUP BY status'),
      db.findMany(
        `SELECT id, title, severity, status, created_at FROM advisories ORDER BY created_at DESC LIMIT 15`
      ),
      count('SELECT COUNT(*) as n FROM advisories'),
    ]);

    res.json({
      total,
      bySeverity: bySeverity.map(r => ({ severity: r.severity, count: r.n })),
      byStatus:   byStatus.map(r => ({ status: r.status, count: r.n })),
      recent,
    });
  } catch (err) { next(err); }
});

// ── GET /reports/attractions ─────────────────────────────────────────────────
router.get('/attractions', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [attractions, byCategory, bySafety] = await Promise.all([
      db.findMany(
        `SELECT id, name, category, district, total_visits, total_saves, average_rating, safety_status
         FROM attractions WHERE status = 'published' ORDER BY total_visits DESC LIMIT 50`
      ),
      db.findMany(`SELECT category, COUNT(*) as n FROM attractions WHERE status = 'published' GROUP BY category`),
      db.findMany(`SELECT safety_status, COUNT(*) as n FROM attractions WHERE status = 'published' GROUP BY safety_status`),
    ]);

    res.json({
      attractions,
      byCategory: byCategory.map(r => ({ category: r.category, count: r.n })),
      bySafety:   bySafety.map(r => ({ safety: r.safetyStatus, count: r.n })),
    });
  } catch (err) { next(err); }
});

// ── GET /reports/users-summary ───────────────────────────────────────────────
router.get('/users-summary', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [byNationality, verified, unverified] = await Promise.all([
      db.findMany(
        `SELECT nationality, COUNT(*) as n FROM users
         WHERE role = 'tourist' AND nationality IS NOT NULL
         GROUP BY nationality ORDER BY n DESC LIMIT 10`
      ),
      count(`SELECT COUNT(*) as n FROM users WHERE role = 'tourist' AND is_verified = 1`),
      count(`SELECT COUNT(*) as n FROM users WHERE role = 'tourist' AND is_verified = 0`),
    ]);

    res.json({
      byNationality: byNationality
        .filter(r => r.nationality)
        .map(r => ({ name: r.nationality, count: r.n })),
      verification: { verified, unverified },
    });
  } catch (err) { next(err); }
});

module.exports = router;
