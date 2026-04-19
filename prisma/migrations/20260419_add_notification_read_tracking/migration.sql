-- Track when each user last read their notifications.
-- Used by GET /notifications/public to return isRead without a join table.
ALTER TABLE users
  ADD COLUMN `last_read_notifications_at` DATETIME NULL DEFAULT NULL
  AFTER `fcm_token`;
