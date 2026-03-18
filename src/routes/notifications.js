const router = require('express').Router();
const ctrl = require('../controllers/notificationsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/public', authenticate, ctrl.listPublic);   // tourists: recent announcements
router.get('/', authenticate, requireAdmin, ctrl.list);
router.post('/', authenticate, requireAdmin, ctrl.send);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

module.exports = router;
