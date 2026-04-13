-- Store the incident's status before it was archived so unarchiving restores it correctly
ALTER TABLE incidents
  ADD COLUMN `pre_archive_status` ENUM('new','in_progress','resolved') NULL DEFAULT NULL
  AFTER `status`;
