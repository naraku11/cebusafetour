-- ============================================================
-- CebuSafeTour — users table: all added columns (run once)
-- Apply this on any environment that already has the base
-- users table from the initial migration.
-- ============================================================

-- 1. New columns
ALTER TABLE `users`
  ADD COLUMN `municipality`        VARCHAR(191) NULL AFTER `emergency_contacts`,
  ADD COLUMN `designation`         VARCHAR(191) NULL AFTER `municipality`,
  ADD COLUMN `created_by_admin_id` VARCHAR(36)  NULL AFTER `designation`;

-- 2. Extend status enum to include 'archived'
ALTER TABLE `users`
  MODIFY COLUMN `status` ENUM('active', 'suspended', 'banned', 'archived')
    NOT NULL DEFAULT 'active';

-- 3. Self-referential FK: sub-officer → managing emergency officer
ALTER TABLE `users`
  ADD CONSTRAINT `users_created_by_admin_id_fkey`
    FOREIGN KEY (`created_by_admin_id`)
    REFERENCES `users`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- 4. Indexes for the new columns
CREATE INDEX `users_municipality_idx`        ON `users`(`municipality`);
CREATE INDEX `users_created_by_admin_id_idx` ON `users`(`created_by_admin_id`);
