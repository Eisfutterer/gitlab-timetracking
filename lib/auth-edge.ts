// Edge Runtime compatible auth helpers (Web Crypto API only)

export const SESSION_COOKIE = 'auth_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmac(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return toHex(sig);
}

export async function createSessionToken(username: string): Promise<string> {
  const secret = process.env.AUTH_SESSION_SECRET ?? '';
  const payload = `${username}:${Date.now()}:${Math.random()}`;
  const mac = await hmac(secret, payload);
  return btoa(`${payload}:${mac}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.AUTH_SESSION_SECRET ?? '';
    if (!secret) return false;
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const lastColon = decoded.lastIndexOf(':');
    if (lastColon === -1) return false;
    const payload = decoded.slice(0, lastColon);
    const mac = decoded.slice(lastColon + 1);
    const expected = await hmac(secret, payload);
    if (mac.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < mac.length; i++) {
      diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
