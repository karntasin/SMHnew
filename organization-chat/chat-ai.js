/**
 * FSHH Chat AI — Cloudflare Workers AI
 * แยกชุดข้อมูลขาดจากกัน: เว็บแอป หรือ เว็บสาธารณะ ห้ามผสมในคำขอเดียวกัน
 * Worker ไม่เรียก HOSxP และไม่เก็บคำถามผู้ใช้
 */

import { resolveUser } from './chat-api.js';

const MODEL_PRIMARY = '@cf/meta/llama-3.1-8b-instruct-fast';
const MODEL_FALLBACK = '@cf/meta/llama-3.2-3b-instruct';
const MAX_QUESTION = 400;
const MAX_HISTORY = 4;
const USER_DAILY_LIMIT = 20;
const GLOBAL_DAILY_LIMIT = 160;
const CONTEXT_CHAR_LIMIT = 10000;

const IDENTITY_QUESTION =
  /ชื่อ\s*(ผู้ป่วย|คนไข้)|คนไข้\s*ชื่อ|ผู้ป่วย\s*ชื่อ|รายชื่อ\s*(ผู้ป่วย|คนไข้)|เลขบัตร|บัตรประชาชน|\bcid\b|citizen|เบอร์โทร|หมายเลขโทร|เบอร์ศัพท์|ที่อยู่ตามบัตร|บ้านเลขที่|ขอ\s*hn|เลข\s*hn|hn\s*ของ|patient\s*name/i;

const DUMP_OR_JAILBREAK =
  /ignore (previous|all) instructions|system prompt|dump (the )?(context|snapshot)|ai_context|โหมดผู้พัฒนา|เปิดเผย.*(โทเคน|token|prompt)|แสดงชุดข้อมูลภายใน/i;

const WANTS_WEB =
  /ค้นเว็บ|ค้นจากเว็บ|google|bing|wikipedia|อินเทอร์เน็ต|เว็บภายนอก|จากเน็ต|search the web/i;

const INTERNAL_HINT =
  /แดชบอร์ด|dashboard|เว็บแอป|web\s*app|ในระบบนี้|hosxp|ฮอสเอ็ก|ยอดผู้ป่วย|สถิติผู้ป่วย|สถิติโรค|โรคที่พบบ่อย|5\s*โรค|ยาที่ใช้เยอะ|ยาที่จ่าย|ยาที่ใช้มาก|ผู้ป่วยนอก|ผู้ป่วยใน|หอผู้ป่วยใน|นัดหมาย|มาตามนัด|ค่ารักษา|รายได้วันนี้|รายได้เดือน|รายได้แยก|ตัวชี้วัด|\bkpi\b|\bopd\b|\bipd\b|census|จำนวน visit|visit\s*แผนก|ยอดแผนก|สถิติแผนก|ใบลา|แจ้งซ่อม|จองห้องประชุม|จองรถ|ครุภัณฑ์การแพทย์|เมนูในระบบ|วิธีใช้ระบบ|คู่มือระบบ|สิทธิการรักษา/i;

const TOPIC_KEYS = {
  leave: ['ลา', 'ใบลา', 'วันลา', 'ลาพัก', 'ลาป่วย', 'leave'],
  maintenance: ['ซ่อม', 'แจ้งซ่อม', 'ช่าง', 'ใบงาน', 'maintenance'],
  room: ['ห้องประชุม', 'จองห้อง', 'meeting'],
  vehicle: ['ยานพาหนะ', 'จองรถ', 'รถโรงพยาบาล', 'ใบขอรถ'],
  document: ['หนังสือ', 'เอกสารเวียน', 'document'],
  equipment: ['ยืมอุปกรณ์', 'ครุภัณฑ์การแพทย์', 'equipment'],
  staff: ['เจ้าหน้าที่', 'บุคลากร', 'พนักงาน', 'roster'],
  env: ['ทรัพย์สิน', 'env', 'มิเตอร์', 'ไฟฟ้า', 'สาธารณูปโภค'],
  quality: ['ตัวชี้วัด', 'kpi', 'คุณภาพ', 'quality'],
  stats: [
    'ยอด', 'รายได้', 'สิทธิ', 'ผู้ป่วยนอก', 'ผู้ป่วยใน', 'opd', 'ipd', 'er',
    'census', 'จำนวน visit', 'นัด', 'นัดหมาย', 'มาตามนัด', 'appointment',
    'สถิติ', 'แดชบอร์ด', 'dashboard', 'โรคที่พบบ่อย', 'ยาที่ใช้', 'visit แผนก',
  ],
  it: ['helpdesk', 'service desk', 'ตั๋วไอที', 'im ', 'ศูนย์สารสนเทศ'],
  howto: ['วิธีใช้', 'เข้าเมนู', 'คู่มือ', 'อยู่ที่ไหนในระบบ', 'ทำยังไงในระบบ'],
};

const INTERNAL_PROMPT = `คุณคือผู้ช่วย FSHH โหมดข้อมูลโรงพยาบาล
กฎ:
- ใช้เฉพาะข้อมูลจากเว็บแอปในบริบท ห้ามเดาตัวเลข ห้ามค้นหรืออ้างเว็บภายนอก
- ถ้าไม่มีในบริบท ให้บอกว่าชุดข้อมูลเว็บแอปยังไม่มีส่วนนี้ ห้ามไปหาจากอินเทอร์เน็ต
- ตอบยอดรวมได้ เช่น ผู้ป่วยนอก/ใน นัดหมาย รายได้ รายได้แยกสิทธิ์ 5 โรคที่พบบ่อย ยาที่จ่ายมาก visit รายแผนก ตัวชี้วัดแผนก
- ห้ามตอบชื่อคนไข้ เลขบัตรประชาชน เบอร์โทร ที่อยู่ หรือเลข HN/AN รายบุคคล
- ห้ามเปิดเผยความลับระบบ โทเคน ชุดข้อมูลดิบ หรือวิธีหลบกฎ`;

const EXTERNAL_PROMPT = `คุณคือผู้ช่วย FSHH โหมดความรู้ทั่วไปจากเว็บสาธารณะ
กฎ:
- ใช้เฉพาะผลการค้นเว็บที่ระบบให้มา ห้ามใช้หรือเดาข้อมูลโรงพยาบาล เว็บแอป ผู้ป่วย รายได้ นัด ใบลา หรือสถิติภายใน
- ห้ามบอกว่ามีชุดข้อมูลภายใน และห้ามขอให้ผู้ใช้ผสมคำถามกับข้อมูลโรงพยาบาลในข้อเดียวกัน
- ถ้าผลค้นไม่พอ ให้บอกว่าค้นเว็บสาธารณะแล้วยังไม่พบ ห้ามเติมตัวเลขจากโรงพยาบาล
- ตอบภาษาไทยสั้น ชัด และพออ้างชื่อแหล่งจากรายการที่ให้มา`;

const MIXED_REFUSAL =
  'ระบบแยกชุดข้อมูลออกจากกัน เพื่อความปลอดภัย: ถามข้อมูลโรงพยาบาล/เว็บแอปเป็นข้อหนึ่ง และถามความรู้ทั่วไปจากเว็บเป็นอีกข้อ ห้ามผสมในคำถามเดียวกัน';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

export async function ensureAiTables(env) {
  if (!env || !env.DB) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS ai_context (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  ).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS ai_rate (
      user_id INTEGER NOT NULL,
      day TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, day)
    )`
  ).run();
}

export async function storeAiContext(env, payload) {
  await ensureAiTables(env);
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  if (body.length > 120000) {
    throw new Error('ชุดข้อมูล AI ใหญ่เกินกำหนด');
  }
  const ts = nowIso();
  await env.DB.prepare(
    `INSERT INTO ai_context (id, payload, updated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
  )
    .bind(body, ts)
    .run();
  return { success: true, bytes: body.length, updated_at: ts };
}

async function loadContext(env) {
  await ensureAiTables(env);
  const row = await env.DB.prepare('SELECT payload, updated_at FROM ai_context WHERE id = 1').first();
  if (!row || !row.payload) return { data: null, updatedAt: null };
  try {
    return { data: JSON.parse(row.payload), updatedAt: row.updated_at };
  } catch {
    return { data: null, updatedAt: row.updated_at };
  }
}

function detectTopics(question) {
  const q = String(question || '').toLowerCase();
  const hits = [];
  for (const [topic, words] of Object.entries(TOPIC_KEYS)) {
    if (words.some((w) => q.includes(w.toLowerCase()))) hits.push(topic);
  }
  return hits;
}

function isInternalQuestion(question) {
  const q = String(question || '');
  return detectTopics(q).length > 0 || INTERNAL_HINT.test(q);
}

function wantsWeb(question) {
  return WANTS_WEB.test(String(question || ''));
}

function pickSlice(data, question) {
  if (!data || typeof data !== 'object') {
    return { note: 'ยังไม่มีข้อมูลจากเว็บแอป' };
  }
  let topics = detectTopics(question);
  if (topics.length === 0) topics = ['stats'];
  const slice = {
    updated_at: data.updated_at || '',
    summary: data.summary || {},
    policy: data.policy || '',
  };
  const include = (key) => {
    if (data[key] !== undefined) slice[key] = data[key];
  };
  for (const t of topics) include(t);
  if (topics.includes('howto')) include('menus');
  if (topics.includes('quality')) include('stats');
  if (slice.quality) slice.quality = focusQuality(slice.quality, question);
  return slice;
}

function focusQuality(quality, question) {
  const q = String(question || '');
  const depts = Array.isArray(quality.by_department) ? quality.by_department : [];
  const matched = depts.filter((d) => d && d.department && q.includes(String(d.department)));
  const list = matched.length ? matched : depts.slice(0, 10);
  return {
    available: quality.available,
    count: quality.count,
    by_department: list.map((d) => ({
      department: d.department,
      count: d.count,
      names: Array.isArray(d.names) ? d.names.slice(0, 40) : [],
    })),
  };
}

function compactSlice(slice) {
  let text = JSON.stringify(slice);
  if (text.length <= CONTEXT_CHAR_LIMIT) return text;
  const slim = {
    updated_at: slice.updated_at,
    summary: slice.summary,
    policy: slice.policy,
  };
  for (const key of Object.keys(slice)) {
    if (['updated_at', 'summary', 'policy'].includes(key)) continue;
    const value = slice[key];
    if (value && typeof value === 'object' && Array.isArray(value.recent)) {
      slim[key] = { ...value, recent: value.recent.slice(0, 6) };
    } else {
      slim[key] = value;
    }
  }
  text = JSON.stringify(slim);
  if (text.length > CONTEXT_CHAR_LIMIT) return text.slice(0, CONTEXT_CHAR_LIMIT);
  return text;
}

function looksBlocked(question) {
  const q = String(question || '');
  if (IDENTITY_QUESTION.test(q)) {
    return 'ระบบนี้ไม่ตอบชื่อคนไข้ เลขบัตรประชาชน เบอร์โทร ที่อยู่ หรือเลข HN/AN รายบุคคล แต่ถามยอดรวมจากเว็บแอปได้ เช่น ผู้ป่วยนอกวันนี้ นัดหมาย รายได้ หรือตัวชี้วัดของแผนก';
  }
  if (DUMP_OR_JAILBREAK.test(q)) {
    return 'คำขอนี้ไม่สามารถทำได้';
  }
  return '';
}

function sameModeHistory(raw, mode) {
  const rows = sanitizeHistory(raw);
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    if (row.role === 'user') {
      const userMode = isInternalQuestion(row.content) ? 'internal' : 'external';
      if (userMode !== mode) continue;
      out.push(row);
      const next = rows[i + 1];
      if (next && next.role === 'assistant') {
        out.push(next);
        i += 1;
      }
    }
  }
  return out.slice(-MAX_HISTORY);
}

async function fetchJson(url, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'FSHH-Chat/8.1 (internal hospital assistant)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function pushUnique(list, item) {
  if (!item || !item.snippet) return;
  const key = String(item.url || item.title || item.snippet).slice(0, 80);
  if (list.some((row) => String(row.url || row.title || '').slice(0, 80) === key)) return;
  list.push({
    title: String(item.title || '').slice(0, 120),
    snippet: String(item.snippet || '').slice(0, 280),
    url: String(item.url || '').slice(0, 180),
    source: String(item.source || '').slice(0, 40),
  });
}

async function searchPublicWeb(question) {
  const q = encodeURIComponent(String(question || '').slice(0, 120));
  const found = [];

  const wiki = await fetchJson(
    `https://th.wikipedia.org/w/api.php?action=opensearch&search=${q}&limit=3&namespace=0&format=json`
  );
  if (Array.isArray(wiki) && Array.isArray(wiki[1])) {
    for (let i = 0; i < wiki[1].length; i++) {
      pushUnique(found, {
        title: wiki[1][i],
        snippet: (wiki[2] && wiki[2][i]) || wiki[1][i],
        url: (wiki[3] && wiki[3][i]) || '',
        source: 'Wikipedia',
      });
    }
  }

  const ddg = await fetchJson(
    `https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1`
  );
  if (ddg && typeof ddg === 'object') {
    if (ddg.AbstractText) {
      pushUnique(found, {
        title: ddg.Heading || ddg.AbstractSource || 'DuckDuckGo',
        snippet: ddg.AbstractText,
        url: ddg.AbstractURL || '',
        source: ddg.AbstractSource || 'DuckDuckGo',
      });
    }
    const related = Array.isArray(ddg.RelatedTopics) ? ddg.RelatedTopics : [];
    for (const row of related.slice(0, 4)) {
      if (row && row.Text) {
        pushUnique(found, {
          title: String(row.Text).split(' - ')[0] || 'DuckDuckGo',
          snippet: row.Text,
          url: row.FirstURL || '',
          source: 'DuckDuckGo',
        });
      } else if (row && Array.isArray(row.Topics)) {
        for (const sub of row.Topics.slice(0, 2)) {
          if (sub && sub.Text) {
            pushUnique(found, {
              title: String(sub.Text).split(' - ')[0] || 'DuckDuckGo',
              snippet: sub.Text,
              url: sub.FirstURL || '',
              source: 'DuckDuckGo',
            });
          }
        }
      }
    }
  }

  return found.slice(0, 6);
}

async function enforceRate(env, userId) {
  const day = todayUtc();
  const mine = await env.DB.prepare('SELECT count FROM ai_rate WHERE user_id = ? AND day = ?')
    .bind(userId, day)
    .first();
  if (mine && Number(mine.count) >= USER_DAILY_LIMIT) {
    return { ok: false, error: 'วันนี้ถามครบโควต้าแล้ว (จำกัดเพื่อใช้ AI ฟรีของ Cloudflare) ลองใหม่พรุ่งนี้' };
  }
  const global = await env.DB.prepare('SELECT COALESCE(SUM(count), 0) AS total FROM ai_rate WHERE day = ?')
    .bind(day)
    .first();
  if (global && Number(global.total) >= GLOBAL_DAILY_LIMIT) {
    return { ok: false, error: 'โควต้า AI รวมของวันนี้เต็มแล้ว เพื่อไม่ให้มีค่าใช้จ่าย ลองใหม่พรุ่งนี้' };
  }
  await env.DB.prepare(
    `INSERT INTO ai_rate (user_id, day, count) VALUES (?, ?, 1)
     ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1`
  )
    .bind(userId, day)
    .run();
  return { ok: true };
}

function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-MAX_HISTORY)
    .map((row) => {
      const role = row && row.role === 'assistant' ? 'assistant' : 'user';
      const content = String((row && row.content) || '').slice(0, 300);
      return content ? { role, content } : null;
    })
    .filter(Boolean);
}

function extractAnswer(result) {
  if (!result) return '';
  if (typeof result === 'string') return result;
  if (typeof result.response === 'string') return result.response;
  if (result.result && typeof result.result.response === 'string') return result.result.response;
  return '';
}

async function runModel(env, messages) {
  const input = {
    messages,
    max_tokens: 320,
    temperature: 0.18,
  };
  try {
    return await env.AI.run(MODEL_PRIMARY, input);
  } catch {
    return env.AI.run(MODEL_FALLBACK, input);
  }
}

export async function handleAiAsk(request, env) {
  if (request.method === 'OPTIONS') {
    return jsonResponse({ ok: true }, 204);
  }
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'ใช้ POST เท่านั้น' }, 405);
  }
  if (!env || !env.DB) {
    return jsonResponse({ success: false, error: 'ยังไม่ได้ผูกฐานข้อมูลแชท' }, 503);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'คำขอไม่ถูกต้อง' }, 400);
  }

  let user;
  try {
    user = await resolveUser(env, body.sessionToken);
  } catch {
    return jsonResponse({ success: false, error: 'SESSION_EXPIRED' }, 401);
  }

  const question = String(body.question || '').trim();
  if (!question) {
    return jsonResponse({ success: false, error: 'พิมพ์คำถามก่อน' }, 400);
  }
  if (question.length > MAX_QUESTION) {
    return jsonResponse({ success: false, error: 'คำถามยาวเกินไป' }, 400);
  }

  const blocked = looksBlocked(question);
  if (blocked) {
    return jsonResponse({
      success: true,
      refused: true,
      source: 'none',
      answer: blocked,
      updatedAt: null,
    });
  }

  if (isInternalQuestion(question) && wantsWeb(question)) {
    return jsonResponse({
      success: true,
      refused: true,
      source: 'none',
      answer: MIXED_REFUSAL,
      updatedAt: null,
    });
  }

  const rate = await enforceRate(env, user.id);
  if (!rate.ok) {
    return jsonResponse({ success: false, error: rate.error }, 429);
  }

  if (!env.AI) {
    return jsonResponse({
      success: true,
      source: 'none',
      answer:
        'ยังไม่ได้เปิด Cloudflare Workers AI บน Worker นี้ ผู้ดูแลระบบต้องผูก AI binding แล้ว deploy อีกครั้ง',
      updatedAt: null,
    });
  }

  const mode = isInternalQuestion(question) ? 'internal' : 'external';
  const history = sameModeHistory(body.history, mode);

  try {
    if (mode === 'internal') {
      const { data, updatedAt } = await loadContext(env);
      const sliceText = compactSlice(pickSlice(data, question));
      const messages = [
        { role: 'system', content: INTERNAL_PROMPT },
        { role: 'system', content: 'ชุดข้อมูลเว็บแอปเท่านั้น (ห้ามผสมเว็บภายนอก):\n' + sliceText },
        ...history,
        { role: 'user', content: question },
      ];
      const result = await runModel(env, messages);
      const answer = extractAnswer(result).trim() || 'ยังสรุปจากข้อมูลเว็บแอปไม่ได้ในรอบนี้ ลองถามสั้นลงอีกครั้ง';
      return jsonResponse({
        success: true,
        refused: false,
        source: 'webapp',
        answer,
        updatedAt,
      });
    }

    const webHits = await searchPublicWeb(question);
    const webText = webHits.length
      ? JSON.stringify({ note: 'ผลการค้นเว็บสาธารณะเท่านั้น ไม่มีข้อมูลโรงพยาบาล', results: webHits })
      : JSON.stringify({ note: 'ค้นเว็บสาธารณะแล้วยังไม่พบสรุป', results: [] });
    const messages = [
      { role: 'system', content: EXTERNAL_PROMPT },
      { role: 'system', content: webText },
      ...history,
      { role: 'user', content: question },
    ];
    const result = await runModel(env, messages);
    const fallback = webHits.length
      ? 'ยังสรุปจากเว็บสาธารณะไม่ได้ในรอบนี้ ลองถามสั้นลงอีกครั้ง'
      : 'ค้นจากเว็บสาธารณะแล้วยังไม่พบสรุปที่ชัด ลองถามความรู้ทั่วไปให้เฉพาะเจาะจงขึ้น';
    const answer = extractAnswer(result).trim() || fallback;
    return jsonResponse({
      success: true,
      refused: false,
      source: 'web',
      answer,
      updatedAt: null,
    });
  } catch (error) {
    const msg = String(error && error.message ? error.message : error);
    if (msg.includes('7505')) {
      return jsonResponse({
        success: false,
        error: 'AI ถูกจำกัดอัตราชั่วคราว ลองใหม่ในอีกสักครู่',
      }, 429);
    }
    return jsonResponse({
      success: false,
      error: 'เรียก AI ไม่สำเร็จ กรุณาลองใหม่',
    }, 502);
  }
}
