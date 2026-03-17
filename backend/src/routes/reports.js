const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const prisma = require('../config/prisma');

router.get('/summary', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalUsers, totalAttractions, totalIncidents, activeAdvisories, incidentsToday] =
      await prisma.$transaction([
        prisma.user.count({ where: { role: 'tourist' } }),
        prisma.attraction.count({ where: { status: 'published' } }),
        prisma.incident.count(),
        prisma.advisory.count({ where: { status: 'active' } }),
        prisma.incident.count({ where: { createdAt: { gte: todayStart } } }),
      ]);

    res.json({ totalUsers, totalAttractions, totalIncidents, activeAdvisories, incidentsToday });
  } catch (err) { next(err); }
});

router.get('/incidents', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { from, to, type, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [incidents, total] = await prisma.$transaction([
      prisma.incident.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.incident.count({ where }),
    ]);

    res.json({ incidents, total });
  } catch (err) { next(err); }
});

router.get('/attractions', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const attractions = await prisma.attraction.findMany({
      where: { status: 'published' },
      select: {
        id: true, name: true, category: true,
        totalVisits: true, totalSaves: true,
        averageRating: true, safetyStatus: true,
      },
      orderBy: { totalVisits: 'desc' },
      take: 50,
    });
    res.json({ attractions });
  } catch (err) { next(err); }
});

module.exports = router;
