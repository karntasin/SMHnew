/**
 * Speech-to-text via Cloudflare Workers AI Whisper (free neuron quota).
 * Authenticated with X-Chat-Secret (Laravel proxy only).
 */

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
/** large-v3-turbo supports language=th; base @cf/openai/whisper often mis-detects Thai as French. */
const MODEL = '@cf/openai/whisper-large-v3-turbo';
const MODEL_FALLBACK = '@cf/openai/whisper';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Chat-Secret',
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

async function readAudioBytes(request) {
  const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('audio') || form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return { error: 'ต้องแนบไฟล์เสียง audio', status: 400 };
    }
    const buf = await file.arrayBuffer();
    return { bytes: new Uint8Array(buf), mime: file.type || 'application/octet-stream' };
  }
  const buf = await request.arrayBuffer();
  return { bytes: new Uint8Array(buf), mime: contentType || 'application/octet-stream' };
}

function extractText(result) {
  if (!result) return '';
  if (typeof result === 'string') return result.trim();
  if (typeof result.text === 'string') return result.text.trim();
  if (Array.isArray(result.text)) return result.text.join(' ').trim();
  if (typeof result.transcription === 'string') return result.transcription.trim();
  if (result && typeof result === 'object' && result.result && typeof result.result.text === 'string') {
    return result.result.text.trim();
  }
  return '';
}

function looksLikeWrongLanguage(text) {
  if (!text) return false;
  const thai = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
  const latin = (text.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  // Reject French/English hallucinations when almost no Thai letters.
  return latin >= 12 && thai < Math.max(3, Math.floor(latin * 0.25));
}

function toBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function runWhisper(env, bytes) {
  const audioB64 = toBase64(bytes);
  try {
    return await env.AI.run(MODEL, {
      audio: audioB64,
      task: 'transcribe',
      language: 'th',
      initial_prompt: 'บันทึกข้อความราชการภาษาไทย ชื่อ นามสกุล ตำแหน่ง หน่วยงาน',
      vad_filter: true,
    });
  } catch (primaryError) {
    // Fallback: older whisper binding (array of bytes); still try to steer Thai.
    try {
      return await env.AI.run(MODEL_FALLBACK, {
        audio: [...bytes],
        language: 'th',
        task: 'transcribe',
      });
    } catch {
      throw primaryError;
    }
  }
}

export async function handleTranscribe(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'ใช้ POST เท่านั้น' }, 405);
  }

  const expected = String((env && env.CHAT_SYNC_SECRET) || '');
  if (!expected) {
    return jsonResponse({ success: false, error: 'ยังไม่ได้ตั้ง CHAT_SYNC_SECRET' }, 503);
  }
  const given = request.headers.get('X-Chat-Secret') || '';
  if (!timingSafeEqual(given, expected)) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  if (!env || !env.AI) {
    return jsonResponse({ success: false, error: 'ยังไม่ได้เปิด Workers AI', code: 'NO_AI' }, 503);
  }

  let audio;
  try {
    audio = await readAudioBytes(request);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message || 'อ่านไฟล์เสียงไม่สำเร็จ' }, 400);
  }
  if (audio.error) {
    return jsonResponse({ success: false, error: audio.error }, audio.status || 400);
  }
  if (!audio.bytes || audio.bytes.byteLength < 64) {
    return jsonResponse({ success: false, error: 'ไฟล์เสียงสั้นเกินไป', code: 'TOO_SHORT' }, 400);
  }
  if (audio.bytes.byteLength > MAX_BYTES) {
    return jsonResponse({ success: false, error: 'ไฟล์เสียงใหญ่เกินไป (สูงสุด 3MB)', code: 'TOO_LARGE' }, 413);
  }

  try {
    const result = await runWhisper(env, audio.bytes);
    let text = extractText(result);
    if (!text) {
      return jsonResponse({ success: true, text: '', empty: true });
    }
    if (looksLikeWrongLanguage(text)) {
      // One retry without previous-text conditioning often clears FR/EN hallucinations.
      try {
        const retry = await env.AI.run(MODEL, {
          audio: toBase64(audio.bytes),
          task: 'transcribe',
          language: 'th',
          condition_on_previous_text: false,
          initial_prompt: 'ภาษาไทยเท่านั้น',
        });
        const again = extractText(retry);
        if (again && !looksLikeWrongLanguage(again)) {
          text = again;
        } else {
          return jsonResponse({
            success: true,
            text: '',
            empty: true,
            discarded: 'non_thai',
            rawPreview: text.slice(0, 80),
          });
        }
      } catch {
        return jsonResponse({
          success: true,
          text: '',
          empty: true,
          discarded: 'non_thai',
          rawPreview: text.slice(0, 80),
        });
      }
    }
    return jsonResponse({ success: true, text, model: MODEL, language: 'th' });
  } catch (error) {
    const message = error && error.message ? String(error.message) : String(error);
    const quota =
      /neuron|quota|limit|429|402|capacity/i.test(message) ||
      (error && (error.status === 429 || error.code === 3012));
    return jsonResponse(
      {
        success: false,
        error: quota ? 'โควต้า Workers AI เต็มวันนี้' : message || 'แปลงเสียงไม่สำเร็จ',
        code: quota ? 'QUOTA' : 'AI_ERROR',
      },
      quota ? 429 : 502
    );
  }
}
