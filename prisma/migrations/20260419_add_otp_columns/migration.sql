-- Migrate OTP storage from in-memory Map to the users table.
-- Allows OTPs to survive server restarts.
ALTER TABLE `users`
  ADD COLUMN `otp_code`       VARCHAR(6)    NULL AFTER `is_verified`,
  ADD COLUMN `otp_expires_at` DATETIME(3)   NULL AFTER `otp_code`;
