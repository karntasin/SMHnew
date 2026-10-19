/**
 * Web Push (RFC 8291 aes128gcm + VAPID ES256) using Web Crypto.
 * Works in Cloudflare Workers. Private key stays in env, never in the client.
 */

const VAPID_SUBJECT = 'mailto:fshh-chat@fshh-app.online';

function bytesToBase64Url(bytes) {
  let bin = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const clean = String(value || '').trim();
  const pad = '='.repeat((4 - (clean.length % 4)) % 4);
  const b64 = (clean + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concatBytes(parts) {
  const len = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

export async function encryptWebPushPayload(p256dhB64, authB64, payloadText) {
  const userPublic = base64UrlToBytes(p256dhB64);
  const auth = base64UrlToBytes(authB64);
  if (userPublic.length !== 65) throw new Error('p256dh ต้องยาว 65 ไบต์');
  if (auth.length < 16) throw new Error('auth secret สั้นเกินไป');

  const local = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const localPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const remoteKey = await crypto.subtle.importKey(
    'raw',
    userPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: remoteKey }, local.privateKey, 256)
  );

  const keyInfo = concatBytes([
    new TextEncoder().encode('WebPush: info\0'),
    userPublic,
    localPublic,
  ]);
  const ikm = await hkdf(auth, shared, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  const plaintext = concatBytes([new TextEncoder().encode(payloadText), new Uint8Array([2])]);
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext)
  );

  const rs = 4096;
  const header = new Uint8Array(21 + localPublic.length);
  header.set(salt, 0);
  header[16] = (rs >>> 24) & 0xff;
  header[17] = (rs >>> 16) & 0xff;
  header[18] = (rs >>> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = localPublic.length;
  header.set(localPublic, 21);
  return concatBytes([header, cipher]);
}

async function vapidJwt(endpoint, publicKey, privateKey) {
  const aud = new URL(endpoint).origin;
  const header = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({
    aud,
    exp,
    sub: VAPID_SUBJECT,
  })));
  const unsigned = `${header}.${body}`;
  const pub = base64UrlToBytes(publicKey);
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: bytesToBase64Url(pub.slice(1, 33)),
      y: bytesToBase64Url(pub.slice(33, 65)),
      d: privateKey,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(unsigned)
    )
  );
  return `${unsigned}.${bytesToBase64Url(sig)}`;
}

export async function generateVapidKeys() {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const rawPub = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return {
    publicKey: bytesToBase64Url(rawPub),
    privateKey: jwk.d,
  };
}

/**
 * @returns {Promise<number>} HTTP status, or 0 when the request failed
 */
export async function sendWebPush(subscription, payloadText, vapid) {
  const endpoint = String(subscription?.endpoint || '');
  const p256dh = String(subscription?.p256dh || '');
  const auth = String(subscription?.auth || '');
  if (!endpoint || !p256dh || !auth) return 0;
  if (!vapid?.publicKey || !vapid?.privateKey) return 0;

  const body = await encryptWebPushPayload(p256dh, auth, payloadText);
  const jwt = await vapidJwt(endpoint, vapid.publicKey, vapid.privateKey);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      TTL: '86400',
      Urgency: 'high',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
    },
    body,
    signal: AbortSignal.timeout(8000),
  });
  return res.status;
}
