-- CampusShield Database Schema
-- PostgreSQL 16 + PostGIS 3.4
-- ============================================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- STUDENTS VAULT (encrypted identity store)
-- ============================================================
CREATE TABLE students_vault (
    student_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_email TEXT NOT NULL UNIQUE,
    password_hash    TEXT NOT NULL,  -- Argon2id hash of login password
    encrypted_profile BYTEA NOT NULL, -- AES-256-GCM encrypted JSON (name, photo, dorm, emergency contacts, medical notes)
    checkin_interval_hours INT NOT NULL DEFAULT 48,
    next_checkin_due TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_vault_email ON students_vault(university_email);
CREATE INDEX idx_students_vault_next_checkin ON students_vault(next_checkin_due) WHERE next_checkin_due IS NOT NULL;

-- ============================================================
-- STUDENT AUTH FACTORS (3-password anti-coercion system)
-- ============================================================
CREATE TABLE student_auth_factors (
    student_id      UUID PRIMARY KEY REFERENCES students_vault(student_id) ON DELETE CASCADE,
    hash_pin        TEXT NOT NULL,        -- Argon2id hash of numeric PIN (4-6 digits)
    hash_pattern    TEXT NOT NULL,        -- Argon2id hash of grid pattern (serialized node sequence)
    hash_passphrase TEXT NOT NULL,        -- Argon2id hash of text passphrase
    expected_order  SMALLINT[3] NOT NULL, -- e.g., {2,0,1} = Passphrase->PIN->Pattern
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_order_values CHECK (
        expected_order[1] IN (0,1,2) AND
        expected_order[2] IN (0,1,2) AND
        expected_order[3] IN (0,1,2) AND
        expected_order[1] != expected_order[2] AND
        expected_order[2] != expected_order[3] AND
        expected_order[1] != expected_order[3]
    )
);

-- ============================================================
-- STAFF USERS (university security personnel)
-- ============================================================
CREATE TABLE staff_users (
    staff_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,  -- Argon2id hash
    totp_secret    TEXT,           -- TOTP 2FA secret (base32 encoded)
    role           TEXT NOT NULL CHECK (role IN ('DISPATCHER', 'ADMIN', 'AUDITOR')),
    display_name   TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_users_email ON staff_users(email);

-- ============================================================
-- ACTIVE TRIPS (anonymous live tracking)
-- ============================================================
CREATE TABLE active_trips (
    trip_token            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encrypted_student_ref BYTEA NOT NULL,     -- AES-256-GCM encrypted student_id
    perimeter_geom        GEOMETRY(Polygon, 4326),    -- Safe zone polygon
    destination_geom      GEOMETRY(Point, 4326),      -- Safe destination point
    return_deadline       TIMESTAMPTZ,
    status                TEXT NOT NULL DEFAULT 'ACTIVE'
                          CHECK (status IN (
                              'ACTIVE',
                              'GRACE_PERIOD',
                              'ALERT_SOS',
                              'ALERT_COERCION',
                              'ALERT_PERIMETER_BREACH',
                              'ALERT_MISSED_RETURN',
                              'ALERT_MISSED_CHECKIN',
                              'ALERT_LOW_BATTERY',
                              'RESOLVED',
                              'COMPLETED'
                          )),
    alert_type            TEXT,  -- Stores the specific alert trigger type
    grace_expires_at      TIMESTAMPTZ,  -- When the 60s grace period ends
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_active_trips_status ON active_trips(status);
CREATE INDEX idx_active_trips_return_deadline ON active_trips(return_deadline) WHERE status = 'ACTIVE';
CREATE INDEX idx_active_trips_perimeter ON active_trips USING GIST (perimeter_geom);
CREATE INDEX idx_active_trips_destination ON active_trips USING GIST (destination_geom);

-- ============================================================
-- LOCATION PINGS (GPS breadcrumb trail — NO student_id column)
-- ============================================================
CREATE TABLE location_pings (
    id               BIGSERIAL PRIMARY KEY,
    trip_token       UUID NOT NULL REFERENCES active_trips(trip_token) ON DELETE CASCADE,
    coords           GEOMETRY(Point, 4326) NOT NULL,
    speed            REAL,            -- m/s
    heading          REAL,            -- degrees from north
    accuracy         REAL,            -- meters
    battery_pct      SMALLINT CHECK (battery_pct BETWEEN 0 AND 100),
    low_battery_flag BOOLEAN NOT NULL DEFAULT false,
    recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTE: No student_id column here — privacy by design
CREATE INDEX idx_location_pings_trip ON location_pings(trip_token);
CREATE INDEX idx_location_pings_recorded ON location_pings(recorded_at);
CREATE INDEX idx_location_pings_coords ON location_pings USING GIST (coords);

-- ============================================================
-- UNLOCK AUDIT LOGS (immutable access record)
-- ============================================================
CREATE TABLE unlock_audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    trip_token      UUID NOT NULL,
    student_id      UUID,  -- Populated after unlock
    trigger_reason  TEXT NOT NULL CHECK (trigger_reason IN (
        'SOS',
        'COERCION',
        'PERIMETER_BREACH',
        'MISSED_RETURN',
        'MISSED_CHECKIN',
        'LOW_BATTERY',
        'STAFF_OVERRIDE'
    )),
    unlocked_by     TEXT NOT NULL,     -- 'SYSTEM' or staff_id
    details         JSONB,            -- Additional context (coordinates, battery level, etc.)
    unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Make this table append-only via a trigger that prevents UPDATE and DELETE
CREATE INDEX idx_audit_logs_trip ON unlock_audit_logs(trip_token);
CREATE INDEX idx_audit_logs_time ON unlock_audit_logs(unlocked_at);
CREATE INDEX idx_audit_logs_trigger ON unlock_audit_logs(trigger_reason);

-- Immutability trigger: prevent updates and deletes on audit logs
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are not permitted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
    BEFORE UPDATE OR DELETE ON unlock_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

-- ============================================================
-- ALERTS (active emergency incidents)
-- ============================================================
CREATE TABLE alerts (
    alert_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_token       UUID NOT NULL REFERENCES active_trips(trip_token),
    student_id       UUID REFERENCES students_vault(student_id),
    alert_type       TEXT NOT NULL CHECK (alert_type IN (
        'SOS',
        'COERCION',
        'PERIMETER_BREACH',
        'MISSED_RETURN',
        'MISSED_CHECKIN',
        'LOW_BATTERY'
    )),
    priority         SMALLINT NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    status           TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
    decrypted_profile JSONB,           -- Unlocked student profile data
    last_known_coords GEOMETRY(Point, 4326),
    nearest_police    JSONB,           -- Nearest police station info from Overpass API
    resolution_note   TEXT,
    resolved_by       UUID REFERENCES staff_users(staff_id),
    resolved_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_status ON alerts(status) WHERE status != 'RESOLVED';
CREATE INDEX idx_alerts_priority ON alerts(priority, created_at) WHERE status = 'OPEN';
CREATE INDEX idx_alerts_trip ON alerts(trip_token);

-- ============================================================
-- CHECKIN REMINDERS (tracking scheduled reminders)
-- ============================================================
CREATE TABLE checkin_reminders (
    id              BIGSERIAL PRIMARY KEY,
    student_id      UUID NOT NULL REFERENCES students_vault(student_id) ON DELETE CASCADE,
    reminder_type   TEXT NOT NULL CHECK (reminder_type IN ('4_HOUR', '1_HOUR', 'FINAL')),
    scheduled_for   TIMESTAMPTZ NOT NULL,
    sent            BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkin_reminders_scheduled ON checkin_reminders(scheduled_for) WHERE sent = false;
