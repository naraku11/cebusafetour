const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const prisma = require('../config/prisma');

// ── helpers ───────────────────────────────────────────────────────────────────
const monthRange = (offsetFromNow) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offsetFromNow, 1);
  const end   = new Date(now.getFullYear(), now.getMonth() - offsetFromNow + 1, 0, 23, 59, 59);
  return { start, end };
};

const monthLabel = (offsetFromNow) => {
  const d = new Date();
  d.setMonth(d.getMonth() - offsetFromNow);
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
};

// ── GET /reports/summary ─────────────────────────────────────────────────────
router.get('/summary', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [
      totalUsers, activeUsers, suspendedUsers, bannedUsers, newUsersThisMonth,
      totalAttractions, safeAttractions, cautionAttractions,
      totalIncidents, activeIncidents, resolvedIncidents, incidentsToday, incidentsThisMonth,
      totalAdvisories, activeAdvisories, criticalAdvisories,
    ] = await prisma.$transaction([
      prisma.user.count({ where: { role: 'tourist' } }),
      prisma.user.count({ where: { role: 'tourist', status: 'active' } }),
      prisma.user.count({ where: { role: 'tourist', status: 'suspended' } }),
      prisma.user.count({ where: { role: 'tourist', status: 'banned' } }),
      prisma.user.count({ where: { role: 'tourist', createdAt: { gte: monthStart } } }),
      prisma.attraction.count({ where: { status: 'published' } }),
      prisma.attraction.count({ where: { status: 'published', safetyStatus: 'safe' } }),
      prisma.attraction.count({ where: { status: 'published', safetyStatus: 'caution' } }),
      prisma.incident.count(),
      prisma.incident.count({ where: { status: { in: ['new', 'in_progress'] } } }),
      prisma.incident.count({ where: { status: 'resolved' } }),
      prisma.incident.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.incident.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.advisory.count(),
      prisma.advisory.count({ where: { status: 'active' } }),
      prisma.advisory.count({ where: { status: 'active', severity: 'critical' } }),
    ]);

    const resolveRate = totalIncidents > 0
      ? Math.round((resolvedIncidents / totalIncidents) * 100)
      : 0;

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
    const MONTHS = 6;
    const offsets = Array.from({ length: MONTHS }, (_, i) => MONTHS - 1 - i); // [5,4,3,2,1,0]

    const [incidentCounts, advisoryCounts, userCounts] = await Promise.all([
      Promise.all(offsets.map(o => {
        const { start, end } = monthRange(o);
        return prisma.incident.count({ where: { createdAt: { gte: start, lte: end } } });
      })),
      Promise.all(offsets.map(o => {
        const { start, end } = monthRange(o);
        return prisma.advisory.count({ where: { createdAt: { gte: start, lte: end } } });
      })),
      Promise.all(offsets.map(o => {
        const { start, end } = monthRange(o);
        return prisma.user.count({ where: { role: 'tourist', createdAt: { gte: start, lte: end } } });
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
    const where = {};
    if (type)   where.type   = type;
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [incidents, total, byType, byStatus] = await prisma.$transaction([
      prisma.incident.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.incident.count({ where }),
      prisma.incident.groupBy({ by: ['type'],   _count: { _all: true }, where }),
      prisma.incident.groupBy({ by: ['status'], _count: { _all: true }, where }),
    ]);

    res.json({
      incidents, total,
      byType:   byType.map(r => ({ type: r.type, count: r._count._all })),
      byStatus: byStatus.map(r => ({ status: r.status, count: r._count._all })),
    });
  } catch (err) { next(err); }
});

// ── GET /reports/advisories ──────────────────────────────────────────────────
router.get('/advisories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [bySeverity, byStatus, recent, total] = await prisma.$transaction([
      prisma.advisory.groupBy({ by: ['severity'], _count: { _all: true } }),
      prisma.advisory.groupBy({ by: ['status'],   _count: { _all: true } }),
      prisma.advisory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, title: true, severity: true, status: true, createdAt: true, location: true },
      }),
      prisma.advisory.count(),
    ]);

    res.json({
      total,
      bySeverity: bySeverity.map(r => ({ severity: r.severity, count: r._count._all })),
      byStatus:   byStatus.map(r => ({ status: r.status, count: r._count._all })),
      recent,
    });
  } catch (err) { next(err); }
});

// ── GET /reports/attractions ─────────────────────────────────────────────────
router.get('/attractions', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [attractions, byCategory, bySafety] = await prisma.$transaction([
      prisma.attraction.findMany({
        where: { status: 'published' },
        select: {
          id: true, name: true, category: true, district: true,
          totalVisits: true, totalSaves: true, averageRating: true, safetyStatus: true,
        },
        orderBy: { totalVisits: 'desc' },
        take: 50,
      }),
      prisma.attraction.groupBy({ by: ['category'],    _count: { _all: true }, where: { status: 'published' } }),
      prisma.attraction.groupBy({ by: ['safetyStatus'], _count: { _all: true }, where: { status: 'published' } }),
    ]);

    res.json({
      attractions,
      byCategory: byCategory.map(r => ({ category: r.category, count: r._count._all })),
      bySafety:   bySafety.map(r => ({ safety: r.safetyStatus, count: r._count._all })),
    });
  } catch (err) { next(err); }
});

// ── GET /reports/users-summary ───────────────────────────────────────────────
router.get('/users-summary', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [byNationality, verified, unverified] = await prisma.$transaction([
      prisma.user.groupBy({
        by: ['nationality'],
        where: { role: 'tourist', nationality: { not: null } },
        _count: { nationality: true },
        orderBy: { _count: { nationality: 'desc' } },
        take: 10,
      }),
      prisma.user.count({ where: { role: 'tourist', isVerified: true } }),
      prisma.user.count({ where: { role: 'tourist', isVerified: false } }),
    ]);

    res.json({
      byNationality: byNationality
        .filter(r => r.nationality)
        .map(r => ({ name: r.nationality, count: r._count.nationality })),
      verification: { verified, unverified },
    });
  } catch (err) { next(err); }
});

module.exports = router;
