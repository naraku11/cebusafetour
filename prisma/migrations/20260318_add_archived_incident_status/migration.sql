-- Add 'archived' to IncidentStatus enum
ALTER TABLE incidents MODIFY COLUMN status ENUM('new','in_progress','resolved','archived') NOT NULL DEFAULT 'new';
