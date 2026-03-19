const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { verifyProfilePicture } = require('../services/aiService');

// Fields returned for all user responses — excludes password and fcmToken
const USER_SELECT = {
  id: true, name: true, email: true, nationality: true,
  contactNumber: true, role: true, status: true, language: true,
  profilePicture: true, profilePictureVerified: true,
  isVerified: true, lastActive: true,
  emergencyContacts: true, createdAt: true, updatedAt: true,
};

exports.list = async (req, res, next) => {
  try {
    const { search, status, nationality, page = 1, limit = 20 } = req.query;
    const where = { role: 'tourist' };
    if (status) where.status = status;
    if (nationality) where.nationality = { contains: nationality, mode: 'insensitive' };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select: USER_SELECT }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: USER_SELECT });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const incidents = await prisma.incident.findMany({
      where: { reportedBy: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({ user, incidents });
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, nationality, contactNumber, language, emergencyContacts } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, nationality, contactNumber, language, emergencyContacts },
      select: USER_SELECT,
    });
    res.json({ user });
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    await prisma.user.update({ where: { id: req.params.id }, data: { status } });
    res.json({ message: `User ${status}` });
  } catch (err) { next(err); }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    const profilePicture = `/uploads/avatars/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      // Reset verification when picture changes so it must be re-verified
      data: { profilePicture, profilePictureVerified: null },
      select: USER_SELECT,
    });

    res.json({ user });
  } catch (err) { next(err); }
};

exports.verifyPicture = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, profilePicture: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.profilePicture) return res.status(400).json({ error: 'User has no profile picture to verify' });

    const result = await verifyProfilePicture(user.profilePicture);
    const verified = result.isReal === true;

    await prisma.user.update({
      where: { id: req.params.id },
      data: { profilePictureVerified: verified },
    });

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
    const result = await prisma.user.groupBy({
      by: ['nationality'],
      where: { nationality: { not: null }, role: 'tourist' },
      _count: { nationality: true },
      orderBy: { _count: { nationality: 'desc' } },
    });
    const nationalities = result
      .filter(r => r.nationality)
      .map(r => ({ name: r.nationality, count: r._count.nationality }));
    res.json({ nationalities });
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    const [total, active, suspended, banned] = await prisma.$transaction([
      prisma.user.count({ where: { role: 'tourist' } }),
      prisma.user.count({ where: { role: 'tourist', status: 'active' } }),
      prisma.user.count({ where: { role: 'tourist', status: 'suspended' } }),
      prisma.user.count({ where: { role: 'tourist', status: 'banned' } }),
    ]);
    res.json({ total, active, suspended, banned });
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, nationality, contactNumber, isVerified } = req.body;
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.params.id) {
        return res.status(409).json({ error: 'Email already in use by another account' });
      }
    }
    const data = {};
    if (name        !== undefined) data.name          = name;
    if (email       !== undefined) data.email         = email;
    if (nationality !== undefined) data.nationality   = nationality;
    if (contactNumber !== undefined) data.contactNumber = contactNumber;
    if (isVerified  !== undefined) data.isVerified    = Boolean(isVerified);
    const user = await prisma.user.update({ where: { id: req.params.id }, data, select: USER_SELECT });
    res.json({ user });
  } catch (err) { next(err); }
};

exports.manualVerify = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.status(400).json({ error: 'User email is already verified' });
    await prisma.user.update({ where: { id: req.params.id }, data: { isVerified: true } });
    res.json({ message: 'User email verified successfully' });
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'tourist') return res.status(403).json({ error: 'Cannot delete admin accounts through this endpoint' });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

// ── Staff account management (admin_content / admin_emergency) ────────────────

const STAFF_ROLES = ['admin_content', 'admin_emergency'];

exports.listStaff = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const where = { role: { in: STAFF_ROLES } };
    if (status) where.status = status;
    if (search) where.OR = [
      { name:  { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
    const staff = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: USER_SELECT,
    });
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
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, contactNumber: contactNumber || null, isVerified: true, status: 'active' },
      select: USER_SELECT,
    });
    res.status(201).json({ user });
  } catch (err) { next(err); }
};

exports.updateStaff = async (req, res, next) => {
  try {
    const { name, email, role, contactNumber } = req.body;
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!STAFF_ROLES.includes(target.role))
      return res.status(403).json({ error: 'This endpoint is for staff accounts only' });
    if (role && !STAFF_ROLES.includes(role))
      return res.status(400).json({ error: 'Invalid role' });
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.params.id)
        return res.status(409).json({ error: 'Email already in use by another account' });
    }
    const data = {};
    if (name          !== undefined) data.name          = name;
    if (email         !== undefined) data.email         = email;
    if (role          !== undefined) data.role          = role;
    if (contactNumber !== undefined) data.contactNumber = contactNumber;
    const user = await prisma.user.update({ where: { id: req.params.id }, data, select: USER_SELECT });
    res.json({ user });
  } catch (err) { next(err); }
};

exports.deleteStaff = async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!STAFF_ROLES.includes(target.role))
      return res.status(403).json({ error: 'This endpoint is for staff accounts only' });
    if (target.id === req.user.id)
      return res.status(403).json({ error: 'Cannot delete your own account' });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Staff account deleted' });
  } catch (err) { next(err); }
};
