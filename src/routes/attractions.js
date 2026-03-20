const router = require('express').Router();
const ctrl = require('../controllers/attractionsController');
const reviews = require('../controllers/reviewsController');
const { authenticate, requireAdmin, requireRole } = require('../middleware/auth');
const { cacheResponse } = require('../middleware/cache');

const TTL = 300; // 5 minutes

router.get('/', cacheResponse(TTL, (req) => `attractions:list:${JSON.stringify(req.query)}`), ctrl.list);
router.get('/nearby', ctrl.nearby); // not cached — unique per GPS coordinate pair
router.get('/:id', cacheResponse(TTL, (req) => `attractions:detail:${req.params.id}`), ctrl.get);

// Reviews
router.get('/:id/reviews', reviews.list);
router.post('/:id/reviews', authenticate, reviews.upsert);
router.delete('/:id/reviews/me', authenticate, reviews.deleteOwn);

// Admin only
router.post('/ai-suggest', authenticate, requireAdmin, ctrl.aiSuggest);
router.post('/:id/refresh-photos', authenticate, requireAdmin, ctrl.refreshPhotos);
router.post('/', authenticate, requireAdmin, ctrl.create);
router.put('/:id', authenticate, requireAdmin, ctrl.update);
router.delete('/:id/permanent', authenticate, requireRole('admin_super'), ctrl.destroy);
router.delete('/:id', authenticate, requireRole('admin_super', 'admin_content'), ctrl.remove);

module.exports = router;
