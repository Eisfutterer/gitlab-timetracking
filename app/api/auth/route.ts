import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  createSessionToken,
  checkRateLimit,
  resetRateLimit,
  getUserHashes,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from '@/lib/auth';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  // ── Origin check (CSRF) ──────────────────────────────────────────────────
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // ── Rate limit ───────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Versuche. Bitte warten.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let username: string;
  let password: string;
  try {
    const body = await req.json();
    username = String(body.username ?? '').trim();
    password = String(body.password ?? '');
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  // ── Look up user ─────────────────────────────────────────────────────────
  const users = getUserHashes();
  const hash = users[username];

  // Always run bcrypt to prevent user-enumeration via timing
  const dummyHash = '$2b$12$invalidhashpaddingtomatchcost000000000000000000000000000';
  const valid = hash ? await bcrypt.compare(password, hash) : await bcrypt.compare(password, dummyHash).then(() => false);

  if (!valid) {
    return NextResponse.json({ error: 'Falscher Benutzername oder Passwort' }, { status: 401 });
  }

  // ── Issue session token ──────────────────────────────────────────────────
  resetRateLimit(ip);
  const token = createSessionToken(username);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false, // Cloudflare Tunnel handles HTTPS termination
    sameSite: 'lax', // 'strict' blocks cross-origin redirects via Cloudflare
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  return res;
}

// Logout
export async function DELETE(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return res;
}
