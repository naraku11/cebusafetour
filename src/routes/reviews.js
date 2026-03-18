const router = require('express').Router();
const ctrl = require('../controllers/reviewsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Admin: list all reviews (with optional filters)
router.get('/', authenticate, requireAdmin, ctrl.listAll);

// Admin: delete any review by ID
router.delete('/:id', authenticate, requireAdmin, ctrl.adminDelete);

module.exports = router;
