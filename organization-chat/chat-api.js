import { isValidStickerId, stickerPreviewText } from './stickers.js';

export const SYSTEM_LINE_ID = '__fshh_system__';

const SESSION_HOURS = 6;

export function nowIso() {
  return new Date().toISOString();
}

const ONLINE_MS = 3 * 60 * 1000;
const HEARTBEAT_MS = 120 * 1000;

let pollSchemaReady = false;
let pollBackfillTried = false;

/** Ensure denormalized poll columns exist (safe if already applied). */
export async function ensurePollOptSchema(env) {
  if (pollSchemaReady || !env?.DB) return;
  const alters = [
    'ALTER TABLE conversation_members ADD COLUMN unread_count INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE conversations ADD COLUMN last_message_id INTEGER NOT NULL DEFAULT 0',
    "ALTER TABLE conversations ADD COLUMN last_message_text TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE conversations ADD COLUMN last_message_type TEXT NOT NULL DEFAULT ''",
    'ALTER TABLE conversations ADD COLUMN last_message_sender_id INTEGER NOT NULL DEFAULT 0',
    "ALTER TABLE conversations ADD COLUMN last_message_at TEXT NOT NULL DEFAULT ''",
  ];
  for (const sql of alters) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
      // duplicate column name — already migrated
    }
  }
  try {
    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_members_user ON conversation_members(user_id)'
    ).run();
  } catch {
    // ignore
  }
  pollSchemaReady = true;

  if (!pollBackfillTried) {
    pollBackfillTried = true;
    try {
      // Cheap check: any conversation still missing last_message snapshot?
      const miss = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM conversations c
         WHERE IFNULL(c.last_message_id, 0) = 0
           AND EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id LIMIT 1)`
      ).first();
      if (miss && Number(miss.n) > 0) {
        await env.DB.prepare(
          `UPDATE conversations
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
           WHERE IFNULL(last_message_id, 0) = 0
             AND EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = conversations.id LIMIT 1)`
        ).run();
        await env.DB.prepare(
          `UPDATE conversation_members
           SET unread_count = IFNULL((
             SELECT COUNT(*) FROM messages msg
             WHERE msg.conversation_id = conversation_members.conversation_id
               AND msg.id > conversation_members.last_read_message_id
               AND msg.sender_id != conversation_members.user_id
           ), 0)
           WHERE IFNULL(unread_count, 0) = 0`
        ).run();
      }
    } catch {
      // May fail while free-tier read quota is exhausted; next cold start retries.
    }
  }
}

/**
 * After inserting a message: update conversation preview + bump unread for others.
 * Avoids scanning messages table on every poll.
 */
export async function recordOutboundMessage(env, {
  conversationId,
  messageId,
  senderId,
  messageType = 'text',
  message = '',
  createdAt,
}) {
  await ensurePollOptSchema(env);
  const ts = createdAt || nowIso();
  const convId = Number(conversationId);
  const msgId = Number(messageId);
  const preview = String(
    lastMessagePreview({ message_type: messageType, message }) || ''
  ).slice(0, 200);

  await env.DB.prepare(
    `UPDATE conversations SET
        updated_at = ?,
        last_message_id = ?,
        last_message_text = ?,
        last_message_type = ?,
        last_message_sender_id = ?,
        last_message_at = ?
      WHERE id = ?`
  )
    .bind(ts, msgId, preview, messageType, Number(senderId), ts, convId)
    .run();

  await env.DB.prepare(
    `UPDATE conversation_members
     SET unread_count = unread_count + 1
     WHERE conversation_id = ? AND user_id != ?`
  )
    .bind(convId, Number(senderId))
    .run();
}

function isOnlineFromLogin(lastLogin) {
  if (!lastLogin) return false;
  const t = Date.parse(lastLogin);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < ONLINE_MS;
}

function serializeUser(row) {
  if (!row) return null;
  const lastLogin = row.last_login || '';
  const online = isOnlineFromLogin(lastLogin);
  return {
    userId: String(row.id),
    lineUserId: String(row.line_user_id || ''),
    displayName: row.display_name || 'LINE User',
    department: row.department || '',
    email: row.email || '',
    avatar: row.avatar || '',
    status: online ? 'online' : 'offline',
    online,
    createdAt: row.created_at || '',
    lastLogin,
  };
}

async function touchPresence(env, userId) {
  if (!userId) return;
  const cutoff = new Date(Date.now() - HEARTBEAT_MS).toISOString();
  await env.DB.prepare(
    `UPDATE users SET last_login = ? WHERE id = ? AND (last_login IS NULL OR last_login < ?)`
  )
    .bind(nowIso(), userId, cutoff)
    .run();
}

export function sanitizeCardColor(value) {
  const s = String(value || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(s) ? s.toUpperCase() : '';
}

export function parseCardMessage(raw) {
  try {
    const data = JSON.parse(raw || '');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const fields = [];
    if (Array.isArray(data.fields)) {
      for (const item of data.fields) {
        if (!item || typeof item !== 'object') continue;
        const label = String(item.label || '').trim();
        const value = String(item.value || '').trim();
        if (label && value) fields.push({ label, value });
      }
    }
    return {
      title: String(data.title || '').trim(),
      body: String(data.body || '').trim(),
      color: sanitizeCardColor(data.color) || '#64748B',
      priority: String(data.priority || '').trim(),
      fields,
    };
  } catch {
    return null;
  }
}

function cardFallbackText(card) {
  if (!card) return '';
  const lines = [];
  if (card.title) lines.push(card.title);
  if (card.priority) lines.push('ความสำคัญ: ' + card.priority);
  if (card.fields && card.fields.length) {
    for (const field of card.fields) {
      lines.push(field.label + ': ' + field.value);
    }
  } else if (card.body) {
    lines.push(card.body);
  }
  return lines.join('\n');
}

export function serializeMessage(row) {
  const type = row.message_type || 'text';
  let attachment = null;
  let card = null;
  let message = row.message || '';
  if (type === 'file' || type === 'image') {
    try {
      const data = JSON.parse(row.message || '');
      if (data && data.fileId) {
        attachment = {
          fileId: String(data.fileId),
          name: data.name || 'file',
          mime: data.mime || '',
          size: Number(data.size) || 0,
        };
      }
    } catch {
      attachment = null;
    }
  }
  if (type === 'card') {
    card = parseCardMessage(row.message);
    if (card) message = cardFallbackText(card);
  }
  return {
    messageId: 'M' + row.id,
    conversationId: String(row.conversation_id),
    senderId: String(row.sender_id),
    receiverId: String(row.receiver_id),
    messageType: type,
    message,
    attachment,
    card,
    timestamp: row.created_at,
    isRead: Boolean(row.is_read),
  };
}

function lastMessagePreview(row) {
  if (!row) return '';
  const type = row.message_type || 'text';
  if (type === 'sticker') return stickerPreviewText();
  if (type === 'image') return 'รูปภาพ';
  if (type === 'file') {
    try {
      const data = JSON.parse(row.message || '');
      return data && data.name ? 'ไฟล์: ' + data.name : 'ไฟล์แนบ';
    } catch {
      return 'ไฟล์แนบ';
    }
  }
  if (type === 'card') {
    const card = parseCardMessage(row.message);
    if (card) return [card.title, card.priority].filter(Boolean).join(' · ') || 'แจ้งเตือน';
  }
  return row.message || '';
}

async function verifyLineIdToken(idToken, channelId) {
  const body = new URLSearchParams({
    id_token: idToken,
    client_id: channelId,
  });
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    return { success: false, error: 'LINE Token verification failed: ' + text };
  }
  const data = JSON.parse(text);
  const aud = String(data.aud || data.client_id || '');
  if (aud !== String(channelId)) {
    return { success: false, error: 'LINE Channel ID ไม่ตรง (aud=' + aud + ')' };
  }
  return {
    success: true,
    sub: String(data.sub || ''),
    name: String(data.name || 'LINE User'),
    picture: data.picture || '',
    email: data.email || '',
  };
}

function sessionToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function createSession(env, userId) {
  const token = sessionToken();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  )
    .bind(token, userId, expiresAt)
    .run();
  return { token, expiresAt };
}

export async function resolveUser(env, token) {
  if (!token) throw new Error('SESSION_EXPIRED');
  const user = await env.DB.prepare(
    `SELECT u.*, s.expires_at AS session_expires_at
     FROM sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`
  )
    .bind(token)
    .first();
  if (!user) throw new Error('SESSION_EXPIRED');
  if (new Date(user.session_expires_at).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    throw new Error('SESSION_EXPIRED');
  }
  return user;
}

export async function findOrCreateUser(env, lineUserId, displayName, pictureUrl, email) {
  let user = await env.DB.prepare('SELECT * FROM users WHERE line_user_id = ?')
    .bind(lineUserId)
    .first();
  const ts = nowIso();
  if (!user) {
    const result = await env.DB.prepare(
      `INSERT INTO users (line_user_id, display_name, department, email, avatar, last_login, created_at)
       VALUES (?, ?, '', ?, ?, ?, ?)`
    )
      .bind(lineUserId, displayName || 'LINE User', email || '', pictureUrl || '', ts, ts)
      .run();
    user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();
  } else if (user.laravel_user_id) {
    await env.DB.prepare(
      `UPDATE users SET last_login = ?,
         avatar = CASE WHEN avatar = '' AND ? != '' THEN ? ELSE avatar END
       WHERE id = ?`
    )
      .bind(ts, pictureUrl || '', pictureUrl || '', user.id)
      .run();
    user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
  } else {
    await env.DB.prepare(
      `UPDATE users SET display_name = ?, avatar = CASE WHEN ? = '' THEN avatar ELSE ? END,
       last_login = ? WHERE id = ?`
    )
      .bind(displayName || user.display_name, pictureUrl || '', pictureUrl || '', ts, user.id)
      .run();
    user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
  }
  return user;
}

export async function loginResponse(env, user) {
  const session = await createSession(env, user.id);
  return {
    success: true,
    sessionToken: session.token,
    expiresAt: session.expiresAt,
    user: serializeUser(user),
  };
}

export async function getUsers(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM users
     WHERE line_user_id != ?
     ORDER BY display_name COLLATE NOCASE ASC`
  )
    .bind(SYSTEM_LINE_ID)
    .all();
  return (results || []).map(serializeUser);
}

function parseIds(raw) {
  if (Array.isArray(raw)) return raw.map(Number).filter((n) => n > 0);
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[,\s]+/).map(Number).filter((n) => n > 0);
  }
  if (raw != null && raw !== '') return [Number(raw)].filter((n) => n > 0);
  return [];
}

function isManagedConv(conv) {
  return Boolean(conv && String(conv.source || '').trim());
}

export function isGroupConv(conv) {
  return conv && String(conv.type || 'direct') === 'group';
}

function groupAsUser(conv, memberCount) {
  return {
    userId: 'g' + conv.id,
    displayName: conv.name || 'กลุ่ม',
    department: '',
    avatar: '',
    isGroup: true,
    memberCount: memberCount || 0,
    status: (memberCount || 0) + ' คน',
  };
}

export async function addMember(env, conversationId, userId, role, ts) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO conversation_members
     (conversation_id, user_id, role, last_read_message_id, joined_at)
     VALUES (?, ?, ?, 0, ?)`
  )
    .bind(conversationId, userId, role || 'member', ts)
    .run();
}

export async function getOrCreateConversation(env, userId, otherUserId) {
  const a = Number(otherUserId);
  if (!a || a === Number(userId)) {
    throw new Error(a === Number(userId) ? 'ไม่สามารถสนทนากับตัวเองได้' : 'ไม่พบผู้ใช้งาน');
  }
  const u1 = Math.min(Number(userId), a);
  const u2 = Math.max(Number(userId), a);
  let conv = await env.DB.prepare(
    `SELECT * FROM conversations WHERE type = 'direct' AND user1_id = ? AND user2_id = ?`
  )
    .bind(u1, u2)
    .first();
  if (!conv) {
    const ts = nowIso();
    const result = await env.DB.prepare(
      `INSERT INTO conversations (type, name, created_by, user1_id, user2_id, created_at, updated_at)
       VALUES ('direct', '', ?, ?, ?, ?, ?)`
    )
      .bind(userId, u1, u2, ts, ts)
      .run();
    conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();
    await addMember(env, conv.id, u1, 'member', ts);
    await addMember(env, conv.id, u2, 'member', ts);
  }
  return { success: true, conversationId: String(conv.id), type: 'direct' };
}

export async function requireConversation(env, userId, conversationId) {
  const conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?')
    .bind(Number(conversationId))
    .first();
  if (!conv) throw new Error('ไม่มีสิทธิ์เข้าถึง Conversation นี้');
  const member = await env.DB.prepare(
    'SELECT role FROM conversation_members WHERE conversation_id = ? AND user_id = ?'
  )
    .bind(conv.id, userId)
    .first();
  if (member) {
    conv._role = member.role;
    return conv;
  }
  if (!isGroupConv(conv) && (conv.user1_id === userId || conv.user2_id === userId)) {
    conv._role = 'member';
    return conv;
  }
  throw new Error('ไม่มีสิทธิ์เข้าถึง Conversation นี้');
}

async function listMembers(env, conversationId) {
  const { results } = await env.DB.prepare(
    `SELECT u.*, m.role FROM conversation_members m
     JOIN users u ON u.id = m.user_id
     WHERE m.conversation_id = ?
     ORDER BY m.role DESC, u.display_name COLLATE NOCASE ASC`
  )
    .bind(conversationId)
    .all();
  return (results || [])
    .filter((row) => String(row.line_user_id || '') !== SYSTEM_LINE_ID)
    .map((row) => ({
    ...serializeUser(row),
    role: row.role || 'member',
  }));
}

async function createGroup(env, creatorId, name, memberIds) {
  const groupName = String(name || '').trim();
  if (!groupName) throw new Error('กรุณาใส่ชื่อกลุ่ม');
  const ids = [...new Set([creatorId, ...parseIds(memberIds)])];
  if (ids.length < 2) throw new Error('เลือกสมาชิกอย่างน้อย 1 คน');
  if (ids.length > 50) throw new Error('กลุ่มได้สูงสุด 50 คน');
  const ts = nowIso();
  const result = await env.DB.prepare(
    `INSERT INTO conversations (type, name, created_by, user1_id, user2_id, created_at, updated_at)
     VALUES ('group', ?, ?, ?, NULL, ?, ?)`
  )
    .bind(groupName, creatorId, creatorId, ts, ts)
    .run();
  const convId = result.meta.last_row_id;
  for (const id of ids) {
    await addMember(env, convId, id, id === creatorId ? 'admin' : 'member', ts);
  }
  await env.DB.prepare(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_type, message, is_read, created_at)
     VALUES (?, ?, 0, 'system', ?, 1, ?)`
  )
    .bind(convId, creatorId, 'สร้างกลุ่ม «' + groupName + '»', ts)
    .run();
  return { success: true, conversationId: String(convId), type: 'group', name: groupName };
}

async function groupInfo(env, userId, conversationId) {
  const conv = await requireConversation(env, userId, conversationId);
  const members = await listMembers(env, conv.id);
  return {
    success: true,
    conversationId: String(conv.id),
    type: conv.type || 'direct',
    name: conv.name || '',
    createdBy: conv.created_by ? String(conv.created_by) : '',
    myRole: conv._role || 'member',
    members,
    source: conv.source || '',
    sourceKey: conv.source_key || '',
    managed: isManagedConv(conv),
  };
}

async function addGroupMembers(env, userId, conversationId, memberIds) {
  const conv = await requireConversation(env, userId, conversationId);
  if (!isGroupConv(conv)) throw new Error('ใช้ได้เฉพาะกลุ่ม');
  if (isManagedConv(conv)) throw new Error('กลุ่มแผนก/ฝ่าย จัดการสมาชิกจากเว็บแอป');
  if (conv._role !== 'admin') throw new Error('เฉพาะหัวหน้ากลุ่มที่เพิ่มสมาชิกได้');
  const ids = parseIds(memberIds);
  if (!ids.length) throw new Error('เลือกสมาชิกที่จะเพิ่ม');
  const ts = nowIso();
  for (const id of ids) {
    if (id === userId) continue;
    const exists = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!exists) continue;
    await addMember(env, conv.id, id, 'member', ts);
  }
  await env.DB.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').bind(ts, conv.id).run();
  return groupInfo(env, userId, conv.id);
}

async function leaveOrRemove(env, userId, conversationId, targetUserId) {
  const conv = await requireConversation(env, userId, conversationId);
  if (!isGroupConv(conv)) throw new Error('ใช้ได้เฉพาะกลุ่ม');
  if (isManagedConv(conv)) throw new Error('กลุ่มแผนก/ฝ่าย ออกหรือลบสมาชิกจากเว็บแอปเท่านั้น');
  const target = Number(targetUserId || userId);
  if (target !== userId && conv._role !== 'admin') {
    throw new Error('เฉพาะหัวหน้ากลุ่มที่ลบสมาชิกได้');
  }
  await env.DB.prepare(
    'DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?'
  )
    .bind(conv.id, target)
    .run();
  const left = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM conversation_members WHERE conversation_id = ?'
  )
    .bind(conv.id)
    .first();
  if (!left || Number(left.n) === 0) {
    await env.DB.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(conv.id).run();
    await env.DB.prepare('DELETE FROM conversations WHERE id = ?').bind(conv.id).run();
    return { success: true, deleted: true };
  }
  if (target === conv.created_by) {
    const nextAdmin = await env.DB.prepare(
      'SELECT user_id FROM conversation_members WHERE conversation_id = ? ORDER BY joined_at ASC LIMIT 1'
    )
      .bind(conv.id)
      .first();
    if (nextAdmin) {
      await env.DB.prepare(
        `UPDATE conversation_members SET role = 'admin' WHERE conversation_id = ? AND user_id = ?`
      )
        .bind(conv.id, nextAdmin.user_id)
        .run();
    }
  }
  return { success: true, left: true };
}

async function renameGroup(env, userId, conversationId, name) {
  const conv = await requireConversation(env, userId, conversationId);
  if (!isGroupConv(conv)) throw new Error('ใช้ได้เฉพาะกลุ่ม');
  if (isManagedConv(conv)) throw new Error('กลุ่มแผนก/ฝ่าย ใช้ชื่อจากเว็บแอป');
  if (conv._role !== 'admin') throw new Error('เฉพาะหัวหน้ากลุ่มที่เปลี่ยนชื่อได้');
  const groupName = String(name || '').trim();
  if (!groupName) throw new Error('กรุณาใส่ชื่อกลุ่ม');
  await env.DB.prepare('UPDATE conversations SET name = ?, updated_at = ? WHERE id = ?')
    .bind(groupName, nowIso(), conv.id)
    .run();
  return { success: true, name: groupName };
}

async function getUserConversations(env, userId, options = {}) {
  const sinceUpdatedAt = options.sinceUpdatedAt ? String(options.sinceUpdatedAt) : '';
  // Select c.* / m.* so older D1 schemas (before poll-opt columns) still work.
  let sql = `SELECT c.*,
      m.unread_count AS member_unread_count,
      m.last_read_message_id AS member_last_read,
      (SELECT COUNT(*) FROM conversation_members cm2 WHERE cm2.conversation_id = c.id) AS member_count
     FROM conversations c
     INNER JOIN conversation_members m ON m.conversation_id = c.id
     WHERE m.user_id = ?`;
  const binds = [userId];
  if (sinceUpdatedAt) {
    sql += ' AND c.updated_at > ?';
    binds.push(sinceUpdatedAt);
  }
  sql += ' ORDER BY c.updated_at DESC';

  let convs = [];
  try {
    const res = await env.DB.prepare(sql).bind(...binds).all();
    convs = res.results || [];
  } catch (err) {
    // Fallback if unread_count column is still missing.
    const fallbackSql = `SELECT c.*,
        m.last_read_message_id AS member_last_read,
        (SELECT COUNT(*) FROM conversation_members cm2 WHERE cm2.conversation_id = c.id) AS member_count
       FROM conversations c
       INNER JOIN conversation_members m ON m.conversation_id = c.id
       WHERE m.user_id = ?
       ${sinceUpdatedAt ? 'AND c.updated_at > ?' : ''}
       ORDER BY c.updated_at DESC`;
    const fbBinds = sinceUpdatedAt ? [userId, sinceUpdatedAt] : [userId];
    const res = await env.DB.prepare(fallbackSql).bind(...fbBinds).all();
    convs = res.results || [];
  }
  if (!convs.length) return [];

  const otherIds = [
    ...new Set(
      convs
        .filter((c) => !isGroupConv(c))
        .map((c) => (c.user1_id === userId ? c.user2_id : c.user1_id))
        .filter(Boolean)
    ),
  ];
  const othersMap = {};
  if (otherIds.length) {
    const otherPlaceholders = otherIds.map(() => '?').join(',');
    const { results: others } = await env.DB.prepare(
      `SELECT id, line_user_id, display_name, department, email, avatar, last_login, created_at
       FROM users WHERE id IN (${otherPlaceholders})`
    )
      .bind(...otherIds)
      .all();
    for (const u of others || []) othersMap[u.id] = u;
  }

  const out = convs.map((c) => {
    const group = isGroupConv(c);
    const otherId = group ? null : c.user1_id === userId ? c.user2_id : c.user1_id;
    const hasDenorm = Number(c.last_message_id || 0) > 0 || Boolean(c.last_message_text);
    const last = hasDenorm
      ? {
          message_type: c.last_message_type,
          message: c.last_message_text,
          created_at: c.last_message_at,
          sender_id: c.last_message_sender_id,
        }
      : null;
    return {
      conversationId: String(c.id),
      type: group ? 'group' : 'direct',
      name: c.name || '',
      user1Id: String(c.user1_id || ''),
      user2Id: String(c.user2_id || ''),
      otherUser: group
        ? groupAsUser(
            c,
            Math.max(0, (Number(c.member_count) || 0) - (isManagedConv(c) ? 1 : 0))
          )
        : serializeUser(othersMap[otherId]),
      lastMessage: c.last_message_text || lastMessagePreview(last),
      lastMessageType: c.last_message_type || '',
      lastMessageAt: c.last_message_at || c.updated_at || '',
      unreadCount: Number(c.member_unread_count || c.unread_count || 0),
      source: c.source || '',
      sourceKey: c.source_key || '',
      managed: isManagedConv(c),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  });
  out.sort((a, b) => {
    const ta = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
    const tb = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
    return tb - ta;
  });
  return out;
}

async function sumUnread(env, userId) {
  try {
    const row = await env.DB.prepare(
      'SELECT COALESCE(SUM(unread_count), 0) AS total FROM conversation_members WHERE user_id = ?'
    )
      .bind(userId)
      .first();
    return Number(row?.total || 0);
  } catch {
    return 0;
  }
}

async function getMessages(env, userId, conversationId, limit, since, sinceMessageId) {
  await requireConversation(env, userId, conversationId);
  const cap = since || sinceMessageId ? Math.max(Number(limit) || 80, 200) : Number(limit) || 80;
  let sql = 'SELECT * FROM messages WHERE conversation_id = ?';
  const binds = [Number(conversationId)];
  if (sinceMessageId && Number(sinceMessageId) > 0) {
    sql += ' AND id > ?';
    binds.push(Number(sinceMessageId));
  } else if (since) {
    sql += ' AND created_at > ?';
    binds.push(since);
  }
  sql += ' ORDER BY id DESC LIMIT ?';
  binds.push(cap);
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return (results || []).reverse().map(serializeMessage);
}

async function sendMessage(env, senderId, params) {
  const requestedType = String(params.messageType || params.type || 'text').toLowerCase();
  const messageType = requestedType === 'sticker' ? 'sticker' : 'text';
  let clean = String(params.message || params.text || params.stickerId || '').trim();
  if (messageType === 'sticker') {
    clean = String(params.stickerId || params.message || params.text || '').trim();
    if (!isValidStickerId(clean)) throw new Error('สติกเกอร์ไม่ถูกต้อง');
  } else if (!clean) {
    throw new Error('กรุณาระบุข้อความ');
  }

  let convId = Number(params.conversationId || 0);
  let receiverId = 0;
  if (convId) {
    const conv = await requireConversation(env, senderId, convId);
    if (!isGroupConv(conv)) {
      receiverId = conv.user1_id === senderId ? conv.user2_id : conv.user1_id;
    }
  } else {
    const receiver = await env.DB.prepare('SELECT id FROM users WHERE id = ?')
      .bind(Number(params.toUserId || params.receiverId))
      .first();
    if (!receiver) throw new Error('ไม่พบผู้รับ');
    const conv = await getOrCreateConversation(env, senderId, receiver.id);
    convId = Number(conv.conversationId);
    receiverId = receiver.id;
  }

  const ts = nowIso();
  const result = await env.DB.prepare(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_type, message, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  )
    .bind(convId, senderId, receiverId || 0, messageType, clean, ts)
    .run();
  const messageId = result.meta.last_row_id;
  await recordOutboundMessage(env, {
    conversationId: convId,
    messageId,
    senderId,
    messageType,
    message: clean,
    createdAt: ts,
  });
  return {
    success: true,
    messageId: 'M' + messageId,
    conversationId: String(convId),
    senderId: String(senderId),
    receiverId: String(receiverId || 0),
    messageType,
    message: clean,
    timestamp: ts,
    isRead: false,
  };
}

async function markRead(env, userId, conversationId) {
  await requireConversation(env, userId, conversationId);
  const last = await env.DB.prepare(
    'SELECT MAX(id) AS max_id FROM messages WHERE conversation_id = ?'
  )
    .bind(Number(conversationId))
    .first();
  const maxId = Number(last?.max_id || 0);
  await env.DB.prepare(
    `UPDATE conversation_members
     SET last_read_message_id = ?, unread_count = 0
     WHERE conversation_id = ? AND user_id = ?`
  )
    .bind(maxId, Number(conversationId), userId)
    .run();
  await env.DB.prepare(
    'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0'
  )
    .bind(Number(conversationId), userId)
    .run();
  return { success: true };
}

export async function handleChatAction(env, action, params, config) {
  const channelId = (env && env.LINE_CHANNEL_ID) || config.CHANNEL_ID;
  await ensurePollOptSchema(env);

  switch (action) {
    case 'health':
      return {
        success: true,
        system: config.SYSTEM,
        version: config.VERSION,
        message: 'API is working',
        backend: 'd1',
        time: nowIso(),
      };

    case 'users':
    case 'getUsers':
      return { success: true, users: await getUsers(env) };

    case 'searchUsers': {
      const q = String(params.q || params.query || '').trim();
      if (!q) return { success: true, users: await getUsers(env) };
      const like = '%' + q + '%';
      const { results } = await env.DB.prepare(
        `SELECT * FROM users
         WHERE line_user_id != ?
           AND (display_name LIKE ? OR email LIKE ? OR line_user_id LIKE ?)
         ORDER BY display_name COLLATE NOCASE ASC LIMIT 50`
      )
        .bind(SYSTEM_LINE_ID, like, like, like)
        .all();
      return { success: true, users: (results || []).map(serializeUser) };
    }

    case 'user':
    case 'me':
    case 'currentUser': {
      const user = await resolveUser(env, params.sessionToken);
      return { success: true, user: serializeUser(user) };
    }

    case 'authenticateWithLine':
    case 'lineLogin': {
      const idToken = String(params.idToken || '');
      if (idToken) {
        const profile = await verifyLineIdToken(idToken, channelId);
        if (!profile.success) throw new Error(profile.error || 'LINE Login ไม่สำเร็จ');
        if (!profile.sub) throw new Error('LINE ไม่ส่งรหัสผู้ใช้มา');
        const user = await findOrCreateUser(
          env,
          profile.sub,
          profile.name,
          profile.picture,
          profile.email
        );
        return loginResponse(env, user);
      }
      const lineUserId = String(params.lineUserId || '');
      if (!lineUserId) throw new Error('ต้องมี idToken หรือ lineUserId');
      const user = await findOrCreateUser(
        env,
        lineUserId,
        String(params.displayName || 'LINE User'),
        String(params.pictureUrl || ''),
        ''
      );
      return loginResponse(env, user);
    }

    case 'conversations':
    case 'getConversations': {
      const user = await resolveUser(env, params.sessionToken);
      return { success: true, conversations: await getUserConversations(env, user.id) };
    }

    case 'conversation':
    case 'getOrCreateConversation': {
      const user = await resolveUser(env, params.sessionToken);
      return {
        success: true,
        conversation: await getOrCreateConversation(
          env,
          user.id,
          params.otherUserId || params.userId2
        ),
      };
    }

    case 'messages':
    case 'getMessages': {
      const user = await resolveUser(env, params.sessionToken);
      return {
        success: true,
        messages: await getMessages(env, user.id, params.conversationId, 80, null),
      };
    }

    case 'sendMessage':
    case 'send': {
      const user = await resolveUser(env, params.sessionToken);
      return sendMessage(env, user.id, params);
    }

    case 'createGroup': {
      const user = await resolveUser(env, params.sessionToken);
      return createGroup(env, user.id, params.name, params.memberIds || params.members);
    }

    case 'groupInfo':
    case 'getGroup': {
      const user = await resolveUser(env, params.sessionToken);
      return groupInfo(env, user.id, params.conversationId);
    }

    case 'addMembers': {
      const user = await resolveUser(env, params.sessionToken);
      return addGroupMembers(
        env,
        user.id,
        params.conversationId,
        params.memberIds || params.members
      );
    }

    case 'leaveGroup':
    case 'removeMember': {
      const user = await resolveUser(env, params.sessionToken);
      return leaveOrRemove(env, user.id, params.conversationId, params.userId || params.targetUserId);
    }

    case 'renameGroup': {
      const user = await resolveUser(env, params.sessionToken);
      return renameGroup(env, user.id, params.conversationId, params.name);
    }

    case 'markRead': {
      const user = await resolveUser(env, params.sessionToken);
      return markRead(env, user.id, params.conversationId);
    }

    case 'unread':
    case 'unreadCount': {
      const user = await resolveUser(env, params.sessionToken);
      return {
        success: true,
        unread: await sumUnread(env, user.id),
      };
    }

    case 'poll':
    case 'inbox':
    case 'pollInbox': {
      const user = await resolveUser(env, params.sessionToken);
      await touchPresence(env, user.id);
      const sinceUpdatedAt = params.sinceUpdatedAt || params.since_updated_at || null;
      const partial = Boolean(sinceUpdatedAt);
      const conversations = await getUserConversations(env, user.id, { sinceUpdatedAt });
      const unread = partial
        ? await sumUnread(env, user.id)
        : conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      let messages = [];
      if (params.conversationId) {
        messages = await getMessages(
          env,
          user.id,
          params.conversationId,
          params.since || params.sinceMessageId ? 200 : 80,
          params.since || null,
          params.sinceMessageId || params.since_message_id || null
        );
      }
      return {
        success: true,
        unread,
        conversations,
        partial,
        messages,
        serverTime: nowIso(),
      };
    }

    case 'logout': {
      if (params.sessionToken) {
        await env.DB.prepare('DELETE FROM sessions WHERE token = ?')
          .bind(params.sessionToken)
          .run();
      }
      return { success: true };
    }

    default:
      throw new Error('Unknown action: ' + action);
  }
}
