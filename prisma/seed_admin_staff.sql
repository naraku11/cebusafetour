-- ============================================================
-- CebuSafeTour — Admin Staff Seed (Content Manager + Emergency Officer)
-- Inserts or skips if the account already exists (INSERT IGNORE).
--
-- Import via: Hostinger hPanel → phpMyAdmin → Import
-- Or via SSH:  mysql -u <user> -p <dbname> < prisma/seed_admin_staff.sql
--
-- Credentials:
--   content@cebusafetour.ph    /  Content@123
--   emergency@cebusafetour.ph  /  Emergency@123
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── CONTENT MANAGER ──────────────────────────────────────────────────────────
-- Role       : admin_content
-- Permissions: manage attractions & advisories (read-only on incidents/users)

INSERT IGNORE INTO `users`
  (`id`, `name`, `email`, `password`,
   `nationality`, `contact_number`,
   `role`, `status`, `language`,
   `is_verified`, `emergency_contacts`,
   `municipality`, `created_by_admin_id`, `designation`,
   `created_at`, `updated_at`)
VALUES
  ('91956fbf-f0bf-41f9-9f40-789fa297c23c',
   'Content Manager',
   'content@cebusafetour.ph',
   -- bcrypt hash of "Content@123" (cost 12)
   '$2a$12$WdV1OdU7AjqIp84hS9UFM.Km45YbAe1GOULj0tG5klJqExTbSh1Eu',
   'Filipino', '+63-32-255-0002',
   'admin_content', 'active', 'en',
   1, '[]',
   NULL, NULL, 'Content & Attractions Manager',
   NOW(), NOW());


-- ─── EMERGENCY OFFICER ────────────────────────────────────────────────────────
-- Role       : admin_emergency
-- Permissions: manage incidents & advisories (read-only on attractions/users)

INSERT IGNORE INTO `users`
  (`id`, `name`, `email`, `password`,
   `nationality`, `contact_number`,
   `role`, `status`, `language`,
   `is_verified`, `emergency_contacts`,
   `municipality`, `created_by_admin_id`, `designation`,
   `created_at`, `updated_at`)
VALUES
  ('d3c659df-5a9f-4d0c-9166-9903fc7fe192',
   'Emergency Officer',
   'emergency@cebusafetour.ph',
   -- bcrypt hash of "Emergency@123" (cost 12)
   '$2a$12$M40DvTVoEvtrSfjhnx.sTe6LpwEx0MHmhkSjBIYRHhGPmExh1236C',
   'Filipino', '+63-32-255-0003',
   'admin_emergency', 'active', 'en',
   1, '[]',
   NULL, NULL, 'Emergency Response Officer',
   NOW(), NOW());


SET FOREIGN_KEY_CHECKS = 1;

-- ─── SUMMARY ──────────────────────────────────────────────────────────────────
-- Rows inserted (skipped if email already exists):
--   content@cebusafetour.ph    → admin_content  / Content Manager
--   emergency@cebusafetour.ph  → admin_emergency / Emergency Officer
