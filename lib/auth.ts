import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_COOKIE = 'auth_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ── Token ────────────────────────────────────────────────────────────────────

function getSecret(): string {
  const s = process.env.AUTH_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SESSION_SECRET missing or too short');
  return s;
}

export function createSessionToken(): string {
  const payload = `${Date.now()}:${Math.random()}`;
  const mac = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${mac}`).toString('base64url');
}

export function verifySessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const lastColon = decoded.lastIndexOf(':');
    if (lastColon === -1) return false;
    const payload = decoded.slice(0, lastColon);
    const mac = decoded.slice(lastColon + 1);
    const expected = createHmac('sha256', getSecret()).update(payload).digest('hex');
    return timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export { SESSION_COOKIE, SESSION_MAX_AGE };

// ── Rate limiter (in-memory, per IP) ─────────────────────────────────────────

interface Attempt { count: number; resetAt: number }
const attempts = new Map<string, Attempt>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

export function resetRateLimit(ip: string): void {
  attempts.delete(ip);
}
