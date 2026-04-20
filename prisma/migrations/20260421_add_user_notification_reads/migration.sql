CREATE TABLE `user_notification_reads` (
    `user_id`         VARCHAR(191) NOT NULL,
    `notification_id` VARCHAR(191) NOT NULL,
    `read_at`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`user_id`, `notification_id`),

    CONSTRAINT `unr_user_fkey`
        FOREIGN KEY (`user_id`)
        REFERENCES `users`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT `unr_notif_fkey`
        FOREIGN KEY (`notification_id`)
        REFERENCES `notifications`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `unr_user_id_idx` ON `user_notification_reads`(`user_id`);
