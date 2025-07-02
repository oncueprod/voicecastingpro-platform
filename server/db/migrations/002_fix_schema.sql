-- Drop existing profiles table with wrong schema
DROP TABLE IF EXISTS profiles CASCADE;

-- Add missing columns to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- Recreate profiles table with correct schema that matches auth.js
CREATE TABLE profiles (
  id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('client', 'talent')),
  avatar_url VARCHAR(255),
  bio TEXT,
  location VARCHAR(255),
  website VARCHAR(255),
  social_links JSONB DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  experience_level VARCHAR(50),
  hourly_rate DECIMAL(10,2),
  portfolio_items JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create talent_profiles table referenced in auth.js
CREATE TABLE IF NOT EXISTS talent_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  specializations TEXT[],
  years_experience INTEGER,
  demo_reel_url VARCHAR(255),
  voice_age_range VARCHAR(100),
  voice_description TEXT,
  equipment TEXT,
  studio_setup TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_talent_profiles_user_id ON talent_profiles(user_id);