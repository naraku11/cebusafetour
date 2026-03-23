-- Performance indexes for frequently-queried columns
-- These columns appear in WHERE / ORDER BY clauses but lack indexes.

-- incidents.reported_by  — used by myIncidents (WHERE reported_by = ?)
--                          and user detail (JOIN incidents ON reported_by)
CREATE INDEX `incidents_reported_by_idx` ON `incidents`(`reported_by`);

-- users.nationality      — used in nationality filtering + reports GROUP BY
CREATE INDEX `users_nationality_idx` ON `users`(`nationality`);

-- users.created_at       — used in reports (new users this month) + admin list ORDER BY
CREATE INDEX `users_created_at_idx` ON `users`(`created_at` DESC);

-- reviews.user_id        — used in deleteOwn (WHERE user_id = ?) and foreign key lookups
CREATE INDEX `reviews_user_id_idx` ON `reviews`(`user_id`);

-- advisories.created_at  — used in reports trends + list ORDER BY
CREATE INDEX `advisories_created_at_idx` ON `advisories`(`created_at` DESC);
