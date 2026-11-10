import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  createSessionToken,
  checkRateLimit,
  resetRateLimit,
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
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let password: string;
  try {
    const body = await req.json();
    password = String(body.password ?? '');
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  // ── Verify password (bcrypt, constant-time) ──────────────────────────────
  const hash = process.env.AUTH_PASSWORD_HASH ?? '';
  const valid = hash ? await bcrypt.compare(password, hash) : false;

  if (!valid) {
    return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 });
  }

  // ── Issue session token ──────────────────────────────────────────────────
  resetRateLimit(ip);
  const token = createSessionToken();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return res;
}
