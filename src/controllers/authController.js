const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db     = require('../config/db');
const { sendOtpEmail } = require('../services/emailService');

const otpStore = new Map();
const OTP_MAX_ENTRIES = 500; // hard cap to prevent memory exhaustion

// Purge expired OTPs every 60s (was 5 min — too slow under load)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpStore) {
    if (now > val.expiresAt) otpStore.delete(key);
  }
}, 60_000).unref();

// Safe setter — evicts oldest entries when cap is reached
function otpSet(key, val) {
  if (otpStore.size >= OTP_MAX_ENTRIES) {
    // Delete the first (oldest) entry
    const first = otpStore.keys().next().value;
    otpStore.delete(first);
  }
  otpStore.set(key, val);
}

const generateToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });

const sanitize = ({ password, fcmToken, ...safe }) => safe;

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, nationality, contactNumber } = req.body;

    const existing = await db.findOne('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const id  = uuidv4();
    const now = new Date();
    await db.run(
      `INSERT INTO users (id, name, email, password, nationality, contact_number, role, status, language,
         is_verified, emergency_contacts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'tourist', 'active', 'en', 0, '[]', ?, ?)`,
      [id, name, email, hashed, nationality ?? null, contactNumber ?? null, now, now]
    );

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpSet(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    let emailSent = true;
    try {
      await sendOtpEmail(email, name, otp);
    } catch (emailErr) {
      emailSent = false;
      const logger = require('../utils/logger');
      logger.error(`Failed to send OTP email to ${email}: ${emailErr.message}`);
    }

    res.status(201).json({
      message: emailSent
        ? 'Account created. Please check your email for the verification code.'
        : 'Account created. Email delivery failed — use Resend OTP to get your code.',
      userId: id,
      emailSent,
    });
  } catch (err) { next(err); }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const record = otpStore.get(email);
    if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    await db.run('UPDATE users SET is_verified = 1 WHERE email = ?', [email]);
    const user = await db.findOne('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    otpStore.delete(email);
    res.json({ message: 'Email verified', token: generateToken(user) });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await db.findOne('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email first' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Account suspended or banned. Please contact support.', code: 'ACCOUNT_SUSPENDED' });

    await db.run('UPDATE users SET last_active = ? WHERE id = ?', [new Date(), user.id]);
    res.json({ token: generateToken(user), user: sanitize(user) });
  } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await db.findOne('SELECT id, name FROM users WHERE email = ? LIMIT 1', [email]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpSet(`reset_${email}`, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    let emailSent = true;
    try {
      await sendOtpEmail(email, user.name, otp, 'reset');
    } catch (emailErr) {
      emailSent = false;
      const logger = require('../utils/logger');
      logger.error(`Failed to send reset OTP email to ${email}: ${emailErr.message}`);
    }

    res.json({
      message: emailSent
        ? 'OTP sent to your email'
        : 'Email delivery failed — please try again in a moment.',
      emailSent,
    });
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const record = otpStore.get(`reset_${email}`);
    if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await db.run('UPDATE users SET password = ? WHERE email = ?', [hashed, email]);
    otpStore.delete(`reset_${email}`);
    res.json({ message: 'Password reset successful' });
  } catch (err) { next(err); }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await db.findOne('SELECT id, name, is_verified FROM users WHERE email = ? LIMIT 1', [email]);
    if (!user) return res.status(404).json({ error: 'Email not found' });
    if (user.isVerified) return res.status(400).json({ error: 'Email already verified' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpSet(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
    await sendOtpEmail(email, user.name, otp);
    res.json({ message: 'OTP resent to your email' });
  } catch (err) { next(err); }
};

exports.getMe = (req, res) => res.json({ user: sanitize(req.user) });

exports.updateFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    await db.run('UPDATE users SET fcm_token = ? WHERE id = ?', [fcmToken, req.user.id]);
    res.json({ message: 'FCM token updated' });
  } catch (err) { next(err); }
};
