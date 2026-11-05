import { describe, expect, it } from 'vitest';
import { getNetClient } from '.';

describe('getNetClient', () => {
  it('is a shared, disabled client when the build has no Supabase values', async () => {
    const client = getNetClient();
    expect(getNetClient()).toBe(client);
    expect(client.enabled).toBe(false);
    expect(await client.fetchTopRuns('w1-01', 1, 10)).toEqual({ ok: false, reason: 'disabled' });
  });
});
