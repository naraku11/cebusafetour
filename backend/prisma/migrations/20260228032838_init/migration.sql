-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('tourist', 'admin_super', 'admin_content', 'admin_emergency');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'banned');

-- CreateEnum
CREATE TYPE "UserLanguage" AS ENUM ('en', 'fil', 'zh', 'ko', 'ja');

-- CreateEnum
CREATE TYPE "AttractionCategory" AS ENUM ('beach', 'mountain', 'heritage', 'museum', 'park', 'waterfall', 'market', 'church', 'resort', 'other');

-- CreateEnum
CREATE TYPE "SafetyStatus" AS ENUM ('safe', 'caution', 'restricted');

-- CreateEnum
CREATE TYPE "CrowdLevel" AS ENUM ('low', 'moderate', 'high');

-- CreateEnum
CREATE TYPE "AttractionStatus" AS ENUM ('published', 'draft', 'archived');

-- CreateEnum
CREATE TYPE "AdvisorySeverity" AS ENUM ('critical', 'warning', 'advisory');

-- CreateEnum
CREATE TYPE "AdvisorySource" AS ENUM ('pagasa', 'ndrrmc', 'lgu', 'cdrrmo', 'admin');

-- CreateEnum
CREATE TYPE "AdvisoryStatus" AS ENUM ('active', 'resolved', 'archived');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('medical', 'fire', 'crime', 'natural_disaster', 'lost_person');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('new', 'in_progress', 'resolved');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('safety_alert', 'advisory', 'trip_reminder', 'announcement', 'emergency');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('normal', 'high');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nationality" TEXT,
    "contact_number" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'tourist',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "fcm_token" TEXT,
    "language" "UserLanguage" NOT NULL DEFAULT 'en',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_active" TIMESTAMP(3),
    "emergency_contacts" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attractions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AttractionCategory" NOT NULL,
    "description" TEXT,
    "district" TEXT,
    "address" TEXT,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "operating_hours" JSONB NOT NULL DEFAULT '{}',
    "entrance_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "contact_info" JSONB NOT NULL DEFAULT '{}',
    "safety_status" "SafetyStatus" NOT NULL DEFAULT 'safe',
    "crowd_level" "CrowdLevel" NOT NULL DEFAULT 'low',
    "accessibility_features" JSONB NOT NULL DEFAULT '[]',
    "nearby_facilities" JSONB NOT NULL DEFAULT '{}',
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "total_visits" INTEGER NOT NULL DEFAULT 0,
    "total_saves" INTEGER NOT NULL DEFAULT 0,
    "status" "AttractionStatus" NOT NULL DEFAULT 'draft',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "AdvisorySeverity" NOT NULL,
    "source" "AdvisorySource" NOT NULL DEFAULT 'admin',
    "affected_area" JSONB NOT NULL DEFAULT '{}',
    "recommended_actions" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" "AdvisoryStatus" NOT NULL DEFAULT 'active',
    "notification_sent" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advisories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "description" TEXT,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "nearest_landmark" TEXT,
    "reported_by" TEXT,
    "reporter_contact" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'new',
    "assigned_to" TEXT,
    "responder_notes" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'normal',
    "target" JSONB NOT NULL DEFAULT '{"type":"all"}',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "related_id" TEXT,
    "related_type" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "attractions_status_idx" ON "attractions"("status");

-- CreateIndex
CREATE INDEX "attractions_category_idx" ON "attractions"("category");

-- CreateIndex
CREATE INDEX "attractions_safety_status_idx" ON "attractions"("safety_status");

-- CreateIndex
CREATE INDEX "attractions_district_idx" ON "attractions"("district");

-- CreateIndex
CREATE INDEX "attractions_total_visits_idx" ON "attractions"("total_visits" DESC);

-- CreateIndex
CREATE INDEX "advisories_status_idx" ON "advisories"("status");

-- CreateIndex
CREATE INDEX "advisories_severity_idx" ON "advisories"("severity");

-- CreateIndex
CREATE INDEX "advisories_start_date_end_date_idx" ON "advisories"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_type_idx" ON "incidents"("type");

-- CreateIndex
CREATE INDEX "incidents_created_at_idx" ON "incidents"("created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- AddForeignKey
ALTER TABLE "attractions" ADD CONSTRAINT "attractions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisories" ADD CONSTRAINT "advisories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
