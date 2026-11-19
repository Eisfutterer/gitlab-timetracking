import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Deterministic env for auth + gitlab modules.
beforeEach(() => {
    vi.stubEnv('AUTH_SESSION_SECRET', 'test-secret-which-is-at-least-32-chars-long!!');
    vi.stubEnv('AUTH_USERS', '{}');
    vi.stubEnv('GITLAB_TOKEN', 'test-token');
});

afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});
