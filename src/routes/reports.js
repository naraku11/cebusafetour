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
router.get('/summary', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [
      totalUsers, activeUsers, suspendedUsers, bannedUsers, newUsersThisMonth,
      totalAttractions, safeAttractions, cautionAttractions,
      totalIncidents, activeIncidents, resolvedIncidents, incidentsToday, incidentsThisMonth,
      totalAdvisories, activeAdvisories, criticalAdvisories,
    ] = await Promise.all([
      count(`SELECT COUNT(*) as n FROM users WHERE role = 'tourist'`),
      count(`SELECT COUNT(*) as n FROM users WHERE role = 'tourist' AND status = 'active'`),
      count(`SELECT COUNT(*) as n FROM users WHERE role = 'tourist' AND status = 'suspended'`),
      count(`SELECT COUNT(*) as n FROM users WHERE role = 'tourist' AND status = 'banned'`),
      count(`SELECT COUNT(*) as n FROM users WHERE role = 'tourist' AND created_at >= ?`, [monthStart]),
      count(`SELECT COUNT(*) as n FROM attractions WHERE status = 'published'`),
      count(`SELECT COUNT(*) as n FROM attractions WHERE status = 'published' AND safety_status = 'safe'`),
      count(`SELECT COUNT(*) as n FROM attractions WHERE status = 'published' AND safety_status = 'caution'`),
      count(`SELECT COUNT(*) as n FROM incidents`),
      count(`SELECT COUNT(*) as n FROM incidents WHERE status IN ('new', 'in_progress')`),
      count(`SELECT COUNT(*) as n FROM incidents WHERE status = 'resolved'`),
      count(`SELECT COUNT(*) as n FROM incidents WHERE created_at >= ?`, [todayStart]),
      count(`SELECT COUNT(*) as n FROM incidents WHERE created_at >= ?`, [monthStart]),
      count(`SELECT COUNT(*) as n FROM advisories`),
      count(`SELECT COUNT(*) as n FROM advisories WHERE status = 'active'`),
      count(`SELECT COUNT(*) as n FROM advisories WHERE status = 'active' AND severity = 'critical'`),
    ]);

    const resolveRate = totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0;

    res.json({
      users:       { total: totalUsers, active: activeUsers, suspended: suspendedUsers, banned: bannedUsers, newThisMonth: newUsersThisMonth },
      attractions: { total: totalAttractions, safe: safeAttractions, caution: cautionAttractions, danger: totalAttractions - safeAttractions - cautionAttractions },
      incidents:   { total: totalIncidents, active: activeIncidents, resolved: resolvedIncidents, today: incidentsToday, thisMonth: incidentsThisMonth, resolveRate },
      advisories:  { total: totalAdvisories, active: activeAdvisories, critical: criticalAdvisories },
    });
  } catch (err) { next(err); }
});

// ── GET /reports/trends ──────────────────────────────────────────────────────
router.get('/trends', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const MONTHS  = 6;
    const offsets = Array.from({ length: MONTHS }, (_, i) => MONTHS - 1 - i); // [5,4,3,2,1,0]

    const [incidentCounts, advisoryCounts, userCounts] = await Promise.all([
      Promise.all(offsets.map(o => {
        const { start, end } = monthRange(o);
        return count('SELECT COUNT(*) as n FROM incidents WHERE created_at >= ? AND created_at <= ?', [start, end]);
      })),
      Promise.all(offsets.map(o => {
        const { start, end } = monthRange(o);
        return count('SELECT COUNT(*) as n FROM advisories WHERE created_at >= ? AND created_at <= ?', [start, end]);
      })),
      Promise.all(offsets.map(o => {
        const { start, end } = monthRange(o);
        return count(`SELECT COUNT(*) as n FROM users WHERE role = 'tourist' AND created_at >= ? AND created_at <= ?`, [start, end]);
      })),
    ]);

    res.json({
      labels:     offsets.map(o => monthLabel(o)),
      incidents:  incidentCounts,
      advisories: advisoryCounts,
      users:      userCounts,
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
      db.findMany(`SELECT * FROM incidents ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, take, skip]),
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
