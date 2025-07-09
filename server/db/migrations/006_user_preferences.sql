-- Create user preferences table for email notifications
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  message_email_notifications BOOLEAN DEFAULT TRUE,
  daily_digest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id, email_notifications, message_email_notifications, daily_digest)
SELECT id, TRUE, TRUE, FALSE FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);