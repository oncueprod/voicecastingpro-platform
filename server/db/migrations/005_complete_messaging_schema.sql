-- Add missing columns to existing tables
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP DEFAULT NOW();

ALTER TABLE messages ADD COLUMN IF NOT EXISTS filtered_content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_filtered BOOLEAN DEFAULT FALSE;

-- Create content filters table
CREATE TABLE IF NOT EXISTS content_filters (
  id SERIAL PRIMARY KEY,
  pattern VARCHAR(255) NOT NULL,
  replacement VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create file attachments table
CREATE TABLE IF NOT EXISTS file_attachments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  content_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create message attachments table (junction table)
CREATE TABLE IF NOT EXISTS message_attachments (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  file_attachment_id INTEGER REFERENCES file_attachments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, file_attachment_id)
);

-- Insert some basic content filters to prevent off-platform contact
INSERT INTO content_filters (pattern, replacement, is_active) VALUES
  ('[\w\.-]+@[\w\.-]+\.\w+', '[email removed]', TRUE),
  ('\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[phone removed]', TRUE),
  ('@\w+', '[social handle removed]', TRUE)
ON CONFLICT DO NOTHING;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_file_attachments_user_id ON file_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);