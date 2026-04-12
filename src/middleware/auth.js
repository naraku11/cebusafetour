const jwt   = require('jsonwebtoken');
const db    = require('../config/db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await db.findOne('SELECT * FROM users WHERE id = ? LIMIT 1', [decoded.id]);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account suspended or banned', code: 'ACCOUNT_SUSPENDED' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

const requireAdmin      = requireRole('admin_super', 'admin_content', 'admin_emergency');
const requireSuperAdmin = requireRole('admin_super');

// Allows only a main emergency officer (admin_emergency with no createdByAdminId).
// Sub-officers/staff created by a manager are blocked — only the manager can manage their own team.
const requireEmergencyManager = (req, res, next) => {
  if (req.user?.role !== 'admin_emergency') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  if (req.user?.createdByAdminId) {
    return res.status(403).json({ error: 'Only the main emergency officer can manage their team' });
  }
  next();
};

module.exports = { authenticate, requireRole, requireAdmin, requireSuperAdmin, requireEmergencyManager };
