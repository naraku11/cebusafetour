const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db     = require('../config/db');
const socket = require('../services/socketService');
const { verifyProfilePicture } = require('../services/aiService');

// Columns to select for user responses — excludes password and fcm_token
const USER_COLS = `id, name, email, nationality, contact_number, role, status, language,
  profile_picture, profile_picture_verified, is_verified, last_active,
  emergency_contacts, created_at, updated_at`;

exports.list = async (req, res, next) => {
  try {
    const { search, status, nationality, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const conditions = [`role = 'tourist'`];
    const params     = [];

    if (status) { conditions.push('status = ?'); params.push(status); }
    if (nationality) { conditions.push('nationality LIKE ?'); params.push(`%${nationality}%`); }
    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.join(' AND ');

    const [users, countRow] = await Promise.all([
      db.findMany(
        `SELECT ${USER_COLS} FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, take, skip]
      ),
      db.findOne(`SELECT COUNT(*) as n FROM users WHERE ${where}`, params),
    ]);

    res.json({ users, total: countRow.n });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const user = await db.findOne(
      `SELECT ${USER_COLS} FROM users WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const incidents = await db.findMany(
      'SELECT * FROM incidents WHERE reported_by = ? ORDER BY created_at DESC LIMIT 10',
      [user.id]
    );

    res.json({ user, incidents });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const row = await db.findOne('SELECT password FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (!row) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(currentPassword, row.password);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.run('UPDATE users SET password = ?, updated_at = ? WHERE id = ?', [hashed, new Date(), req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, nationality, contactNumber, language, emergencyContacts } = req.body;
    const sets   = [];
    const params = [];

    if (name              !== undefined) { sets.push('name = ?');               params.push(name); }
    if (nationality       !== undefined) { sets.push('nationality = ?');         params.push(nationality); }
    if (contactNumber     !== undefined) { sets.push('contact_number = ?');      params.push(contactNumber); }
    if (language          !== undefined) { sets.push('language = ?');            params.push(language); }
    if (emergencyContacts !== undefined) { sets.push('emergency_contacts = ?');  params.push(JSON.stringify(emergencyContacts)); }

    if (sets.length) {
      sets.push('updated_at = ?');
      params.push(new Date(), req.user.id);
      await db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    const user = await db.findOne(`SELECT ${USER_COLS} FROM users WHERE id = ? LIMIT 1`, [req.user.id]);
    res.json({ user });
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const user = await db.findOne('SELECT id FROM users WHERE id = ? LIMIT 1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await db.run('UPDATE users SET status = ?, updated_at = ? WHERE id = ?', [status, new Date(), req.params.id]);
    socket.emitToAdmins('user:updated', { id: req.params.id, status });
    res.json({ message: `User ${status}` });
  } catch (err) { next(err); }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const profilePicture = `/uploads/avatars/${req.file.filename}`;
    await db.run(
      'UPDATE users SET profile_picture = ?, profile_picture_verified = NULL, updated_at = ? WHERE id = ?',
      [profilePicture, new Date(), req.user.id]
    );
    const user = await db.findOne(`SELECT ${USER_COLS} FROM users WHERE id = ? LIMIT 1`, [req.user.id]);
    res.json({ user });
  } catch (err) { next(err); }
};

exports.verifyPicture = async (req, res, next) => {
  try {
    const user = await db.findOne('SELECT id, profile_picture FROM users WHERE id = ? LIMIT 1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.profilePicture) return res.status(400).json({ error: 'User has no profile picture to verify' });

    const result   = await verifyProfilePicture(user.profilePicture);
    const verified = result.isReal === true;

    await db.run(
      'UPDATE users SET profile_picture_verified = ?, updated_at = ? WHERE id = ?',
      [verified ? 1 : 0, new Date(), req.params.id]
    );

    res.json({ verified, reason: result.reason });
  } catch (err) {
    if (err.code === 'NO_API_KEY')     return res.status(503).json({ error: 'OpenAI API key not configured.', hint: 'Set OPENAI_API_KEY in .env' });
    if (err.code === 'OPENAI_AUTH')    return res.status(401).json({ error: err.message });
    if (err.code === 'QUOTA_EXCEEDED') return res.status(429).json({ error: err.message, hint: err.isQuota ? 'Add credits at https://platform.openai.com/settings/billing/overview' : 'Wait a few seconds and try again.' });
    if (err.code === 'OPENAI_TIMEOUT') return res.status(504).json({ error: err.message });
    if (err instanceof SyntaxError)    return res.status(502).json({ error: 'AI returned invalid JSON — try again' });
    next(err);
  }
};

exports.getRegisteredNationalities = async (req, res, next) => {
  try {
    const rows = await db.findMany(
      `SELECT nationality, COUNT(*) as n FROM users
       WHERE role = 'tourist' AND nationality IS NOT NULL
       GROUP BY nationality ORDER BY n DESC`
    );
    const nationalities = rows.map(r => ({ name: r.nationality, count: r.n }));
    res.json({ nationalities });
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    const [total, active, suspended, banned] = await Promise.all([
      db.findOne(`SELECT COUNT(*) as n FROM users WHERE role = 'tourist'`).then(r => r.n),
      db.findOne(`SELECT COUNT(*) as n FROM users WHERE role = 'tourist' AND status = 'active'`).then(r => r.n),
      db.findOne(`SELECT COUNT(*) as n FROM users WHERE role = 'tourist' AND status = 'suspended'`).then(r => r.n),
      db.findOne(`SELECT COUNT(*) as n FROM users WHERE role = 'tourist' AND status = 'banned'`).then(r => r.n),
    ]);
    res.json({ total, active, suspended, banned });
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, nationality, contactNumber, isVerified } = req.body;

    if (email) {
      const existing = await db.findOne('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (existing && existing.id !== req.params.id) {
        return res.status(409).json({ error: 'Email already in use by another account' });
      }
    }

    const sets   = [];
    const params = [];
    if (name          !== undefined) { sets.push('name = ?');          params.push(name); }
    if (email         !== undefined) { sets.push('email = ?');         params.push(email); }
    if (nationality   !== undefined) { sets.push('nationality = ?');   params.push(nationality); }
    if (contactNumber !== undefined) { sets.push('contact_number = ?'); params.push(contactNumber); }
    if (isVerified    !== undefined) { sets.push('is_verified = ?');   params.push(Boolean(isVerified) ? 1 : 0); }

    if (sets.length) {
      sets.push('updated_at = ?');
      params.push(new Date(), req.params.id);
      await db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    const user = await db.findOne(`SELECT ${USER_COLS} FROM users WHERE id = ? LIMIT 1`, [req.params.id]);
    socket.emitToAdmins('user:updated', { id: req.params.id });
    res.json({ user });
  } catch (err) { next(err); }
};

exports.manualVerify = async (req, res, next) => {
  try {
    const user = await db.findOne('SELECT id, is_verified FROM users WHERE id = ? LIMIT 1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.status(400).json({ error: 'User email is already verified' });
    await db.run('UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?', [new Date(), req.params.id]);
    res.json({ message: 'User email verified successfully' });
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await db.findOne('SELECT id, role FROM users WHERE id = ? LIMIT 1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'tourist') return res.status(403).json({ error: 'Cannot delete admin accounts through this endpoint' });
    await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    socket.emitToAdmins('user:deleted', { id: req.params.id });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

// ── Staff account management (admin_content / admin_emergency) ────────────────

const STAFF_ROLES = ['admin_content', 'admin_emergency'];

exports.listStaff = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const conditions = [`role IN ('admin_content', 'admin_emergency')`];
    const params     = [];

    if (status) { conditions.push('status = ?'); params.push(status); }
    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.join(' AND ');
    const staff = await db.findMany(
      `SELECT ${USER_COLS} FROM users WHERE ${where} ORDER BY created_at DESC`,
      params
    );
    res.json({ staff });
  } catch (err) { next(err); }
};

exports.createStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, contactNumber } = req.body;
    if (!STAFF_ROLES.includes(role))
      return res.status(400).json({ error: 'Role must be admin_content or admin_emergency' });
    if (!password || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await db.findOne('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 12);
    const id  = uuidv4();
    const now = new Date();
    await db.run(
      `INSERT INTO users (id, name, email, password, role, contact_number, status, language,
         is_verified, emergency_contacts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', 'en', 1, '[]', ?, ?)`,
      [id, name, email, hashed, role, contactNumber ?? null, now, now]
    );

    const user = await db.findOne(`SELECT ${USER_COLS} FROM users WHERE id = ? LIMIT 1`, [id]);
    socket.emitToAdmins('staff:created', { id });
    res.status(201).json({ user });
  } catch (err) { next(err); }
};

exports.updateStaff = async (req, res, next) => {
  try {
    const { name, email, role, contactNumber } = req.body;
    const target = await db.findOne('SELECT id, role FROM users WHERE id = ? LIMIT 1', [req.params.id]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!STAFF_ROLES.includes(target.role))
      return res.status(403).json({ error: 'This endpoint is for staff accounts only' });
    if (role && !STAFF_ROLES.includes(role))
      return res.status(400).json({ error: 'Invalid role' });

    if (email) {
      const existing = await db.findOne('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (existing && existing.id !== req.params.id)
        return res.status(409).json({ error: 'Email already in use by another account' });
    }

    const sets   = [];
    const params = [];
    if (name          !== undefined) { sets.push('name = ?');           params.push(name); }
    if (email         !== undefined) { sets.push('email = ?');          params.push(email); }
    if (role          !== undefined) { sets.push('role = ?');           params.push(role); }
    if (contactNumber !== undefined) { sets.push('contact_number = ?'); params.push(contactNumber); }

    if (sets.length) {
      sets.push('updated_at = ?');
      params.push(new Date(), req.params.id);
      await db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    const user = await db.findOne(`SELECT ${USER_COLS} FROM users WHERE id = ? LIMIT 1`, [req.params.id]);
    socket.emitToAdmins('staff:updated', { id: req.params.id });
    res.json({ user });
  } catch (err) { next(err); }
};

exports.deleteStaff = async (req, res, next) => {
  try {
    const target = await db.findOne('SELECT id, role FROM users WHERE id = ? LIMIT 1', [req.params.id]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!STAFF_ROLES.includes(target.role))
      return res.status(403).json({ error: 'This endpoint is for staff accounts only' });
    if (target.id === req.user.id)
      return res.status(403).json({ error: 'Cannot delete your own account' });
    await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    socket.emitToAdmins('staff:deleted', { id: req.params.id });
    res.json({ message: 'Staff account deleted' });
  } catch (err) { next(err); }
};
