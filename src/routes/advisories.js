const router = require('express').Router();
const ctrl = require('../controllers/advisoriesController');
const { authenticate, requireAdmin, requireRole } = require('../middleware/auth');
const { cacheResponse } = require('../middleware/cache');

const TTL = 120; // 2 minutes — safety info should stay fresh

router.get('/', cacheResponse(TTL, (req) => `advisories:list:${JSON.stringify(req.query)}`), ctrl.list);
router.get('/:id', cacheResponse(TTL, (req) => `advisories:detail:${req.params.id}`), ctrl.get);

// Admin only
router.post('/ai-suggest', authenticate, requireAdmin, ctrl.aiSuggest);
router.post('/', authenticate, requireAdmin, ctrl.create);
router.put('/:id', authenticate, requireAdmin, ctrl.update);
router.patch('/:id/resolve',   authenticate, requireRole('admin_super', 'admin_content'), ctrl.resolve);
router.patch('/:id/archive',   authenticate, requireRole('admin_super'), ctrl.archive);
router.patch('/:id/unarchive', authenticate, requireRole('admin_super'), ctrl.unarchive);

module.exports = router;
