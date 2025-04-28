-- D1 Database Migration for Social Previews
-- Run with: npx wrangler d1 execute social_previews --file=./migrations/init.sql

-- Create table for social previews
CREATE TABLE IF NOT EXISTS social_previews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_social_previews_path ON social_previews(path);

-- Create trigger to update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_social_previews_timestamp 
AFTER UPDATE ON social_previews
FOR EACH ROW
BEGIN
  UPDATE social_previews SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;

-- Insert default social preview if needed
INSERT OR IGNORE INTO social_previews (path, title, description, image_url, is_default) 
VALUES ('/_default_', 'Default Blog Title', 'Default blog description for social sharing', 'https://yourdomain.com/images/default-social.jpg', 1);
