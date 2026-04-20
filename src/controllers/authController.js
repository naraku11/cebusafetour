const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db     = require('../config/db');
const { sendOtpEmail } = require('../services/emailService');

const generateToken = (user, expiresIn = process.env.JWT_EXPIRES_IN || '30d') =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn });

const sanitize = ({ password, fcmToken, emergencyContacts, ...safe }) => {
  let contacts = [];
  try { contacts = typeof emergencyContacts === 'string' ? JSON.parse(emergencyContacts || '[]') : (emergencyContacts ?? []); }
  catch { /* leave empty */ }
  return { ...safe, emergencyContacts: contacts };
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const otpExpiry  = () => new Date(Date.now() + 10 * 60 * 1000);

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

    const otp = generateOtp();
    await db.run(
      'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE email = ?',
      [otp, otpExpiry(), email]
    );

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
    const user = await db.findOne(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (!user || user.otpCode !== otp || !user.otpExpiresAt || new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    await db.run(
      'UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE email = ?',
      [email]
    );
    res.json({ message: 'Email verified', token: generateToken(user) });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, rememberMe = true } = req.body;
    const user = await db.findOne('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email first' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Account suspended or banned. Please contact support.', code: 'ACCOUNT_SUSPENDED' });

    await db.run('UPDATE users SET last_active = ? WHERE id = ?', [new Date(), user.id]);
    // rememberMe=true → long-lived session (30 d); false → expires next day (1 d)
    const expiresIn = rememberMe ? (process.env.JWT_EXPIRES_IN || '30d') : '1d';
    res.json({ token: generateToken(user, expiresIn), user: sanitize(user) });
  } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await db.findOne('SELECT id, name FROM users WHERE email = ? LIMIT 1', [email]);

    // Always return 200 regardless of whether the email exists — prevents user enumeration
    if (!user) {
      return res.json({ message: 'If that email is registered, an OTP has been sent.', emailSent: false });
    }

    const otp = generateOtp();
    await db.run(
      'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE email = ?',
      [otp, otpExpiry(), email]
    );

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
        ? 'If that email is registered, an OTP has been sent.'
        : 'Email delivery failed — please try again in a moment.',
      emailSent,
    });
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await db.findOne(
      'SELECT otp_code, otp_expires_at FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (!user || user.otpCode !== otp || !user.otpExpiresAt || new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await db.run(
      'UPDATE users SET password = ?, otp_code = NULL, otp_expires_at = NULL WHERE email = ?',
      [hashed, email]
    );
    res.json({ message: 'Password reset successful' });
  } catch (err) { next(err); }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await db.findOne('SELECT id, name, is_verified FROM users WHERE email = ? LIMIT 1', [email]);
    if (!user) return res.status(404).json({ error: 'Email not found' });
    if (user.isVerified) return res.status(400).json({ error: 'Email already verified' });

    const otp = generateOtp();
    await db.run(
      'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE email = ?',
      [otp, otpExpiry(), email]
    );
    await sendOtpEmail(email, user.name, otp);
    res.json({ message: 'OTP resent to your email' });
  } catch (err) { next(err); }
};

exports.getMe = (req, res) => res.json({ user: sanitize(req.user) });

// Used by the admin panel's PasswordUnlockModal to verify identity without creating a session
exports.verifyPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await db.findOne('SELECT id, password FROM users WHERE email = ? LIMIT 1', [email]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ verified: true });
  } catch (err) { next(err); }
};
