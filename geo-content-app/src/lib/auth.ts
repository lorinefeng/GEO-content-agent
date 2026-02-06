export type SessionPayload = {
  sub: string;
  username: string;
  role: 'admin' | 'user';
  iat: number;
  exp: number;
};

const DEFAULT_AUTH_SECRET = 'geo-content-auth-secret-v1';

export function getAuthSecret() {
  const secret = typeof process !== 'undefined' ? process.env.AUTH_SECRET : undefined;
  return typeof secret === 'string' && secret.length > 0 ? secret : DEFAULT_AUTH_SECRET;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeToBytes(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function utf8Encode(s: string) {
  return new TextEncoder().encode(s);
}

function utf8Decode(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

async function hmacSha256(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', utf8Encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, utf8Encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>, ttlSeconds = 60 * 60 * 24 * 7) {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(utf8Encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(utf8Encode(JSON.stringify(fullPayload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSha256(getAuthSecret(), signingInput);
  const encodedSignature = base64UrlEncode(signature);
  return `${signingInput}.${encodedSignature}`;
}

export async function verifySessionToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = await hmacSha256(getAuthSecret(), signingInput);
  const gotSignature = base64UrlDecodeToBytes(encodedSignature);
  if (!timingSafeEqual(expectedSignature, gotSignature)) return null;
  try {
    const payloadJson = utf8Decode(base64UrlDecodeToBytes(encodedPayload));
    const payload = JSON.parse(payloadJson) as Partial<SessionPayload>;
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.username !== 'string' ||
      (payload.role !== 'admin' && payload.role !== 'user') ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map((p) => p.trim());
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    if (k !== name) continue;
    return decodeURIComponent(p.slice(idx + 1));
  }
  return null;
}

export function parseCookies(cookieHeader: string | null) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const raw of parts) {
    const p = raw.trim();
    if (!p) continue;
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(p.slice(idx + 1));
  }
  return out;
}

export function buildSetCookie(
  name: string,
  value: string,
  opts: { maxAgeSeconds?: number; path?: string; secure?: boolean } = {}
) {
  const path = opts.path ?? '/';
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, 'HttpOnly', 'SameSite=Lax'];
  if (opts.secure) parts.push('Secure');
  if (typeof opts.maxAgeSeconds === 'number') parts.push(`Max-Age=${opts.maxAgeSeconds}`);
  return parts.join('; ');
}

function randomBytes(len: number) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return bytes;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const iterations = 100_000;
  const keyMaterial = await crypto.subtle.importKey('raw', utf8Encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hash = new Uint8Array(bits);
  return `pbkdf2$${iterations}$${base64UrlEncode(salt)}$${base64UrlEncode(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split('$');
  if (parts.length !== 4) return false;
  const [scheme, iterRaw, saltRaw, hashRaw] = parts;
  if (scheme !== 'pbkdf2') return false;
  const iterations = Number(iterRaw);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  if (iterations > 100_000) return false;
  const salt = base64UrlDecodeToBytes(saltRaw);
  const expected = base64UrlDecodeToBytes(hashRaw);
  const keyMaterial = await crypto.subtle.importKey('raw', utf8Encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    expected.length * 8
  );
  const got = new Uint8Array(bits);
  return timingSafeEqual(expected, got);
}
