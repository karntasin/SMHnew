import { storeAiContext } from './chat-ai.js';
import {
  SYSTEM_LINE_ID,
  addMember,
  ensurePollOptSchema,
  findOrCreateUser,
  getOrCreateConversation,
  loginResponse,
  nowIso,
  recordOutboundMessage,
  sanitizeCardColor,
  serializeMessage,
} from './chat-api.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Chat-Secret',
    },
  });
}

function timingSafeEqual(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left.length !== right.length) return false;
  let out = 0;
  for (let i = 0; i < left.length; i += 1) {
    out |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return out === 0;
}

async function ensureSystemUser(env) {
  let row = await env.DB.prepare('SELECT * FROM users WHERE line_user_id = ?')
    .bind(SYSTEM_LINE_ID)
    .first();
  if (row) return row;
  const ts = nowIso();
  const result = await env.DB.prepare(
    `INSERT INTO users (line_user_id, display_name, department, email, avatar, last_login, created_at)
     VALUES (?, 'ระบบ FSHH', '', '', '', ?, ?)`
  )
    .bind(SYSTEM_LINE_ID, ts, ts)
    .run();
  row = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();
  return row;
}

async function ensureDepartmentGroup(env, systemId, department) {
  const key = String(department.id);
  const name = String(department.name || 'แผนก').trim() || 'แผนก';
  let conv = await env.DB.prepare(
    `SELECT * FROM conversations WHERE source = 'department' AND source_key = ?`
  )
    .bind(key)
    .first();
  const ts = nowIso();
  if (!conv) {
    const result = await env.DB.prepare(
      `INSERT INTO conversations
       (type, name, created_by, user1_id, user2_id, source, source_key, created_at, updated_at)
       VALUES ('group', ?, ?, ?, NULL, 'department', ?, ?, ?)`
    )
      .bind(name, systemId, systemId, key, ts, ts)
      .run();
    conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();
    await addMember(env, conv.id, systemId, 'admin', ts);
    await env.DB.prepare(
      `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_type, message, is_read, created_at)
       VALUES (?, ?, 0, 'system', ?, 1, ?)`
    )
      .bind(conv.id, systemId, 'กลุ่มแผนก/ฝ่าย «' + name + '» จากเว็บแอป', ts)
      .run();
  } else if (conv.name !== name) {
    await env.DB.prepare('UPDATE conversations SET name = ?, updated_at = ? WHERE id = ?')
      .bind(name, ts, conv.id)
      .run();
    conv.name = name;
  }
  return conv;
}

async function loadOrCreateSyncedUser(env, params) {
  const laravelId = params.laravelUserId ? Number(params.laravelUserId) : 0;
  const lineUserId = String(params.lineUserId || '').trim();
  const displayName = String(params.displayName || 'User').trim() || 'User';
  const avatar = String(params.avatar || '');
  const email = String(params.email || '');

  let user = null;
  if (laravelId > 0) {
    user = await env.DB.prepare('SELECT * FROM users WHERE laravel_user_id = ?')
      .bind(laravelId)
      .first();
  }
  if (!user && lineUserId) {
    user = await env.DB.prepare('SELECT * FROM users WHERE line_user_id = ?')
      .bind(lineUserId)
      .first();
  }
  if (!user) {
    const createLineId = lineUserId || (laravelId > 0 ? 'web:' + laravelId : '');
    if (!createLineId) throw new Error('ต้องมี lineUserId หรือ laravelUserId');
    user = await findOrCreateUser(env, createLineId, displayName, avatar, email);
  }

  return user;
}

async function syncUser(env, params) {
  const laravelId = params.laravelUserId ? Number(params.laravelUserId) : 0;
  const lineUserId = String(params.lineUserId || '').trim();
  if (!lineUserId && laravelId <= 0) throw new Error('ต้องมี lineUserId หรือ laravelUserId');

  const displayName = String(params.displayName || 'User').trim() || 'User';
  const user = await loadOrCreateSyncedUser(env, params);
  const departments = Array.isArray(params.departments) ? params.departments : [];
  const deptLabel = departments
    .map((d) => d && d.name)
    .filter(Boolean)
    .join(', ');

  let nextLineId = user.line_user_id;
  if (lineUserId && String(user.line_user_id || '').startsWith('web:')) {
    const taken = await env.DB.prepare('SELECT id FROM users WHERE line_user_id = ? AND id != ?')
      .bind(lineUserId, user.id)
      .first();
    if (!taken) {
      nextLineId = lineUserId;
    }
  }

  await env.DB.prepare(
    `UPDATE users SET display_name = ?, email = ?, department = ?, laravel_user_id = ?,
       line_user_id = ?, avatar = CASE WHEN ? = '' THEN avatar ELSE ? END
     WHERE id = ?`
  )
    .bind(
      displayName,
      String(params.email || user.email || ''),
      deptLabel,
      laravelId > 0 ? laravelId : (user.laravel_user_id || null),
      nextLineId,
      String(params.avatar || ''),
      String(params.avatar || ''),
      user.id
    )
    .run();

  const system = await ensureSystemUser(env);
  const desired = new Set(
    departments.map((d) => String(d.id)).filter((id) => id && id !== 'undefined')
  );
  const { results: current } = await env.DB.prepare(
    `SELECT c.id, c.source_key FROM conversations c
     INNER JOIN conversation_members m ON m.conversation_id = c.id
     WHERE m.user_id = ? AND c.source = 'department'`
  )
    .bind(user.id)
    .all();
  const have = new Set((current || []).map((row) => String(row.source_key)));
  const ts = nowIso();
  const joined = [];
  for (const dept of departments) {
    const conv = await ensureDepartmentGroup(env, system.id, dept);
    if (!have.has(String(dept.id))) {
      await addMember(env, conv.id, user.id, 'member', ts);
    }
    joined.push({ conversationId: String(conv.id), name: conv.name, departmentId: String(dept.id) });
  }
  for (const row of current || []) {
    if (desired.has(String(row.source_key))) continue;
    await env.DB.prepare(
      'DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?'
    )
      .bind(row.id, user.id)
      .run();
  }

  return {
    success: true,
    userId: String(user.id),
    groups: joined,
  };
}

async function createWebSession(env, params) {
  await syncUser(env, params);
  const laravelId = params.laravelUserId ? Number(params.laravelUserId) : 0;
  const lineUserId = String(params.lineUserId || '').trim();
  let user = null;
  if (laravelId > 0) {
    user = await env.DB.prepare('SELECT * FROM users WHERE laravel_user_id = ?')
      .bind(laravelId)
      .first();
  }
  if (!user && lineUserId) {
    user = await env.DB.prepare('SELECT * FROM users WHERE line_user_id = ?')
      .bind(lineUserId)
      .first();
  }
  if (!user) {
    throw new Error('ไม่พบบัญชีแชทของผู้ใช้นี้');
  }
  return loginResponse(env, user);
}

async function notifyUser(env, params) {
  const lineUserId = String(params.lineUserId || '').trim();
  if (!lineUserId) throw new Error('ต้องมี lineUserId');
  const title = String(params.title || 'แจ้งเตือนจากระบบ').trim();
  const body = String(params.message || '').trim();
  const url = String(params.url || '').trim();
  const text = [title, body, url].filter(Boolean).join('\n');
  if (!text) throw new Error('ข้อความว่าง');

  const user = await env.DB.prepare('SELECT * FROM users WHERE line_user_id = ?')
    .bind(lineUserId)
    .first();
  if (!user) {
    return { success: false, error: 'ยังไม่มีผู้ใช้นี้ใน FSHH Chat' };
  }
  const system = await ensureSystemUser(env);
  const conv = await getOrCreateConversation(env, system.id, user.id);
  const ts = nowIso();
  const result = await env.DB.prepare(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_type, message, is_read, created_at)
     VALUES (?, ?, ?, 'text', ?, 0, ?)`
  )
    .bind(Number(conv.conversationId), system.id, user.id, text, ts)
    .run();
  await recordOutboundMessage(env, {
    conversationId: Number(conv.conversationId),
    messageId: result.meta.last_row_id,
    senderId: system.id,
    messageType: 'text',
    message: text,
    createdAt: ts,
  });
  const row = {
    id: result.meta.last_row_id,
    conversation_id: Number(conv.conversationId),
    sender_id: system.id,
    receiver_id: user.id,
    message_type: 'text',
    message: text,
    is_read: 0,
    created_at: ts,
  };
  return { success: true, ...serializeMessage(row) };
}

function cardFields(raw) {
  if (!Array.isArray(raw)) return [];
  const fields = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const label = String(item.label || '').trim();
    const value = String(item.value || '').trim();
    if (label && value) fields.push({ label, value });
  }
  return fields;
}

async function notifyDepartment(env, params) {
  const key = String(params.departmentId || params.sourceKey || '').trim();
  if (!key) throw new Error('ต้องมี departmentId');
  const title = String(params.title || '').trim();
  const text = String(params.message || title || '').trim();
  if (!text) throw new Error('ข้อความว่าง');
  const fields = cardFields(params.fields);
  const priority = String(params.priority || '').trim();
  const color = sanitizeCardColor(params.color);
  const useCard =
    String(params.messageType || '').toLowerCase() === 'card' ||
    Boolean(color) ||
    Boolean(priority) ||
    fields.length > 0;
  const stored = useCard
    ? JSON.stringify({
        title: title || 'แจ้งเตือนจากระบบ',
        body: text,
        color: color || '#64748B',
        priority,
        fields,
      })
    : text;
  const system = await ensureSystemUser(env);
  const conv = await ensureDepartmentGroup(env, system.id, {
    id: key,
    name: String(params.departmentName || params.name || '').trim() || ('แผนก ' + key),
  });
  const ts = nowIso();
  const result = await env.DB.prepare(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_type, message, is_read, created_at)
     VALUES (?, ?, 0, ?, ?, 0, ?)`
  )
    .bind(conv.id, system.id, useCard ? 'card' : 'text', stored, ts)
    .run();
  await recordOutboundMessage(env, {
    conversationId: conv.id,
    messageId: result.meta.last_row_id,
    senderId: system.id,
    messageType: useCard ? 'card' : 'text',
    message: stored,
    createdAt: ts,
  });
  return { success: true, conversationId: String(conv.id), messageId: 'M' + result.meta.last_row_id };
}

export async function handleInternal(request, env) {
  if (request.method === 'OPTIONS') {
    return jsonResponse({ ok: true }, 204);
  }
  const expected = String((env && env.CHAT_SYNC_SECRET) || '');
  if (!expected) {
    return jsonResponse({ success: false, error: 'ยังไม่ได้ตั้ง CHAT_SYNC_SECRET' }, 503);
  }
  const given = request.headers.get('X-Chat-Secret') || '';
  if (!timingSafeEqual(given, expected)) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400);
  }
  const action = String(body.action || '');
  try {
    await ensurePollOptSchema(env);
    if (action === 'syncUser') return jsonResponse(await syncUser(env, body));
    if (action === 'createWebSession') return jsonResponse(await createWebSession(env, body));
    if (action === 'notifyUser') return jsonResponse(await notifyUser(env, body));
    if (action === 'notifyDepartment') return jsonResponse(await notifyDepartment(env, body));
    if (action === 'syncAiContext') {
      if (!body.payload || typeof body.payload !== 'object') {
        return jsonResponse({ success: false, error: 'ต้องมี payload' }, 400);
      }
      return jsonResponse(await storeAiContext(env, body.payload));
    }
    return jsonResponse({ success: false, error: 'Unknown action' }, 400);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message || String(error) }, 400);
  }
}
