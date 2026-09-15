ALTER TABLE users ADD COLUMN laravel_user_id INTEGER;
ALTER TABLE conversations ADD COLUMN source TEXT NOT NULL DEFAULT '';
ALTER TABLE conversations ADD COLUMN source_key TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_source
  ON conversations(source, source_key) WHERE source != '';
