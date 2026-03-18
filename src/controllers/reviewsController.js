const prisma = require('../config/prisma');

// GET /attractions/:id/reviews
exports.list = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reviews = await prisma.review.findMany({
      where: { attractionId: id },
      include: { user: { select: { id: true, name: true, profilePicture: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reviews });
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

    const attraction = await prisma.attraction.findUnique({ where: { id: attractionId } });
    if (!attraction) return res.status(404).json({ error: 'Attraction not found' });

    // Upsert the review
    const review = await prisma.review.upsert({
      where: { attractionId_userId: { attractionId, userId } },
      create: { attractionId, userId, rating: parseInt(rating), comment: comment ?? null },
      update: { rating: parseInt(rating), comment: comment ?? null },
      include: { user: { select: { id: true, name: true, profilePicture: true } } },
    });

    // Recalculate averageRating and totalReviews
    const agg = await prisma.review.aggregate({
      where: { attractionId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.attraction.update({
      where: { id: attractionId },
      data: {
        averageRating: agg._avg.rating ?? 0,
        totalReviews: agg._count.rating,
      },
    });

    res.json({ review });
  } catch (err) { next(err); }
};

// DELETE /attractions/:id/reviews/me  — remove the calling user's review
exports.deleteOwn = async (req, res, next) => {
  try {
    const { id: attractionId } = req.params;
    const userId = req.user.id;

    const existing = await prisma.review.findUnique({
      where: { attractionId_userId: { attractionId, userId } },
    });
    if (!existing) return res.status(404).json({ error: 'Review not found' });

    await prisma.review.delete({ where: { attractionId_userId: { attractionId, userId } } });

    // Recalculate
    const agg = await prisma.review.aggregate({
      where: { attractionId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.attraction.update({
      where: { id: attractionId },
      data: {
        averageRating: agg._avg.rating ?? 0,
        totalReviews: agg._count.rating,
      },
    });

    res.json({ message: 'Review deleted' });
  } catch (err) { next(err); }
};

// GET /reviews  (admin) — list all reviews across all attractions
exports.listAll = async (req, res, next) => {
  try {
    const { attractionId, rating, page = 1, limit = 30 } = req.query;
    const where = {};
    if (attractionId) where.attractionId = attractionId;
    if (rating) where.rating = parseInt(rating);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [reviews, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, profilePicture: true } },
          attraction: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.review.count({ where }),
    ]);

    res.json({ reviews, total, page: parseInt(page), totalPages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// DELETE /reviews/:id  (admin) — delete any review
exports.adminDelete = async (req, res, next) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    await prisma.review.delete({ where: { id: req.params.id } });

    // Recalculate attraction stats
    const agg = await prisma.review.aggregate({
      where: { attractionId: review.attractionId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.attraction.update({
      where: { id: review.attractionId },
      data: {
        averageRating: agg._avg.rating ?? 0,
        totalReviews: agg._count.rating,
      },
    });

    res.json({ message: 'Review deleted' });
  } catch (err) { next(err); }
};
