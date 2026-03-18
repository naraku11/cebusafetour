const prisma = require('../config/prisma');
const { sendPushToAll } = require('../services/fcmService');
const { suggestByCoords } = require('../services/aiService');
const { fetchPlacePhotos } = require('../services/placesService');

exports.list = async (req, res, next) => {
  try {
    const { category, district, safetyStatus, status = 'published', search, page = 1, limit = 20 } = req.query;
    const where = { status };
    if (category) where.category = category;
    if (district) where.district = { contains: district, mode: 'insensitive' };
    if (safetyStatus) where.safetyStatus = safetyStatus;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [attractions, total] = await prisma.$transaction([
      prisma.attraction.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      prisma.attraction.count({ where }),
    ]);

    res.json({ attractions, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const attraction = await prisma.attraction.findUnique({ where: { id: req.params.id } });
    if (!attraction) return res.status(404).json({ error: 'Attraction not found' });

    await prisma.attraction.update({
      where: { id: attraction.id },
      data: { totalVisits: { increment: 1 } },
    });
    res.json({ attraction });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const attraction = await prisma.attraction.create({
      data: { ...req.body, createdBy: req.user.id },
    });

    // Auto-fetch photos from Google Places when none were provided
    if (!req.body.photos?.length && attraction.name) {
      fetchPlacePhotos(attraction.name).then(async (urls) => {
        if (urls.length) {
          await prisma.attraction.update({
            where: { id: attraction.id },
            data: { photos: urls },
          });
        }
      }).catch(() => {}); // fire-and-forget — don't fail the creation
    }

    res.status(201).json({ attraction });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await prisma.attraction.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Attraction not found' });

    const attraction = await prisma.attraction.update({
      where: { id: req.params.id },
      data: req.body,
    });

    if (req.body.safetyStatus && req.body.safetyStatus !== existing.safetyStatus) {
      await sendPushToAll({
        title: `Safety Status Update — ${attraction.name}`,
        body: `Status changed to: ${req.body.safetyStatus.toUpperCase()}`,
        data: { type: 'safety_status', attractionId: attraction.id },
      });
    }
    res.json({ attraction });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const existing = await prisma.attraction.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Attraction not found' });
    await prisma.attraction.update({ where: { id: req.params.id }, data: { status: 'archived' } });
    res.json({ message: 'Attraction archived' });
  } catch (err) { next(err); }
};

exports.destroy = async (req, res, next) => {
  try {
    const existing = await prisma.attraction.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Attraction not found' });
    await prisma.attraction.delete({ where: { id: req.params.id } });
    res.json({ message: 'Attraction permanently deleted' });
  } catch (err) { next(err); }
};

exports.nearby = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    const attractions = await prisma.$queryRaw`
      SELECT *, (
        6371 * acos(
          cos(radians(${parseFloat(lat)})) * cos(radians(latitude))
          * cos(radians(longitude) - radians(${parseFloat(lng)}))
          + sin(radians(${parseFloat(lat)})) * sin(radians(latitude))
        )
      ) AS distance
      FROM attractions
      WHERE status = 'published'
      HAVING distance <= ${parseFloat(radius)}
      ORDER BY distance
      LIMIT 20
    `;
    res.json({ attractions });
  } catch (err) { next(err); }
};

exports.refreshPhotos = async (req, res, next) => {
  try {
    const attraction = await prisma.attraction.findUnique({ where: { id: req.params.id } });
    if (!attraction) return res.status(404).json({ error: 'Attraction not found' });

    const urls = await fetchPlacePhotos(attraction.name);
    if (!urls.length) return res.status(404).json({ error: 'No photos found on Google Places for this attraction' });

    const updated = await prisma.attraction.update({
      where: { id: req.params.id },
      data: { photos: urls },
    });
    res.json({ attraction: updated, count: urls.length });
  } catch (err) {
    if (err.code === 'NO_MAPS_KEY') return res.status(503).json({ error: err.message, hint: 'Set GOOGLE_MAPS_API_KEY in .env' });
    next(err);
  }
};

exports.aiSuggest = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'Valid latitude and longitude are required' });

    const suggestion = await suggestByCoords(lat, lng);
    res.json({ suggestion });
  } catch (err) {
    // Always return a friendly JSON error — never pass AI errors to the global handler
    if (err.code === 'NO_API_KEY') {
      return res.status(503).json({
        error: 'OpenAI API key not configured.',
        hint:  'Set OPENAI_API_KEY in .env — get a key at https://platform.openai.com/api-keys',
      });
    }
    if (err.code === 'OPENAI_AUTH') {
      return res.status(401).json({ error: err.message });
    }
    if (err.code === 'QUOTA_EXCEEDED') {
      return res.status(429).json({
        error: err.message,
        hint:  err.isQuota
          ? 'Add credits at https://platform.openai.com/settings/billing/overview'
          : 'Wait a few seconds and try again.',
      });
    }
    if (err.code === 'OPENAI_TIMEOUT') {
      return res.status(504).json({ error: err.message });
    }
    if (err.code === 'OPENAI_ERROR' || err.code === 'OPENAI_NETWORK') {
      return res.status(502).json({ error: err.message || 'ChatGPT error' });
    }
    if (err.code === 'OUTSIDE_CEBU') {
      return res.status(422).json({
        error: err.message,
        hint:  'Only attractions within Cebu Province are supported.',
      });
    }
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: 'AI returned invalid JSON — try again' });
    }
    return res.status(502).json({ error: err.message || 'AI suggestion failed' });
  }
};
