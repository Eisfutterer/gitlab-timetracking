import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createSessionToken,
    verifySessionToken,
    getUserHashes,
    checkRateLimit,
    resetRateLimit,
    SESSION_COOKIE,
    SESSION_MAX_AGE,
} from '@/lib/auth';

describe('session token (node)', () => {
    it('round-trips: a created token verifies true', () => {
        const token = createSessionToken('alice');
        expect(verifySessionToken(token)).toBe(true);
    });

    it('rejects a malformed token (no colon in decoded payload)', () => {
        // "abc" base64url-decodes to bytes without a ':' separator
        const noColon = Buffer.from('abc').toString('base64url');
        expect(verifySessionToken(noColon)).toBe(false);
    });

    it('rejects a token with a tampered MAC', () => {
        const token = createSessionToken('bob');
        const decoded = Buffer.from(token, 'base64url').toString();
        const tampered = Buffer.from(decoded.slice(0, -1) + (decoded.slice(-1) === '0' ? '1' : '0')).toString('base64url');
        expect(verifySessionToken(tampered)).toBe(false);
    });

    it('rejects total garbage input', () => {
        expect(verifySessionToken('!!!not-base64!!!:::')).toBe(false);
    });

    it('returns false (catch branch) when getSecret throws during verify', () => {
        const token = createSessionToken('eve');
        // Remove the secret AFTER creating the token → getSecret() throws inside
        // verifySessionToken and is swallowed by the try/catch (lines 35-37).
        vi.stubEnv('AUTH_SESSION_SECRET', '');
        expect(verifySessionToken(token)).toBe(false);
    });

    it('throws via getSecret when AUTH_SESSION_SECRET is missing', () => {
        vi.stubEnv('AUTH_SESSION_SECRET', '');
        expect(() => createSessionToken('x')).toThrow(/AUTH_SESSION_SECRET/);
    });

    it('throws via getSecret when AUTH_SESSION_SECRET is shorter than 32 chars', () => {
        vi.stubEnv('AUTH_SESSION_SECRET', 'too-short');
        expect(() => createSessionToken('x')).toThrow(/too short|missing/i);
    });

    it('exports stable cookie name and max-age constants', () => {
        expect(SESSION_COOKIE).toBe('auth_session');
        expect(SESSION_MAX_AGE).toBe(60 * 60 * 24 * 7);
    });
});

describe('getUserHashes', () => {
    it('returns {} when AUTH_USERS is empty', () => {
        vi.stubEnv('AUTH_USERS', '');
        expect(getUserHashes()).toEqual({});
    });

    it('returns {} when AUTH_USERS is undefined', () => {
        vi.stubEnv('AUTH_USERS', undefined as unknown as string);
        expect(getUserHashes()).toEqual({});
    });

    it('parses valid JSON', () => {
        vi.stubEnv('AUTH_USERS', '{"alice":"hash1","bob":"hash2"}');
        expect(getUserHashes()).toEqual({ alice: 'hash1', bob: 'hash2' });
    });

    it('throws on invalid JSON', () => {
        vi.stubEnv('AUTH_USERS', '{not-json');
        expect(() => getUserHashes()).toThrow(/not valid JSON/);
    });
});

describe('rate limiter', () => {
    beforeEach(() => {
        // Map is module-global: ensure a clean slate for the shared IP used below.
        resetRateLimit('10.0.0.1');
    });

    it('allows the first 5 attempts and blocks the 6th', () => {
        const ip = '10.0.0.1';
        for (let i = 0; i < 5; i++) {
            expect(checkRateLimit(ip).allowed).toBe(true);
        }
        const sixth = checkRateLimit(ip);
        expect(sixth.allowed).toBe(false);
        expect(sixth.retryAfter).toBeGreaterThan(0);
    });

    it('resetRateLimit clears the counter so attempts are allowed again', () => {
        const ip = '10.0.0.2';
        for (let i = 0; i < 5; i++) checkRateLimit(ip);
        expect(checkRateLimit(ip).allowed).toBe(false);
        resetRateLimit(ip);
        expect(checkRateLimit(ip).allowed).toBe(true);
    });

    it('starts a fresh window once the previous window has expired', () => {
        const ip = '10.0.0.3';
        resetRateLimit(ip);
        const now = 1_000_000;
        const spy = vi.spyOn(Date, 'now');
        // Exhaust the window at t=now.
        spy.mockReturnValue(now);
        for (let i = 0; i < 5; i++) checkRateLimit(ip);
        expect(checkRateLimit(ip).allowed).toBe(false);
        // Jump past the 15-minute window → allowed again.
        spy.mockReturnValue(now + 15 * 60 * 1000 + 1);
        expect(checkRateLimit(ip).allowed).toBe(true);
        spy.mockRestore();
        resetRateLimit(ip);
    });

    it('uses independent counters per IP', () => {
        resetRateLimit('10.0.0.4');
        resetRateLimit('10.0.0.5');
        for (let i = 0; i < 5; i++) checkRateLimit('10.0.0.4');
        expect(checkRateLimit('10.0.0.4').allowed).toBe(false);
        // A different IP is unaffected.
        expect(checkRateLimit('10.0.0.5').allowed).toBe(true);
        resetRateLimit('10.0.0.4');
        resetRateLimit('10.0.0.5');
    });
});
