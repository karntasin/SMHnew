CREATE TABLE IF NOT EXISTS chat_files (
  id TEXT PRIMARY KEY,
  conversation_id INTEGER NOT NULL,
  uploader_id INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_files_conv ON chat_files(conversation_id);
