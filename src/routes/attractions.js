const router = require('express').Router();
const ctrl = require('../controllers/attractionsController');
const reviews = require('../controllers/reviewsController');
const { authenticate, requireAdmin, requireRole } = require('../middleware/auth');
router.get('/', ctrl.list);
router.get('/nearby', ctrl.nearby); // not cached — unique per GPS coordinate pair

// Admin-only GET routes must come before /:id to avoid being swallowed by the wildcard
router.get('/autocomplete', authenticate, requireAdmin, ctrl.autocomplete);
router.get('/place-detail', authenticate, requireAdmin, ctrl.placeDetail);

router.get('/:id', ctrl.get);

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
