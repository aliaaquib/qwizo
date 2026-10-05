/**
 * Auth: PBKDF2 password hashing (WebCrypto) + HMAC-SHA256 JWT in an
 * httpOnly cookie. No sessions table: the signed token is the session.
 * Logout clears the cookie client-side.
 */

const PBKDF2_ITERATIONS = 210000;
const SESSION_DAYS = 7;
export const COOKIE_NAME = 'qwizo_session';

function b64urlEncode(bytes) {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key, 256
  );
  return `${PBKDF2_ITERATIONS}$${b64urlEncode(salt)}$${b64urlEncode(bits)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [iters, saltB64, hashB64] = stored.split('$');
    const salt = b64urlDecode(saltB64);
    const expected = b64urlDecode(hashB64);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: parseInt(iters, 10) },
      key, 256
    ));
    if (bits.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signToken(secret, payload) {
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64urlEncode(sig)}`;
}

export async function verifyToken(secret, token) {
  try {
    const [h, b, s] = token.split('.');
    if (!h || !b || !s) return null;
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlDecode(s), new TextEncoder().encode(`${h}.${b}`));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(b)));
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookie(token, maxAgeSec) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax; Secure`;
}
export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

export function getTokenFromRequest(req) {
  const cookie = req.headers.get('Cookie') || '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return m ? m[1] : null;
}

/** Returns { userId } or null. */
export async function requireTeacher(req, env) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = await verifyToken(env.JWT_SECRET, token);
  if (!payload || !payload.sub) return null;
  return { userId: payload.sub };
}

export function newSessionPayload(userId) {
  const now = Math.floor(Date.now() / 1000);
  return { sub: userId, iat: now, exp: now + SESSION_DAYS * 86400 };
}

/* ---------------- rate limiting (KV sliding window) ---------------- */

export async function rateLimit(env, key, limit, windowSec) {
  try {
    const kvKey = `rl:${key}`;
    const raw = await env.QWIZO_KV.get(kvKey);
    const now = Date.now();
    let stamps = raw ? JSON.parse(raw).filter(t => now - t < windowSec * 1000) : [];
    if (stamps.length >= limit) return false;
    stamps.push(now);
    await env.QWIZO_KV.put(kvKey, JSON.stringify(stamps), { expirationTtl: windowSec + 5 });
    return true;
  } catch {
    return true; // fail open on KV errors — never hard-block teachers
  }
}

export function clientIp(req) {
  const xff = req.headers.get('X-Forwarded-For') || '';
  const parts = xff.split(',').map(s => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : (req.headers.get('CF-Connecting-IP') || 'unknown');
}

/* ---------------- validation helpers ---------------- */

export function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function err(message, status = 400, extra = {}) {
  return jsonResponse({ error: message, ...extra }, status);
}

export async function readJson(req, maxBytes = 256 * 1024) {
  const text = await req.text();
  if (text.length > maxBytes) throw new Error('Payload too large');
  try { return JSON.parse(text || '{}'); }
  catch { throw new Error('Invalid JSON'); }
}
