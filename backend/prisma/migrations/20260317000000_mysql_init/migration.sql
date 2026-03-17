-- CebuSafeTour — MySQL Migration (consolidated)
-- Generated for MySQL 8.0+ / Hostinger Business Web Hosting
-- Replaces all prior PostgreSQL migrations

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `nationality` VARCHAR(191) NULL,
    `contact_number` VARCHAR(191) NULL,
    `role` ENUM('tourist', 'admin_super', 'admin_content', 'admin_emergency') NOT NULL DEFAULT 'tourist',
    `status` ENUM('active', 'suspended', 'banned') NOT NULL DEFAULT 'active',
    `fcm_token` VARCHAR(191) NULL,
    `language` ENUM('en', 'fil', 'zh', 'ko', 'ja') NOT NULL DEFAULT 'en',
    `profile_picture` VARCHAR(191) NULL,
    `profile_picture_verified` BOOLEAN NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `last_active` DATETIME(3) NULL,
    `emergency_contacts` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attractions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` ENUM('beach', 'mountain', 'heritage', 'museum', 'park', 'waterfall', 'market', 'church', 'resort', 'other') NOT NULL,
    `description` TEXT NULL,
    `district` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `photos` JSON NOT NULL,
    `operating_hours` JSON NOT NULL,
    `entrance_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `contact_info` JSON NOT NULL,
    `safety_status` ENUM('safe', 'caution', 'restricted') NOT NULL DEFAULT 'safe',
    `crowd_level` ENUM('low', 'moderate', 'high') NOT NULL DEFAULT 'low',
    `accessibility_features` JSON NOT NULL,
    `nearby_facilities` JSON NOT NULL,
    `average_rating` DECIMAL(3, 2) NOT NULL DEFAULT 0,
    `total_reviews` INTEGER NOT NULL DEFAULT 0,
    `total_visits` INTEGER NOT NULL DEFAULT 0,
    `total_saves` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('published', 'draft', 'archived') NOT NULL DEFAULT 'draft',
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `attractions_status_idx`(`status`),
    INDEX `attractions_category_idx`(`category`),
    INDEX `attractions_safety_status_idx`(`safety_status`),
    INDEX `attractions_district_idx`(`district`),
    INDEX `attractions_total_visits_idx`(`total_visits` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `advisories` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `severity` ENUM('critical', 'warning', 'advisory') NOT NULL,
    `source` ENUM('pagasa', 'ndrrmc', 'lgu', 'cdrrmo', 'admin') NOT NULL DEFAULT 'admin',
    `affected_area` JSON NOT NULL,
    `recommended_actions` TEXT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `status` ENUM('active', 'resolved', 'archived') NOT NULL DEFAULT 'active',
    `notification_sent` BOOLEAN NOT NULL DEFAULT false,
    `acknowledged_by` JSON NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `advisories_status_idx`(`status`),
    INDEX `advisories_severity_idx`(`severity`),
    INDEX `advisories_start_date_end_date_idx`(`start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incidents` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('medical', 'fire', 'crime', 'natural_disaster', 'lost_person') NOT NULL,
    `description` TEXT NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `nearest_landmark` VARCHAR(191) NULL,
    `reported_by` VARCHAR(191) NULL,
    `reporter_contact` VARCHAR(191) NULL,
    `status` ENUM('new', 'in_progress', 'resolved') NOT NULL DEFAULT 'new',
    `assigned_to` VARCHAR(191) NULL,
    `responder_notes` TEXT NULL,
    `attachments` JSON NOT NULL,
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `incidents_status_idx`(`status`),
    INDEX `incidents_type_idx`(`type`),
    INDEX `incidents_created_at_idx`(`created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `type` ENUM('safety_alert', 'advisory', 'trip_reminder', 'announcement', 'emergency') NOT NULL,
    `priority` ENUM('normal', 'high') NOT NULL DEFAULT 'normal',
    `target` JSON NOT NULL,
    `scheduled_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `status` ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    `related_id` VARCHAR(191) NULL,
    `related_type` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `notifications_status_idx`(`status`),
    INDEX `notifications_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` VARCHAR(191) NOT NULL,
    `attraction_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reviews_attraction_id_user_id_key`(`attraction_id`, `user_id`),
    INDEX `reviews_attraction_id_idx`(`attraction_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attractions` ADD CONSTRAINT `attractions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `advisories` ADD CONSTRAINT `advisories_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_reported_by_fkey` FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_attraction_id_fkey` FOREIGN KEY (`attraction_id`) REFERENCES `attractions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
