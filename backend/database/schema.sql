-- ============================================================
--  CebuSafeTour — PostgreSQL Database Schema
--  Run: psql -U cebusafetour -d cebusafetour_db -f schema.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy text search

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role     AS ENUM ('tourist', 'admin_super', 'admin_content', 'admin_emergency');
CREATE TYPE user_status   AS ENUM ('active', 'suspended', 'banned');
CREATE TYPE user_lang     AS ENUM ('en', 'fil', 'zh', 'ko', 'ja');

CREATE TYPE attraction_category AS ENUM (
  'beach', 'mountain', 'heritage', 'museum',
  'park', 'waterfall', 'market', 'church', 'resort', 'other'
);
CREATE TYPE attraction_safety  AS ENUM ('safe', 'caution', 'restricted');
CREATE TYPE attraction_crowd   AS ENUM ('low', 'moderate', 'high');
CREATE TYPE attraction_status  AS ENUM ('published', 'draft', 'archived');

CREATE TYPE advisory_severity AS ENUM ('critical', 'warning', 'advisory');
CREATE TYPE advisory_source   AS ENUM ('pagasa', 'ndrrmc', 'lgu', 'cdrrmo', 'admin');
CREATE TYPE advisory_status   AS ENUM ('active', 'resolved', 'archived');

CREATE TYPE incident_type    AS ENUM ('medical', 'fire', 'crime', 'natural_disaster', 'lost_person');
CREATE TYPE incident_status  AS ENUM ('new', 'in_progress', 'resolved');

CREATE TYPE notif_type     AS ENUM ('safety_alert', 'advisory', 'trip_reminder', 'announcement', 'emergency');
CREATE TYPE notif_priority AS ENUM ('normal', 'high');
CREATE TYPE notif_status   AS ENUM ('pending', 'sent', 'failed');

-- ============================================================
-- TABLES
-- ============================================================

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(150)  NOT NULL,
  email             VARCHAR(255)  NOT NULL UNIQUE,
  password          VARCHAR(255)  NOT NULL,
  nationality       VARCHAR(100),
  contact_number    VARCHAR(30),
  role              user_role     NOT NULL DEFAULT 'tourist',
  status            user_status   NOT NULL DEFAULT 'active',
  fcm_token         TEXT,
  language          user_lang     NOT NULL DEFAULT 'en',
  is_verified       BOOLEAN       NOT NULL DEFAULT FALSE,
  last_active       TIMESTAMPTZ,
  emergency_contacts JSONB        NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- attractions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attractions (
  id                   UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 VARCHAR(200)          NOT NULL,
  category             attraction_category   NOT NULL,
  description          TEXT,
  district             VARCHAR(100),
  address              VARCHAR(300),
  latitude             DECIMAL(10, 8)        NOT NULL,
  longitude            DECIMAL(11, 8)        NOT NULL,
  photos               JSONB                 NOT NULL DEFAULT '[]',
  operating_hours      JSONB                 NOT NULL DEFAULT '{}',
  entrance_fee         DECIMAL(10, 2)        NOT NULL DEFAULT 0,
  contact_info         JSONB                 NOT NULL DEFAULT '{}',
  safety_status        attraction_safety     NOT NULL DEFAULT 'safe',
  crowd_level          attraction_crowd      NOT NULL DEFAULT 'low',
  accessibility_features JSONB              NOT NULL DEFAULT '[]',
  nearby_facilities    JSONB                 NOT NULL DEFAULT '{}',
  average_rating       DECIMAL(3, 2)         NOT NULL DEFAULT 0,
  total_reviews        INTEGER               NOT NULL DEFAULT 0,
  total_visits         INTEGER               NOT NULL DEFAULT 0,
  total_saves          INTEGER               NOT NULL DEFAULT 0,
  status               attraction_status     NOT NULL DEFAULT 'draft',
  created_by           UUID                  REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- advisories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advisories (
  id                  UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               VARCHAR(300)      NOT NULL,
  description         TEXT              NOT NULL,
  severity            advisory_severity NOT NULL,
  source              advisory_source   NOT NULL DEFAULT 'admin',
  affected_area       JSONB             NOT NULL DEFAULT '{}',
  recommended_actions TEXT,
  start_date          TIMESTAMPTZ       NOT NULL,
  end_date            TIMESTAMPTZ,
  status              advisory_status   NOT NULL DEFAULT 'active',
  notification_sent   BOOLEAN           NOT NULL DEFAULT FALSE,
  acknowledged_by     JSONB             NOT NULL DEFAULT '[]',
  created_by          UUID              REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- incidents
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
  id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  type              incident_type   NOT NULL,
  description       TEXT,
  latitude          DECIMAL(10, 8)  NOT NULL,
  longitude         DECIMAL(11, 8)  NOT NULL,
  nearest_landmark  VARCHAR(200),
  reported_by       UUID            REFERENCES users(id) ON DELETE SET NULL,
  reporter_contact  VARCHAR(50),
  status            incident_status NOT NULL DEFAULT 'new',
  assigned_to       VARCHAR(200),
  responder_notes   TEXT,
  attachments       JSONB           NOT NULL DEFAULT '[]',
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(300)    NOT NULL,
  body          TEXT            NOT NULL,
  type          notif_type      NOT NULL,
  priority      notif_priority  NOT NULL DEFAULT 'normal',
  target        JSONB           NOT NULL DEFAULT '{"type":"all"}',
  scheduled_at  TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  status        notif_status    NOT NULL DEFAULT 'pending',
  related_id    UUID,
  related_type  VARCHAR(50),
  created_by    UUID            REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- users
CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_users_status     ON users(status);
CREATE INDEX idx_users_name_trgm  ON users USING gin(name gin_trgm_ops);

-- attractions
CREATE INDEX idx_attractions_status        ON attractions(status);
CREATE INDEX idx_attractions_category      ON attractions(category);
CREATE INDEX idx_attractions_safety        ON attractions(safety_status);
CREATE INDEX idx_attractions_district      ON attractions(district);
CREATE INDEX idx_attractions_coords        ON attractions(latitude, longitude);
CREATE INDEX idx_attractions_name_trgm     ON attractions USING gin(name gin_trgm_ops);
CREATE INDEX idx_attractions_total_visits  ON attractions(total_visits DESC);

-- advisories
CREATE INDEX idx_advisories_status    ON advisories(status);
CREATE INDEX idx_advisories_severity  ON advisories(severity);
CREATE INDEX idx_advisories_dates     ON advisories(start_date, end_date);

-- incidents
CREATE INDEX idx_incidents_status     ON incidents(status);
CREATE INDEX idx_incidents_type       ON incidents(type);
CREATE INDEX idx_incidents_coords     ON incidents(latitude, longitude);
CREATE INDEX idx_incidents_reported   ON incidents(reported_by);
CREATE INDEX idx_incidents_created    ON incidents(created_at DESC);

-- notifications
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type   ON notifications(type);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_attractions
  BEFORE UPDATE ON attractions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_advisories
  BEFORE UPDATE ON advisories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_incidents
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_notifications
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- COLUMN NOTES (for reference)
-- ============================================================

COMMENT ON TABLE  users                        IS 'Tourist and admin accounts';
COMMENT ON COLUMN users.emergency_contacts     IS '[{name, relationship, phone}]';
COMMENT ON TABLE  attractions                  IS 'Tourist attractions in Cebu';
COMMENT ON COLUMN attractions.operating_hours  IS '{mon:"8am-5pm", tue:"8am-5pm", ...}';
COMMENT ON COLUMN attractions.nearby_facilities IS '{hospitals:[{name,phone,lat,lng}], police:[...], fire:[...]}';
COMMENT ON TABLE  advisories                   IS 'Safety advisories issued by admin or agencies';
COMMENT ON COLUMN advisories.affected_area     IS '{type:"polygon"|"attractions", coordinates:[], attractionIds:[]}';
COMMENT ON TABLE  incidents                    IS 'Emergency incidents reported by tourists';
COMMENT ON TABLE  notifications                IS 'Push notification log';
COMMENT ON COLUMN notifications.target         IS '{type:"all"|"nationality"|"specific", value:...}';
