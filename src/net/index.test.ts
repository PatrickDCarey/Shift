import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The shared client reads `import.meta.env` once. These tests stub the two values and load a
// fresh copy of the module each time, so they pass whatever the developer's `.env` holds.
async function loadFresh(): Promise<typeof import('.')> {
  vi.resetModules();
  return import('.');
}

describe('getNetClient', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is a shared, disabled client when the build has no Supabase values', async () => {
    const { getNetClient } = await loadFresh();
    const client = getNetClient();
    expect(getNetClient()).toBe(client);
    expect(client.enabled).toBe(false);
    expect(await client.fetchTopRuns('w1-01', 1, 10)).toEqual({ ok: false, reason: 'disabled' });
  });

  it('is enabled when both values are present (fake test values)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example-ref.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_test_value');
    const { getNetClient } = await loadFresh();
    expect(getNetClient().enabled).toBe(true);
  });
});
