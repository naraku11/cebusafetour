const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { sendPushToAll } = require('../services/fcmService');
const { suggestByCoords } = require('../services/aiService');
const { fetchPlacePhotos } = require('../services/placesService');

// JSON fields that must be stringified before writing to DB
const JSON_FIELDS = new Set(['photos', 'operatingHours', 'contactInfo', 'accessibilityFeatures', 'nearbyFacilities']);

// camelCase → snake_case column map for attractions
const COL_MAP = {
  name: 'name', category: 'category', description: 'description',
  district: 'district', address: 'address',
  latitude: 'latitude', longitude: 'longitude',
  photos: 'photos', operatingHours: 'operating_hours', entranceFee: 'entrance_fee',
  contactInfo: 'contact_info', safetyStatus: 'safety_status', crowdLevel: 'crowd_level',
  accessibilityFeatures: 'accessibility_features', nearbyFacilities: 'nearby_facilities',
  averageRating: 'average_rating', totalReviews: 'total_reviews',
  totalVisits: 'total_visits', totalSaves: 'total_saves', status: 'status',
};

exports.list = async (req, res, next) => {
  try {
    const { category, district, safetyStatus, status = 'published', search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const conditions = ['status = ?'];
    const params     = [status];

    if (category)    { conditions.push('category = ?');         params.push(category); }
    if (district)    { conditions.push('district LIKE ?');      params.push(`%${district}%`); }
    if (safetyStatus){ conditions.push('safety_status = ?');    params.push(safetyStatus); }
    if (search)      { conditions.push('name LIKE ?');          params.push(`%${search}%`); }

    const where = conditions.join(' AND ');

    const [attractions, countRow] = await Promise.all([
      db.findMany(
        `SELECT * FROM attractions WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
        [...params, take, skip]
      ),
      db.findOne(`SELECT COUNT(*) as n FROM attractions WHERE ${where}`, params),
    ]);

    res.json({ attractions, total: countRow.n, page: parseInt(page), totalPages: Math.ceil(countRow.n / take) });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const attraction = await db.findOne('SELECT * FROM attractions WHERE id = ? LIMIT 1', [req.params.id]);
    if (!attraction) return res.status(404).json({ error: 'Attraction not found' });

    // Fire-and-forget visit increment
    db.run('UPDATE attractions SET total_visits = total_visits + 1 WHERE id = ?', [attraction.id]).catch(() => {});

    res.json({ attraction });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const body = req.body;
    const id   = uuidv4();
    const now  = new Date();

    await db.run(
      `INSERT INTO attractions
         (id, name, category, description, district, address, latitude, longitude,
          photos, operating_hours, entrance_fee, contact_info, safety_status, crowd_level,
          accessibility_features, nearby_facilities, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.name, body.category,
        body.description ?? null, body.district ?? null, body.address ?? null,
        body.latitude, body.longitude,
        JSON.stringify(body.photos || []),
        JSON.stringify(body.operatingHours || {}),
        body.entranceFee ?? 0,
        JSON.stringify(body.contactInfo || {}),
        body.safetyStatus || 'safe',
        body.crowdLevel   || 'low',
        JSON.stringify(body.accessibilityFeatures || []),
        JSON.stringify(body.nearbyFacilities || {}),
        body.status || 'draft',
        req.user.id,
        now, now,
      ]
    );

    const attraction = await db.findOne('SELECT * FROM attractions WHERE id = ? LIMIT 1', [id]);

    // Auto-fetch photos from Google Places when none were provided
    if (!body.photos?.length && attraction.name) {
      fetchPlacePhotos(attraction.name).then(async (urls) => {
        if (urls.length) {
          await db.run('UPDATE attractions SET photos = ? WHERE id = ?', [JSON.stringify(urls), id]);
        }
      }).catch(() => {});
    }

    res.status(201).json({ attraction });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await db.findOne('SELECT * FROM attractions WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Attraction not found' });

    const sets   = [];
    const params = [];

    for (const [key, col] of Object.entries(COL_MAP)) {
      if (req.body[key] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(JSON_FIELDS.has(key) ? JSON.stringify(req.body[key]) : req.body[key]);
      }
    }

    if (sets.length) {
      sets.push('updated_at = ?');
      params.push(new Date(), req.params.id);
      await db.run(`UPDATE attractions SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    const attraction = await db.findOne('SELECT * FROM attractions WHERE id = ? LIMIT 1', [req.params.id]);

    if (req.body.safetyStatus && req.body.safetyStatus !== existing.safetyStatus) {
      await sendPushToAll({
        title: `Safety Status Update — ${attraction.name}`,
        body:  `Status changed to: ${req.body.safetyStatus.toUpperCase()}`,
        data:  { type: 'safety_status', attractionId: attraction.id },
      });
    }

    res.json({ attraction });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const existing = await db.findOne('SELECT id FROM attractions WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Attraction not found' });
    await db.run("UPDATE attractions SET status = 'archived', updated_at = ? WHERE id = ?", [new Date(), req.params.id]);
    res.json({ message: 'Attraction archived' });
  } catch (err) { next(err); }
};

exports.destroy = async (req, res, next) => {
  try {
    const existing = await db.findOne('SELECT id FROM attractions WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Attraction not found' });
    await db.run('DELETE FROM attractions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Attraction permanently deleted' });
  } catch (err) { next(err); }
};

exports.nearby = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    const uLat = parseFloat(lat);
    const uLng = parseFloat(lng);
    const r    = parseFloat(radius);

    const attractions = await db.findMany(
      `SELECT *, (
         6371 * acos(
           cos(radians(?)) * cos(radians(latitude))
           * cos(radians(longitude) - radians(?))
           + sin(radians(?)) * sin(radians(latitude))
         )
       ) AS distance
       FROM attractions
       WHERE status = 'published'
       HAVING distance <= ?
       ORDER BY distance
       LIMIT 20`,
      [uLat, uLng, uLat, r]
    );

    res.json({ attractions });
  } catch (err) { next(err); }
};

exports.refreshPhotos = async (req, res, next) => {
  try {
    const attraction = await db.findOne('SELECT id, name FROM attractions WHERE id = ? LIMIT 1', [req.params.id]);
    if (!attraction) return res.status(404).json({ error: 'Attraction not found' });

    const urls = await fetchPlacePhotos(attraction.name);
    if (!urls.length) return res.status(404).json({ error: 'No photos found on Google Places for this attraction' });

    await db.run('UPDATE attractions SET photos = ?, updated_at = ? WHERE id = ?', [JSON.stringify(urls), new Date(), req.params.id]);
    const updated = await db.findOne('SELECT * FROM attractions WHERE id = ? LIMIT 1', [req.params.id]);
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
    if (err.code === 'NO_API_KEY')     return res.status(503).json({ error: 'OpenAI API key not configured.', hint: 'Set OPENAI_API_KEY in .env — get a key at https://platform.openai.com/api-keys' });
    if (err.code === 'OPENAI_AUTH')    return res.status(401).json({ error: err.message });
    if (err.code === 'QUOTA_EXCEEDED') return res.status(429).json({ error: err.message, hint: err.isQuota ? 'Add credits at https://platform.openai.com/settings/billing/overview' : 'Wait a few seconds and try again.' });
    if (err.code === 'OPENAI_TIMEOUT') return res.status(504).json({ error: err.message });
    if (err.code === 'OPENAI_ERROR' || err.code === 'OPENAI_NETWORK') return res.status(502).json({ error: err.message || 'ChatGPT error' });
    if (err.code === 'OUTSIDE_CEBU')   return res.status(422).json({ error: err.message, hint: 'Only attractions within Cebu Province are supported.' });
    if (err instanceof SyntaxError)    return res.status(502).json({ error: 'AI returned invalid JSON — try again' });
    return res.status(502).json({ error: err.message || 'AI suggestion failed' });
  }
};
