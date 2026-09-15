import { isGroupConv, nowIso, recordOutboundMessage, requireConversation, resolveUser, serializeMessage } from './chat-api.js';

export const MAX_FILE_BYTES = 8 * 1024 * 1024;

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_MIME = new Set([
  ...IMAGE_MIME,
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const EXT_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function wrapUpload(payload, origin, ok = true) {
  return jsonResponse(
    {
      success: ok && payload && payload.success !== false,
      proxy: false,
      backend: 'd1',
      action: 'uploadFile',
      worker: origin,
      gas: payload,
      timestamp: new Date().toISOString(),
    },
    ok ? 200 : payload && payload.error === 'SESSION_EXPIRED' ? 401 : 400
  );
}

function fileUuid() {
  return crypto.randomUUID().replace(/-/g, '');
}

function extensionOf(name) {
  const parts = String(name || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function safeFilename(name) {
  const base = String(name || 'file').split(/[/\\]/).pop() || 'file';
  const cleaned = base.replace(/[^\p{L}\p{N}._\- ()]/gu, '_').replace(/_+/g, '_').slice(0, 120);
  return cleaned || 'file';
}

function resolveMime(file) {
  const raw = String(file.type || '').toLowerCase().split(';')[0].trim();
  if (ALLOWED_MIME.has(raw)) return raw;
  const ext = extensionOf(file.name);
  return EXT_MIME[ext] || '';
}

function isImageMime(mime) {
  return IMAGE_MIME.has(String(mime || '').toLowerCase());
}

function contentDisposition(filename, inline) {
  const raw = String(filename || 'file');
  const fallback = raw.replace(/["\\\r\n]/g, '_').slice(0, 80) || 'file';
  const encoded = encodeURIComponent(raw);
  return (
    (inline ? 'inline' : 'attachment') +
    '; filename="' + fallback + '"; filename*=UTF-8\'\'' + encoded
  );
}

export async function handleFileUpload(request, env) {
  const origin = new URL(request.url).origin;
  try {
    if (!env || !env.FILES) {
      return wrapUpload({ success: false, error: 'ยังไม่ได้ผูกที่เก็บไฟล์' }, origin, false);
    }
    let form;
    try {
      form = await request.formData();
    } catch {
      return wrapUpload({ success: false, error: 'กรุณาเลือกไฟล์' }, origin, false);
    }
    const token = String(form.get('sessionToken') || '');
    const conversationId = String(form.get('conversationId') || '');
    const file = form.get('file');
    if (!file || typeof file === 'string' || !file.stream) {
      return wrapUpload({ success: false, error: 'กรุณาเลือกไฟล์' }, origin, false);
    }

    const user = await resolveUser(env, token);
    const conv = await requireConversation(env, user.id, conversationId);
    const mime = resolveMime(file);
    if (!mime) {
      return wrapUpload(
        { success: false, error: 'ชนิดไฟล์นี้ยังไม่รองรับ (รูปภาพ PDF Word Excel PowerPoint TXT CSV)' },
        origin,
        false
      );
    }
    const size = Number(file.size || 0);
    if (!size) return wrapUpload({ success: false, error: 'ไฟล์ว่าง' }, origin, false);
    if (size > MAX_FILE_BYTES) {
      return wrapUpload({ success: false, error: 'ไฟล์ใหญ่เกิน 8 MB' }, origin, false);
    }

    const id = fileUuid();
    const filename = safeFilename(file.name || 'file');
    const storageKey = 'c/' + conv.id + '/' + id + '/' + filename;
    const bytes = await file.arrayBuffer();
    await env.FILES.put(storageKey, bytes, {
      metadata: {
        mime,
        filename,
        conversationId: String(conv.id),
        uploaderId: String(user.id),
      },
    });

    const ts = nowIso();
    const messageType = isImageMime(mime) ? 'image' : 'file';
    const payload = JSON.stringify({ fileId: id, name: filename, mime, size });
    await env.DB.prepare(
      `INSERT INTO chat_files
       (id, conversation_id, uploader_id, r2_key, filename, mime, size, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, conv.id, user.id, storageKey, filename, mime, size, ts)
      .run();

    let receiverId = 0;
    if (!isGroupConv(conv)) {
      receiverId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
    }
    const result = await env.DB.prepare(
      `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_type, message, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    )
      .bind(conv.id, user.id, receiverId || 0, messageType, payload, ts)
      .run();
    await recordOutboundMessage(env, {
      conversationId: conv.id,
      messageId: result.meta.last_row_id,
      senderId: user.id,
      messageType,
      message: payload,
      createdAt: ts,
    });

    const row = {
      id: result.meta.last_row_id,
      conversation_id: conv.id,
      sender_id: user.id,
      receiver_id: receiverId || 0,
      message_type: messageType,
      message: payload,
      is_read: 0,
      created_at: ts,
    };
    return wrapUpload({ success: true, ...serializeMessage(row) }, origin, true);
  } catch (error) {
    const msg = error && error.message ? error.message : String(error);
    const expired = msg === 'SESSION_EXPIRED';
    return wrapUpload(
      { success: false, error: expired ? 'SESSION_EXPIRED' : msg },
      origin,
      false
    );
  }
}

export async function handleFileDownload(request, env) {
  try {
    if (!env || !env.FILES) {
      return new Response('File storage not bound', { status: 404, headers: corsHeaders() });
    }
    const url = new URL(request.url);
    const id = decodeURIComponent(url.pathname.replace(/^\/files\//, '')).split('/')[0];
    if (!id || !/^[a-f0-9]{32}$/i.test(id)) {
      return new Response('Not found', { status: 404, headers: corsHeaders() });
    }
    const token = String(url.searchParams.get('sessionToken') || '');
    const user = await resolveUser(env, token);
    const meta = await env.DB.prepare('SELECT * FROM chat_files WHERE id = ?').bind(id).first();
    if (!meta) return new Response('Not found', { status: 404, headers: corsHeaders() });
    await requireConversation(env, user.id, meta.conversation_id);

    const stored = await env.FILES.getWithMetadata(meta.r2_key, { type: 'arrayBuffer' });
    if (!stored || stored.value == null) {
      return new Response('Not found', { status: 404, headers: corsHeaders() });
    }

    const mime = meta.mime || (stored.metadata && stored.metadata.mime) || 'application/octet-stream';
    const headers = new Headers();
    headers.set('Content-Type', mime);
    headers.set('Content-Disposition', contentDisposition(meta.filename, isImageMime(mime)));
    headers.set('Cache-Control', 'private, max-age=3600');
    headers.set('X-Content-Type-Options', 'nosniff');
    Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v));
    if (meta.size) headers.set('Content-Length', String(meta.size));
    return new Response(stored.value, { status: 200, headers });
  } catch (error) {
    const msg = error && error.message ? error.message : String(error);
    if (msg === 'SESSION_EXPIRED') {
      return jsonResponse({ success: false, error: 'SESSION_EXPIRED' }, 401);
    }
    return new Response('Forbidden', { status: 403, headers: corsHeaders() });
  }
}
