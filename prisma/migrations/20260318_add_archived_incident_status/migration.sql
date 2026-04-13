-- Add 'archived' to IncidentStatus enum
ALTER TABLE incidents MODIFY COLUMN status ENUM('new','in_progress','resolved','archived') NOT NULL DEFAULT 'new';

-- Repair rows where status was silently stored as '' (empty string) by MySQL non-strict mode
-- before 'archived' was a valid ENUM value. These rows were intended to be archived.
UPDATE incidents SET status = 'archived' WHERE status = '';
