-- Only create the missing profiles table that's causing the 500 error
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  bio TEXT,
  location VARCHAR(255),
  website VARCHAR(255),
  social_links JSONB,
  skills TEXT[],
  experience_level VARCHAR(50),
  hourly_rate DECIMAL(10,2),
  portfolio_items JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create other essential missing tables (without foreign key constraints for now)
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  participants INTEGER[] NOT NULL,
  project_id INTEGER,
  project_title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER,
  sender_id INTEGER,
  recipient_id INTEGER,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'text',
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes only for new tables
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);