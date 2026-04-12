-- Migration: Add designation column to users table
-- Stores the specific role/position of emergency staff within their LGU team.
-- Examples: "Emergency Medical Technician (EMT)", "SAR Coordinator",
--           "Disaster Communications Officer", "Fire Safety Inspector"

ALTER TABLE `users`
  ADD COLUMN `designation` VARCHAR(191) NULL AFTER `municipality`;
