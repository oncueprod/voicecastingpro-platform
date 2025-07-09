-- Create email log table to track sent emails and prevent spam
CREATE TABLE IF NOT EXISTS email_log (
  id SERIAL PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL, -- 'message_notification', 'daily_digest', etc.
  sent_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance and rate limiting queries
CREATE INDEX IF NOT EXISTS idx_email_log_recipient_conversation ON email_log(recipient_email, conversation_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON email_log(sent_at);

-- Auto-cleanup old email logs (keep only last 30 days for rate limiting)
-- This can be run as a scheduled job
-- DELETE FROM email_log WHERE sent_at < NOW() - INTERVAL '30 days';