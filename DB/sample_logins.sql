-- ============================================================
-- sample_logins.sql
-- Sample user accounts for development/testing
-- Password: admin (bcrypt hash)
-- ============================================================

INSERT INTO users (username, password_hash, role)
VALUES (
    'admin',
    '$2b$10$YourBcryptHashHere',  -- bcrypt hash of 'admin' — replace with actual hash at seed time
    'admin'
);
