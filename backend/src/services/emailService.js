const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

exports.sendOtpEmail = async (to, name, otp, type = 'verify') => {
  const subject = type === 'reset' ? 'CebuSafeTour — Password Reset OTP' : 'CebuSafeTour — Email Verification';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#0ea5e9">CebuSafeTour</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>${type === 'reset' ? 'Use this OTP to reset your password:' : 'Your verification code is:'}</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f0f9ff;border-radius:8px;text-align:center">
        ${otp}
      </div>
      <p style="color:#6b7280;font-size:12px">This code expires in 10 minutes. Do not share it with anyone.</p>
    </div>
  `;
  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    logger.info(`OTP email sent to ${to}`);
  } catch (err) {
    logger.error('Email send error:', err);
    throw err;
  }
};
