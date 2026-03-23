const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const cache = require('../utils/cache');

// Map a flat JOIN row (reviews + users) to a nested review object
const mapWithUser = row => ({
  id: row.id, attractionId: row.attractionId, userId: row.userId,
  rating: row.rating, comment: row.comment,
  createdAt: row.createdAt, updatedAt: row.updatedAt,
  user: { id: row.uId, name: row.uName, profilePicture: row.uProfilePicture },
});

// Recalculate and persist averageRating + totalReviews for an attraction
const recalcAttractionStats = async (attractionId) => {
  const agg = await db.findOne(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE attraction_id = ?',
    [attractionId]
  );
  await db.run(
    'UPDATE attractions SET average_rating = ?, total_reviews = ?, updated_at = ? WHERE id = ?',
    [agg.avgRating ?? 0, agg.totalReviews, new Date(), attractionId]
  );
};

// GET /attractions/:id/reviews
exports.list = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 100); // cap at 100

    const rows = await db.findMany(
      `SELECT r.id, r.attraction_id, r.user_id, r.rating, r.comment, r.created_at, r.updated_at,
              u.id as u_id, u.name as u_name, u.profile_picture as u_profile_picture
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.attraction_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, take, skip]
    );
    res.json({ reviews: rows.map(mapWithUser) });
  } catch (err) { next(err); }
};

// POST /attractions/:id/reviews  — create or update the calling user's review
exports.upsert = async (req, res, next) => {
  try {
    const { id: attractionId } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const attraction = await db.findOne('SELECT id FROM attractions WHERE id = ? LIMIT 1', [attractionId]);
    if (!attraction) return res.status(404).json({ error: 'Attraction not found' });

    const id  = uuidv4();
    const now = new Date();
    // INSERT new review; on duplicate (attractionId+userId) UPDATE rating/comment
    await db.run(
      `INSERT INTO reviews (id, attraction_id, user_id, rating, comment, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = VALUES(updated_at)`,
      [id, attractionId, userId, parseInt(rating), comment ?? null, now, now]
    );

    const row = await db.findOne(
      `SELECT r.*,
              u.id as u_id, u.name as u_name, u.profile_picture as u_profile_picture
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.attraction_id = ? AND r.user_id = ? LIMIT 1`,
      [attractionId, userId]
    );

    await recalcAttractionStats(attractionId);
    cache.invalidatePrefix('attractions:');
    res.json({ review: mapWithUser(row) });
  } catch (err) { next(err); }
};

// DELETE /attractions/:id/reviews/me  — remove the calling user's review
exports.deleteOwn = async (req, res, next) => {
  try {
    const { id: attractionId } = req.params;
    const userId = req.user.id;

    const existing = await db.findOne(
      'SELECT id FROM reviews WHERE attraction_id = ? AND user_id = ? LIMIT 1',
      [attractionId, userId]
    );
    if (!existing) return res.status(404).json({ error: 'Review not found' });

    await db.run('DELETE FROM reviews WHERE attraction_id = ? AND user_id = ?', [attractionId, userId]);
    await recalcAttractionStats(attractionId);
    cache.invalidatePrefix('attractions:');
    res.json({ message: 'Review deleted' });
  } catch (err) { next(err); }
};

// GET /reviews  (admin) — list all reviews across all attractions
exports.listAll = async (req, res, next) => {
  try {
    const { attractionId, rating, page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const conditions = [];
    const params     = [];
    if (attractionId) { conditions.push('r.attraction_id = ?'); params.push(attractionId); }
    if (rating)       { conditions.push('r.rating = ?');        params.push(parseInt(rating)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows, countRow] = await Promise.all([
      db.findMany(
        `SELECT r.*,
                u.id as u_id, u.name as u_name, u.email as u_email, u.profile_picture as u_profile_picture,
                a.id as a_id, a.name as a_name
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         JOIN attractions a ON a.id = r.attraction_id
         ${where}
         ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
        [...params, take, skip]
      ),
      db.findOne(`SELECT COUNT(*) as n FROM reviews r ${where}`, params),
    ]);

    const reviews = rows.map(r => ({
      id: r.id, attractionId: r.attractionId, userId: r.userId,
      rating: r.rating, comment: r.comment,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      user:       { id: r.uId, name: r.uName, email: r.uEmail, profilePicture: r.uProfilePicture },
      attraction: { id: r.aId, name: r.aName },
    }));

    res.json({ reviews, total: countRow.n, page: parseInt(page), totalPages: Math.ceil(countRow.n / take) });
  } catch (err) { next(err); }
};

// DELETE /reviews/:id  (admin) — delete any review
exports.adminDelete = async (req, res, next) => {
  try {
    const review = await db.findOne('SELECT id, attraction_id FROM reviews WHERE id = ? LIMIT 1', [req.params.id]);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    await db.run('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    await recalcAttractionStats(review.attractionId);
    cache.invalidatePrefix('attractions:');
    res.json({ message: 'Review deleted' });
  } catch (err) { next(err); }
};
