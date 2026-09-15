/**
 * FSHH Chat — Cloudflare Worker + D1
 * เสิร์ฟหน้า LIFF และ API ใน Worker เดียว ไม่ใช้ Laravel / GAS
 */

import { buildChatPage } from './chat-page.js';
import { handleChatAction } from './chat-api.js';
import { handleFileDownload, handleFileUpload } from './chat-files.js';
import { handleAiAsk } from './chat-ai.js';
import { handleInternal } from './chat-sync.js';

const CONFIG = {
  VERSION: '8.4.1-d1-groups-fix',
  SYSTEM: 'FSHH Chat',
  LIFF_ID: '2011190976-nGVbTYZD',
  CHANNEL_ID: '2011190976',
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      ...corsHeaders(),
    },
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      ...corsHeaders(),
    },
  });
}

function wrapForLiff(action, worker, payload, ok = true) {
  return jsonResponse(
    {
      success: ok && payload && payload.success !== false,
      proxy: false,
      backend: 'd1',
      action,
      worker,
      gas: payload,
      timestamp: new Date().toISOString(),
    },
    ok ? 200 : payload && payload.error === 'SESSION_EXPIRED' ? 401 : 400
  );
}

async function dispatch(env, action, params) {
  if (!env || !env.DB) {
    return {
      success: false,
      error: 'ยังไม่ได้ผูก D1 — รัน wrangler d1 create แล้วใส่ database_id ใน wrangler.toml',
    };
  }
  try {
    return await handleChatAction(env, action, params, CONFIG);
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }
}

function liffPage(origin) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FSHH Chat — LIFF</title>
  <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; padding: 20px;
      font-family: "Noto Sans Thai", Arial, sans-serif;
      background: linear-gradient(135deg, #eef2ff, #f8fafc, #ecfdf5);
      color: #111827;
    }
    .card {
      max-width: 720px; margin: 0 auto; background: #fff;
      border-radius: 18px; padding: 20px;
      box-shadow: 0 16px 40px rgba(15,23,42,.1);
    }
    h1 { margin: 0 0 6px; font-size: 1.4rem; }
    .sub { color: #64748b; font-size: .9rem; margin-bottom: 16px; }
    .status {
      padding: 10px 12px; border-radius: 10px; margin-bottom: 12px;
      background: #f1f5f9; font-size: .9rem;
    }
    .status.ok { background: #dcfce7; color: #166534; }
    .status.err { background: #fee2e2; color: #991b1b; }
    .status.warn { background: #fef3c7; color: #92400e; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
    button {
      border: 0; border-radius: 10px; padding: 10px 14px;
      font-weight: 700; cursor: pointer; background: #0f766e; color: #fff;
    }
    button.secondary { background: #334155; }
    button.line { background: #06c755; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    .mono {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 12px; background: #0f172a; color: #e2e8f0;
      border-radius: 12px; padding: 12px; white-space: pre-wrap;
      max-height: 340px; overflow: auto;
    }
    .kv { font-size: .85rem; margin: 4px 0; }
    .kv b { display: inline-block; min-width: 110px; color: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <h1>FSHH Chat</h1>
    <div class="sub">LIFF + Cloudflare Worker + D1</div>
    <div id="status" class="status warn">กำลังเริ่มระบบ...</div>
    <div class="kv"><b>Worker</b> <span id="workerUrl">-</span></div>
    <div class="kv"><b>LIFF ID</b> <span id="liffId">-</span></div>
    <div class="kv"><b>Login</b> <span id="loginStatus">-</span></div>
    <div class="kv"><b>User</b> <span id="displayName">-</span></div>
    <div class="kv"><b>LINE UID</b> <span id="userId">-</span></div>
    <div class="row">
      <button class="line" onclick="loginLINE()">เข้าสู่ระบบ LINE</button>
      <button class="secondary" onclick="logoutLINE()">ออกจากระบบ</button>
      <button onclick="testWorker()">ทดสอบ Worker</button>
      <button onclick="testBackend()">ทดสอบ D1 API</button>
      <button onclick="testUsers()">ดึง Users</button>
    </div>
    <div class="mono" id="log">รอคำสั่ง...</div>
  </div>
<script>
const LIFF_ID = ${JSON.stringify(CONFIG.LIFF_ID)};
const WORKER_ORIGIN = ${JSON.stringify(origin)};
const API_BASE = WORKER_ORIGIN + '/api/gas';
function log(msg) {
  const box = document.getElementById('log');
  const t = new Date().toLocaleTimeString('th-TH');
  box.textContent += '\\n[' + t + '] ' + msg;
  box.scrollTop = box.scrollHeight;
}
function setStatus(text, type) {
  const el = document.getElementById('status');
  el.textContent = text;
  el.className = 'status ' + (type || '');
}
async function init() {
  document.getElementById('workerUrl').textContent = WORKER_ORIGIN;
  document.getElementById('liffId').textContent = LIFF_ID;
  try {
    if (typeof liff === 'undefined') throw new Error('ไม่พบ LIFF SDK');
    await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true });
    log('liff.init() สำเร็จ');
    if (liff.isLoggedIn()) await loadProfile();
    else {
      document.getElementById('loginStatus').textContent = 'ยังไม่ล็อกอิน';
      setStatus('พร้อมใช้งาน — กดเข้าสู่ระบบ LINE', 'warn');
    }
  } catch (e) {
    setStatus('LIFF init ล้มเหลว: ' + (e.message || e), 'err');
  }
}
async function loadProfile() {
  const profile = await liff.getProfile();
  document.getElementById('loginStatus').textContent = 'LOGIN';
  document.getElementById('displayName').textContent = profile.displayName || '-';
  document.getElementById('userId').textContent = profile.userId || '-';
  setStatus('LINE Login สำเร็จ', 'ok');
  try {
    const idToken = liff.getIDToken ? liff.getIDToken() : null;
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: idToken ? 'authenticateWithLine' : 'lineLogin',
        idToken: idToken || undefined,
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl || '',
      }),
    });
    log('Server login: ' + JSON.stringify(await res.json()));
  } catch (e) {
    log('Server login ยังไม่สำเร็จ: ' + (e.message || e));
  }
}
function loginLINE() { if (!liff.isLoggedIn()) liff.login(); else loadProfile(); }
function logoutLINE() {
  localStorage.removeItem('organization_chat_session');
  if (liff.isLoggedIn()) liff.logout();
  location.reload();
}
async function testWorker() {
  const data = await (await fetch(WORKER_ORIGIN + '/api/test')).json();
  log(JSON.stringify(data));
  setStatus(data.success ? 'Worker ทำงานปกติ' : 'Worker มีปัญหา', data.success ? 'ok' : 'err');
}
async function testBackend() {
  const data = await (await fetch(API_BASE + '?action=health')).json();
  log(JSON.stringify(data));
  const ok = data.success && data.gas && data.gas.success !== false;
  setStatus(ok ? 'D1 API สำเร็จ' : 'D1 ยังไม่พร้อม', ok ? 'ok' : 'err');
}
async function testUsers() {
  log(JSON.stringify(await (await fetch(API_BASE + '?action=users')).json()));
}
document.addEventListener('DOMContentLoaded', init);
</script>
</body>
</html>`;
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  if (request.method === 'GET') {
    const action = url.searchParams.get('action') || 'health';
    const params = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== 'action') params[key] = value;
    }
    const payload = await dispatch(env, action, params);
    return wrapForLiff(action, url.origin, payload, payload.success !== false);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const action = body.action || 'health';
  delete body.action;
  const payload = await dispatch(env, action, body);
  return wrapForLiff(action, url.origin, payload, payload.success !== false);
}

async function serveSticker(request, env) {
  if (!env || !env.ASSETS) {
    return new Response('Sticker assets not bound', { status: 404, headers: corsHeaders() });
  }
  const res = await env.ASSETS.fetch(request);
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cache-Control', 'public, max-age=86400, immutable');
  return new Response(res.body, { status: res.status, headers });
}

async function serveStaticAsset(request, env) {
  if (!env || !env.ASSETS) {
    return new Response('Assets not bound', { status: 404, headers: corsHeaders() });
  }
  const url = new URL(request.url);
  const res = await env.ASSETS.fetch(request);
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  if (url.pathname === '/sw.js') {
    headers.set('Content-Type', 'application/javascript; charset=utf-8');
    headers.set('Cache-Control', 'no-cache');
    headers.set('Service-Worker-Allowed', '/');
  } else if (url.pathname === '/manifest.webmanifest') {
    headers.set('Content-Type', 'application/manifest+json; charset=utf-8');
    headers.set('Cache-Control', 'public, max-age=3600');
  } else {
    headers.set('Cache-Control', 'public, max-age=86400');
  }
  return new Response(res.body, { status: res.status, headers });
}

async function router(request, env) {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (url.pathname.startsWith('/stickers/')) {
    return serveSticker(request, env);
  }

  // PWA / static assets (must not fall through to chat HTML catch-all)
  if (
    request.method === 'GET' &&
    (
      url.pathname === '/manifest.webmanifest' ||
      url.pathname === '/sw.js' ||
      url.pathname === '/favicon.png' ||
      url.pathname === '/favicon.ico' ||
      url.pathname.startsWith('/icons/')
    )
  ) {
    return serveStaticAsset(request, env);
  }

  if (url.pathname === '/api/upload' && request.method === 'POST') {
    return handleFileUpload(request, env);
  }

  if (url.pathname === '/api/internal') {
    return handleInternal(request, env);
  }

  if (url.pathname === '/api/ai') {
    return handleAiAsk(request, env);
  }

  if (url.pathname.startsWith('/files/')) {
    return handleFileDownload(request, env);
  }

  if (url.pathname === '/' || url.pathname === '/liff' || url.pathname === '/index.html' || url.pathname === '/chat') {
    return htmlResponse(buildChatPage(url.origin, CONFIG));
  }

  if (url.pathname === '/test') {
    return htmlResponse(liffPage(url.origin));
  }

  if (url.pathname === '/health') {
    return jsonResponse({
      success: true,
      system: CONFIG.SYSTEM,
      version: CONFIG.VERSION,
      backend: 'd1',
      status: 'online',
      hasFiles: Boolean(env && env.FILES),
      worker: url.origin,
      liffId: CONFIG.LIFF_ID,
      timestamp: new Date().toISOString(),
    });
  }

  if (url.pathname === '/api/test' || url.pathname === '/api') {
    return jsonResponse({
      success: true,
      message: 'Cloudflare Worker + D1',
      system: CONFIG.SYSTEM,
      version: CONFIG.VERSION,
      worker: url.origin,
      hasD1: Boolean(env && env.DB),
      hasFiles: Boolean(env && env.FILES),
      liffId: CONFIG.LIFF_ID,
      endpoints: ['/', '/chat', '/health', '/api/gas', '/api/ai', '/api/upload', '/api/internal', '/files/', '/stickers/'],
      timestamp: new Date().toISOString(),
    });
  }

  if (url.pathname === '/api/gas' || url.pathname === '/api/proxy' || url.pathname === '/api/send-message') {
    return handleApi(request, env);
  }

  const aliasMap = {
    '/api/users': 'users',
    '/api/user': 'user',
    '/api/conversations': 'conversations',
    '/api/messages': 'messages',
  };
  if (aliasMap[url.pathname] && request.method === 'GET') {
    const action = aliasMap[url.pathname];
    const params = {};
    for (const [key, value] of url.searchParams.entries()) params[key] = value;
    const payload = await dispatch(env, action, params);
    return wrapForLiff(action, url.origin, payload, payload.success !== false);
  }

  if (url.pathname === '/api/line-login' && request.method === 'POST') {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
    }
    const action = body.idToken ? 'authenticateWithLine' : 'lineLogin';
    const payload = await dispatch(env, action, body);
    return wrapForLiff(action, url.origin, payload, payload.success !== false);
  }

  if (
    request.method === 'GET' &&
    !url.pathname.startsWith('/api') &&
    !url.pathname.startsWith('/stickers/') &&
    !url.pathname.startsWith('/files/')
  ) {
    return htmlResponse(buildChatPage(url.origin, CONFIG));
  }

  return jsonResponse(
    {
      success: false,
      error: 'Endpoint not found',
      path: url.pathname,
      available: ['/', '/health', '/api/test', '/api/gas'],
    },
    404
  );
}

export default {
  async fetch(request, env) {
    try {
      return await router(request, env);
    } catch (error) {
      return jsonResponse(
        {
          success: false,
          error: 'Worker Internal Error',
          message: error.message || String(error),
        },
        500
      );
    }
  },
};
