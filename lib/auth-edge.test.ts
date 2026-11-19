import { describe, it, expect, vi } from 'vitest';
import { createSessionToken, verifySessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth-edge';
import { createSessionToken as nodeCreateSessionToken } from '@/lib/auth';

describe('session token (edge / Web Crypto)', () => {
    it('round-trips: an awaited created token verifies true', async () => {
        const token = await createSessionToken('alice');
        expect(await verifySessionToken(token)).toBe(true);
    });

    it('rejects a malformed token (decoded payload without a colon)', async () => {
        const noColon = btoa('abc').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        expect(await verifySessionToken(noColon)).toBe(false);
    });

    it('rejects a token with a tampered MAC', async () => {
        const token = await createSessionToken('bob');
        const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
        const flipped = decoded.slice(0, -1) + (decoded.slice(-1) === '0' ? '1' : '0');
        const tampered = btoa(flipped).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        expect(await verifySessionToken(tampered)).toBe(false);
    });

    it('rejects non-decodable garbage (atob throws → caught → false)', async () => {
        // '*' is not a valid base64 character and survives the url→std replacements.
        expect(await verifySessionToken('***')).toBe(false);
    });

    it('rejects a token whose MAC length differs from the expected length', async () => {
        // payload + short mac → length mismatch branch (mac.length !== expected.length).
        const raw = 'alice:123:0.5:deadbeef';
        const tok = btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        expect(await verifySessionToken(tok)).toBe(false);
    });

    it('returns false (NOT throw) when AUTH_SESSION_SECRET is missing', async () => {
        const token = await createSessionToken('carol');
        vi.stubEnv('AUTH_SESSION_SECRET', '');
        await expect(verifySessionToken(token)).resolves.toBe(false);
    });

    it('exercises the "" fallback when AUTH_SESSION_SECRET is undefined', async () => {
        vi.stubEnv('AUTH_SESSION_SECRET', undefined as unknown as string);
        // create: `?? ''` branch taken (line 26); Web Crypto then rejects a zero-length key.
        await expect(createSessionToken('frank')).rejects.toThrow();
        // verify: `?? ''` (line 34) then `if (!secret) return false` (line 35).
        expect(await verifySessionToken('anything')).toBe(false);
    });

    it('exports stable cookie name and max-age constants', () => {
        expect(SESSION_COOKIE).toBe('auth_session');
        expect(SESSION_MAX_AGE).toBe(60 * 60 * 24 * 7);
    });

    // Documents the empirically observed edge/node interop. The node helper uses
    // Buffer base64url and the edge helper uses btoa + manual url-safe replacement;
    // for the hex-MAC payloads produced here both encodings coincide, so an
    // edge-verify DOES accept a node-created token. (The infra prompt hypothesised
    // they might differ — in practice, with this payload shape, they do not.)
    it('edge verify accepts a node-created token (encodings coincide for these payloads)', async () => {
        const nodeToken = nodeCreateSessionToken('dave');
        expect(await verifySessionToken(nodeToken)).toBe(true);
    });
});
