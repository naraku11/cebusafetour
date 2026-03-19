const router = require('express').Router();
const ctrl = require('../controllers/emergencyController');
const { authenticate, requireAdmin, requireRole } = require('../middleware/auth');

router.get('/services', ctrl.getNearbyEmergencyServices);
router.post('/incidents', authenticate, ctrl.reportIncident);
router.get('/incidents/mine', authenticate, ctrl.myIncidents);   // must be before /:id

// Admin only — static paths must come before /:id wildcard
router.get('/incidents',          authenticate, requireRole('admin_super', 'admin_emergency'), ctrl.listIncidents);
router.get('/incidents/archived', authenticate, requireRole('admin_super', 'admin_emergency'), ctrl.listArchivedIncidents);
router.get('/incidents/:id',      authenticate, requireRole('admin_super', 'admin_emergency'), ctrl.getIncident);
router.patch('/incidents/:id',           authenticate, requireRole('admin_super', 'admin_emergency'), ctrl.updateIncident);
router.patch('/incidents/:id/archive',   authenticate, requireRole('admin_super'), ctrl.archiveIncident);
router.patch('/incidents/:id/unarchive', authenticate, requireRole('admin_super'), ctrl.unarchiveIncident);

module.exports = router;
