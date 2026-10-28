-- ============================================================
-- GreenCity AI — PostgreSQL Database Setup Script
-- Run as: psql -U postgres -f setup_postgres.sql
-- ============================================================

-- 1. Create the application database
CREATE DATABASE greencity_db
    WITH ENCODING 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE   = 'en_US.UTF-8'
    TEMPLATE   = template0;

-- 2. Create dedicated application user
CREATE USER greencity_user WITH
    PASSWORD 'greencity123'
    CREATEDB
    LOGIN;

-- 3. Grant privileges
GRANT ALL PRIVILEGES ON DATABASE greencity_db TO greencity_user;

-- 4. Connect to the new database and grant schema privileges
\connect greencity_db

GRANT ALL ON SCHEMA public TO greencity_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO greencity_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO greencity_user;

-- 5. Try to enable uuid-ossp extension (optional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Done
\echo '✅ GreenCity AI PostgreSQL database and user created successfully!'
\echo '   DB:   greencity_db'
\echo '   User: greencity_user'
\echo '   Pass: greencity123'
\echo '   Host: localhost:5432'
