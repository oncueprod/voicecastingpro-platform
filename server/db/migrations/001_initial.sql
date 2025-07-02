-- Only create the profiles table that's causing the 500 error
-- Keep it minimal to avoid conflicts with existing database structure
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
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