-- Remove the old password_hash column and fix the users table structure
ALTER TABLE users DROP COLUMN IF EXISTS password_hash CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS type CASCADE;

-- Make sure the password column is NOT NULL (since auth requires it)
ALTER TABLE users ALTER COLUMN password SET NOT NULL;