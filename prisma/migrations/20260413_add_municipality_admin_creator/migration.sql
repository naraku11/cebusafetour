-- Migration: Add municipality and emergency officer hierarchy to users table
-- Adds: municipality (which LGU this admin manages)
--       created_by_admin_id (FK to users.id — links sub-officers to their manager)

-- Add new columns
ALTER TABLE `users`
  ADD COLUMN `municipality`        VARCHAR(191) NULL AFTER `emergency_contacts`,
  ADD COLUMN `created_by_admin_id` VARCHAR(36)  NULL AFTER `municipality`;

-- Self-referential FK: sub-officer → managing emergency officer
ALTER TABLE `users`
  ADD CONSTRAINT `users_created_by_admin_id_fkey`
    FOREIGN KEY (`created_by_admin_id`)
    REFERENCES `users`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Performance indexes
CREATE INDEX `users_municipality_idx`        ON `users`(`municipality`);
CREATE INDEX `users_created_by_admin_id_idx` ON `users`(`created_by_admin_id`);
