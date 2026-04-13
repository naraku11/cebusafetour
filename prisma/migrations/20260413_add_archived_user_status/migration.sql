-- Add 'archived' to UserStatus enum
-- Required because the admin UI has an Archive action for staff accounts.
ALTER TABLE `users`
  MODIFY COLUMN `status` ENUM('active', 'suspended', 'banned', 'archived')
    NOT NULL DEFAULT 'active';
