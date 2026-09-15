-- Optimize poll: denormalize last message + unread (run once on remote D1)
-- npx wrangler d1 execute fshh-chat --remote --file=./schema-poll-opt.sql

ALTER TABLE conversation_members ADD COLUMN unread_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN last_message_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN last_message_text TEXT NOT NULL DEFAULT '';
ALTER TABLE conversations ADD COLUMN last_message_type TEXT NOT NULL DEFAULT '';
ALTER TABLE conversations ADD COLUMN last_message_sender_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN last_message_at TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_user_unread ON conversation_members(user_id, unread_count);

-- Backfill last message from latest row per conversation
UPDATE conversations
SET
  last_message_id = IFNULL((
    SELECT m.id FROM messages m
    WHERE m.conversation_id = conversations.id
    ORDER BY m.id DESC LIMIT 1
  ), 0),
  last_message_type = IFNULL((
    SELECT m.message_type FROM messages m
    WHERE m.conversation_id = conversations.id
    ORDER BY m.id DESC LIMIT 1
  ), ''),
  last_message_sender_id = IFNULL((
    SELECT m.sender_id FROM messages m
    WHERE m.conversation_id = conversations.id
    ORDER BY m.id DESC LIMIT 1
  ), 0),
  last_message_at = IFNULL((
    SELECT m.created_at FROM messages m
    WHERE m.conversation_id = conversations.id
    ORDER BY m.id DESC LIMIT 1
  ), ''),
  last_message_text = IFNULL((
    SELECT CASE
      WHEN m.message_type = 'sticker' THEN '[สติกเกอร์]'
      WHEN m.message_type = 'image' THEN 'รูปภาพ'
      WHEN m.message_type = 'file' THEN 'ไฟล์แนบ'
      WHEN m.message_type = 'card' THEN 'แจ้งเตือน'
      ELSE substr(m.message, 1, 200)
    END
    FROM messages m
    WHERE m.conversation_id = conversations.id
    ORDER BY m.id DESC LIMIT 1
  ), '')
WHERE EXISTS (
  SELECT 1 FROM messages m WHERE m.conversation_id = conversations.id
);

-- Approximate unread counts (one-time; ongoing increments handled in Worker)
UPDATE conversation_members
SET unread_count = IFNULL((
  SELECT COUNT(*) FROM messages msg
  WHERE msg.conversation_id = conversation_members.conversation_id
    AND msg.id > conversation_members.last_read_message_id
    AND msg.sender_id != conversation_members.user_id
), 0);
