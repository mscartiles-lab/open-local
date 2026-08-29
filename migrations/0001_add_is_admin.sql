-- Migration: add_is_admin
-- Adds is_admin flag to users table and makes role non-nullable with a default
BEGIN;

ALTER TABLE users
  ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Make role NOT NULL with default (existing rows get 'shopper')
ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'shopper',
  ALTER COLUMN role SET NOT NULL;

UPDATE users SET is_admin = true WHERE role = 'admin';

COMMIT;
