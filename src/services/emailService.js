const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',   // true for port 465 (SSL), false for 587 (STARTTLS)
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

exports.sendOtpEmail = async (to, name, otp, type = 'verify') => {
  const isReset   = type === 'reset';
  const subject   = isReset ? 'CebuSafeTour — Password Reset Code' : 'CebuSafeTour — Verify Your Email';
  const headline  = isReset ? 'Reset Your Password' : 'Verify Your Email Address';
  const bodyText  = isReset
    ? 'We received a request to reset your CebuSafeTour password. Use the code below to continue:'
    : `Welcome to CebuSafeTour, <strong>${name}</strong>! Enter the code below to verify your email and activate your account:`;
  const footerNote = isReset
    ? 'If you did not request a password reset, you can safely ignore this email.'
    : 'If you did not create a CebuSafeTour account, you can safely ignore this email.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);padding:32px 40px;text-align:center">
            <div style="font-size:28px;margin-bottom:6px">🌊</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px">CebuSafeTour</h1>
            <p style="margin:4px 0 0;color:#bae6fd;font-size:13px">Your Safe Journey Partner in Cebu</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;font-weight:700">${headline}</h2>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6">${bodyText}</p>

            <!-- OTP box -->
            <div style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <p style="margin:0 0 8px;color:#0284c7;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase">Your Verification Code</p>
              <div style="font-size:40px;font-weight:800;letter-spacing:14px;color:#0ea5e9;font-family:monospace">${otp}</div>
            </div>

            <div style="background:#fef9c3;border-left:4px solid #fbbf24;border-radius:4px;padding:12px 16px;margin-bottom:24px">
              <p style="margin:0;color:#92400e;font-size:13px">
                ⏱ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
              </p>
            </div>

            <p style="margin:0;color:#94a3b8;font-size:13px">${footerNote}</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">
              &copy; ${new Date().getFullYear()} CebuSafeTour &bull; Cebu, Philippines<br>
              This is an automated message. Please do not reply.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    logger.info(`OTP email sent to ${to}`);
  } catch (err) {
    logger.error('Email send error:', err);
    throw err;
  }
};
