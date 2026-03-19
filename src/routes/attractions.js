const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/attractionsController');
const reviews = require('../controllers/reviewsController');
const { authenticate, requireAdmin, requireRole } = require('../middleware/auth');

const aiSuggestLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: { error: 'Too many AI suggestions — please wait a few minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', ctrl.list);
router.get('/nearby', ctrl.nearby);
router.get('/:id', ctrl.get);

// Reviews
router.get('/:id/reviews', reviews.list);
router.post('/:id/reviews', authenticate, reviews.upsert);
router.delete('/:id/reviews/me', authenticate, reviews.deleteOwn);

// Admin only
router.post('/ai-suggest', aiSuggestLimit, authenticate, requireAdmin, ctrl.aiSuggest);
router.post('/:id/refresh-photos', authenticate, requireAdmin, ctrl.refreshPhotos);
router.post('/', authenticate, requireAdmin, ctrl.create);
router.put('/:id', authenticate, requireAdmin, ctrl.update);
router.delete('/:id/permanent', authenticate, requireRole('admin_super'), ctrl.destroy);
router.delete('/:id', authenticate, requireRole('admin_super', 'admin_content'), ctrl.remove);

module.exports = router;
