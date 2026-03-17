const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { sendOtpEmail } = require('../services/emailService');

const otpStore = new Map(); // In production use Redis

const generateToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sanitize = ({ password, fcmToken, ...safe }) => safe;

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, nationality, contactNumber } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, nationality, contactNumber },
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
    await sendOtpEmail(email, name, otp);

    res.status(201).json({ message: 'Account created. Please verify your email.', userId: user.id });
  } catch (err) { next(err); }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const record = otpStore.get(email);
    if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    const user = await prisma.user.update({ where: { email }, data: { isVerified: true } });
    otpStore.delete(email);
    res.json({ message: 'Email verified', token: generateToken(user) });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email first' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Account suspended or banned. Please contact support.', code: 'ACCOUNT_SUSPENDED' });

    await prisma.user.update({ where: { id: user.id }, data: { lastActive: new Date() } });
    res.json({ token: generateToken(user), user: sanitize(user) });
  } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(`reset_${email}`, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
    await sendOtpEmail(email, user.name, otp, 'reset');
    res.json({ message: 'OTP sent to your email' });
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
    await prisma.user.update({ where: { email }, data: { password: hashed } });
    otpStore.delete(`reset_${email}`);
    res.json({ message: 'Password reset successful' });
  } catch (err) { next(err); }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Email not found' });
    if (user.isVerified) return res.status(400).json({ error: 'Email already verified' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
    await sendOtpEmail(email, user.name, otp);
    res.json({ message: 'OTP resent to your email' });
  } catch (err) { next(err); }
};

exports.getMe = (req, res) => res.json({ user: sanitize(req.user) });

exports.updateFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    await prisma.user.update({ where: { id: req.user.id }, data: { fcmToken } });
    res.json({ message: 'FCM token updated' });
  } catch (err) { next(err); }
};
