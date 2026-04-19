const router = require('express').Router();
const ctrl = require('../controllers/advisoriesController');
const { authenticate, requireAdmin, requireRole } = require('../middleware/auth');

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);

// Specific POST paths must come before /:id wildcard routes
router.post('/ai-suggest', authenticate, requireAdmin, ctrl.aiSuggest);
router.post('/', authenticate, requireAdmin, ctrl.create);

// Any authenticated user (tourists acknowledge advisories)
router.post('/:id/acknowledge', authenticate, ctrl.acknowledge);
router.put('/:id', authenticate, requireAdmin, ctrl.update);
router.patch('/:id/resolve',   authenticate, requireRole('admin_super', 'admin_content'), ctrl.resolve);
router.patch('/:id/archive',   authenticate, requireRole('admin_super'), ctrl.archive);
router.patch('/:id/unarchive', authenticate, requireRole('admin_super'), ctrl.unarchive);

module.exports = router;
