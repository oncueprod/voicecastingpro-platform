-- First, copy existing password data from password_hash to password column
UPDATE users SET password = password_hash WHERE password_hash IS NOT NULL AND password IS NULL;

-- Delete any users that have no password data at all (corrupted records)
DELETE FROM users WHERE password_hash IS NULL AND password IS NULL;

-- Now remove the old columns
ALTER TABLE users DROP COLUMN IF EXISTS password_hash CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS type CASCADE;

-- Finally, make password column NOT NULL (now that all rows have values)
ALTER TABLE users ALTER COLUMN password SET NOT NULL;