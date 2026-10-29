/**
 * Systems catalog bot helpers (Worker).
 * Imported dynamically from chat-api to avoid circular deps at module init.
 */

const BOT_RATE_WINDOW_MS = 60 * 1000;
const BOT_RATE_MAX = 20;
const botRateMap = new Map();

export const SYSTEMS_BOT_LINE_ID = '__smh_systems_bot__';
export const SYSTEMS_BOT_NAME = 'ค้นหาระบบ SMH';
/** Served from Worker public assets (organization-chat/public/icons/smh-logo.png) */
export const SYSTEMS_BOT_AVATAR = '/icons/smh-logo.png';

export function isSystemsBotLineId(lineUserId) {
  return String(lineUserId || '') === SYSTEMS_BOT_LINE_ID;
}

function allowBotRequest(senderId) {
  const key = String(senderId);
  const now = Date.now();
  let entry = botRateMap.get(key);
  if (!entry || now - entry.startedAt > BOT_RATE_WINDOW_MS) {
    entry = { startedAt: now, count: 0 };
  }
  entry.count += 1;
  botRateMap.set(key, entry);
  return entry.count <= BOT_RATE_MAX;
}

function laravelApiUrl(env) {
  return String((env && env.LARAVEL_API_URL) || '').trim()
    || 'https://fshh-app.online/organization-chat/api';
}

async function callSearchSystems(env, laravelUserId, query) {
  const secret = String((env && env.CHAT_SYNC_SECRET) || '');
  if (!secret) {
    return { success: false, error: 'ยังไม่ได้ตั้ง CHAT_SYNC_SECRET' };
  }
  let res;
  try {
    res = await fetch(laravelApiUrl(env), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Chat-Secret': secret,
      },
      body: JSON.stringify({
        action: 'searchSystems',
        laravelUserId: Number(laravelUserId) || 0,
        query: String(query || ''),
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { success: false, error: 'เชื่อมต่อเซิร์ฟเวอร์ค้นหาระบบไม่สำเร็จ' };
  }
  try {
    return await res.json();
  } catch {
    return { success: false, error: 'เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง' };
  }
}

function cardPayload(sanitizeCardColor, { title, body, color, fields, actions, priority }) {
  const payload = {
    title: String(title || '').trim(),
    body: String(body || '').trim(),
    color: sanitizeCardColor(color) || '#0EA5E9',
    priority: String(priority || '').trim(),
    fields: Array.isArray(fields) ? fields : [],
    actions: [],
  };
  if (Array.isArray(actions)) {
    for (const action of actions) {
      if (!action || typeof action !== 'object') continue;
      const label = String(action.label || '').trim();
      const url = String(action.url || '').trim();
      if (label && url) payload.actions.push({ label, url });
    }
  }
  return JSON.stringify(payload);
}

export function helpFallbackText() {
  return (
    'สวัสดี ฉันคือบอทค้นหาระบบ SMH\n' +
    'พิมพ์ชื่อระบบหรือคำใกล้เคียง เช่น การลา, เอกสาร, จองห้อง, หนังสือ, แจ้งซ่อม\n' +
    'พิมพ์ «เอกสาร» หรือ «หนังสือ» เพื่อหาระบบและรายการเอกสารที่เกี่ยวข้อง\n' +
    'ระบบ/เอกสารที่มีสิทธิ์จะได้ลิงก์เปิดเข้าใช้งาน\n' +
    'ถ้าไม่มีสิทธิ์ ฉันจะแจ้งให้ทราบ'
  );
}

async function insertBotMessage(env, api, { conversationId, botId, receiverId, messageType, message }) {
  const ts = api.nowIso();
  const result = await env.DB.prepare(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_type, message, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  )
    .bind(conversationId, botId, receiverId || 0, messageType, message, ts)
    .run();
  const messageId = result.meta.last_row_id;
  await api.recordOutboundMessage(env, {
    conversationId,
    messageId,
    senderId: botId,
    messageType,
    message,
    createdAt: ts,
  });
  return messageId;
}

export async function ensureSystemsBotUser(env, api) {
  let row = await env.DB.prepare('SELECT * FROM users WHERE line_user_id = ?')
    .bind(SYSTEMS_BOT_LINE_ID)
    .first();
  if (row) {
    const needsUpdate =
      row.display_name !== SYSTEMS_BOT_NAME ||
      row.department !== 'บอท' ||
      String(row.avatar || '') !== SYSTEMS_BOT_AVATAR;
    if (needsUpdate) {
      await env.DB.prepare(
        'UPDATE users SET display_name = ?, department = ?, avatar = ? WHERE line_user_id = ?'
      )
        .bind(SYSTEMS_BOT_NAME, 'บอท', SYSTEMS_BOT_AVATAR, SYSTEMS_BOT_LINE_ID)
        .run();
      row.display_name = SYSTEMS_BOT_NAME;
      row.department = 'บอท';
      row.avatar = SYSTEMS_BOT_AVATAR;
    }
    return row;
  }
  const ts = api.nowIso();
  const result = await env.DB.prepare(
    `INSERT INTO users (line_user_id, display_name, department, email, avatar, last_login, created_at)
     VALUES (?, ?, 'บอท', '', ?, ?, ?)`
  )
    .bind(SYSTEMS_BOT_LINE_ID, SYSTEMS_BOT_NAME, SYSTEMS_BOT_AVATAR, ts, ts)
    .run();
  return env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();
}

/**
 * After the user message is saved to a DM with the systems bot, reply with catalog results.
 */
export async function replySystemsBot(env, api, { sender, conversationId, text }) {
  const bot = await ensureSystemsBotUser(env, api);
  if (!bot || Number(bot.id) === Number(sender.id)) return;

  if (!allowBotRequest(sender.id)) {
    await insertBotMessage(env, api, {
      conversationId,
      botId: bot.id,
      receiverId: sender.id,
      messageType: 'text',
      message: 'ค้นหาบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
    });
    return;
  }

  const query = String(text || '').trim();
  const data = await callSearchSystems(env, sender.laravel_user_id || 0, query);

  if (!data || data.success === false) {
    await insertBotMessage(env, api, {
      conversationId,
      botId: bot.id,
      receiverId: sender.id,
      messageType: 'text',
      message: String((data && data.error) || 'ค้นหาระบบไม่สำเร็จ'),
    });
    return;
  }

  if (data.help || (Array.isArray(data.results) && data.results.length === 0)) {
    await insertBotMessage(env, api, {
      conversationId,
      botId: bot.id,
      receiverId: sender.id,
      messageType: 'text',
      message: String(data.message || helpFallbackText()),
    });
    return;
  }

  const results = Array.isArray(data.results) ? data.results : [];
  if (!results.length) {
    await insertBotMessage(env, api, {
      conversationId,
      botId: bot.id,
      receiverId: sender.id,
      messageType: 'text',
      message: String(data.message || helpFallbackText()),
    });
    return;
  }

  for (const item of results) {
    if (item.status === 'denied') {
      await insertBotMessage(env, api, {
        conversationId,
        botId: bot.id,
        receiverId: sender.id,
        messageType: 'text',
        message: String(
          item.deniedMessage ||
            ('ไม่มีสิทธิ์เข้า «' + (item.title || 'รายการ') + '»\nเฉพาะผู้มีสิทธิ์ถึงเข้าระบบนี้ได้')
        ),
      });
      continue;
    }

    const kind = String(item.kind || 'system');
    const isDoc = kind === 'document';
    const title = String(item.title || (isDoc ? 'เอกสาร' : 'ระบบ SMH'));
    const url = String(item.url || '').trim();
    const priority = String(item.priority || (isDoc ? 'เอกสาร' : 'ระบบ'));
    const actionLabel = String(item.actionLabel || (isDoc ? 'เปิดเอกสาร' : 'เปิดระบบ'));
    const fields = [];
    if (item.blurb && item.blurb !== title) {
      fields.push({ label: 'รายละเอียด', value: String(item.blurb) });
    }
    await insertBotMessage(env, api, {
      conversationId,
      botId: bot.id,
      receiverId: sender.id,
      messageType: 'card',
      message: cardPayload(api.sanitizeCardColor, {
        title,
        body: isDoc ? 'กดปุ่มเพื่อเปิดเอกสาร' : 'กดปุ่มเพื่อเปิดระบบ',
        color: isDoc ? '#059669' : '#0EA5E9',
        fields,
        actions: url ? [{ label: actionLabel, url }] : [],
        priority,
      }),
    });
  }
}

export async function ensureBotWelcomeIfEmpty(env, api, { userId, conversationId, otherUserId }) {
  const bot = await ensureSystemsBotUser(env, api);
  if (!bot || Number(otherUserId) !== Number(bot.id)) return null;

  const countRow = await env.DB.prepare(
    'SELECT COUNT(*) AS c FROM messages WHERE conversation_id = ? AND deleted_at IS NULL'
  )
    .bind(Number(conversationId))
    .first();
  if (Number(countRow?.c || 0) > 0) return null;

  await insertBotMessage(env, api, {
    conversationId: Number(conversationId),
    botId: bot.id,
    receiverId: userId,
    messageType: 'text',
    message: helpFallbackText(),
  });
  return true;
}
