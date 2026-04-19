const router = require('express').Router();
const ctrl   = require('../controllers/metaController');

// Public — no auth required.  Response never changes at runtime so clients
// can and should cache it with stale-time = Infinity.
router.get('/', ctrl.getMeta);

module.exports = router;
