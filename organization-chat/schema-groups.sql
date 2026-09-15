-- ย้าย conversations ไปรองรับกลุ่ม (รันครั้งเดียวบน D1 ที่ใช้งานอยู่)
CREATE TABLE IF NOT EXISTS conversations_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'direct',
  name TEXT NOT NULL DEFAULT '',
  created_by INTEGER,
  user1_id INTEGER,
  user2_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO conversations_v2 (id, type, name, created_by, user1_id, user2_id, created_at, updated_at)
SELECT id, 'direct', '', user1_id, user1_id, user2_id, created_at, updated_at FROM conversations;

DROP TABLE conversations;
ALTER TABLE conversations_v2 RENAME TO conversations;

CREATE UNIQUE INDEX IF NOT EXISTS idx_direct_pair ON conversations(user1_id, user2_id) WHERE type = 'direct';
CREATE INDEX IF NOT EXISTS idx_conv_updated ON conversations(updated_at);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  last_read_message_id INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role, last_read_message_id, joined_at)
SELECT id, user1_id, 'member', 0, created_at FROM conversations WHERE user1_id IS NOT NULL;

INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role, last_read_message_id, joined_at)
SELECT id, user2_id, 'member', 0, created_at FROM conversations WHERE type = 'direct' AND user2_id IS NOT NULL;
