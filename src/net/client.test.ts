import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_BOARD_VERIFIED_ONLY, createNetClient } from './client';
import type { NetConfig } from './types';
import { MAX_RUN_STEPS, shouldSubmitRun } from './submitPolicy';

const config: NetConfig = { baseUrl: 'https://abc.supabase.co', anonKey: 'anon-key-value' };

const row = (over: Record<string, unknown> = {}) => ({
  display_name: 'ADA',
  steps: 1234,
  verified: false,
  created_at: '2026-11-04T12:00:00.000Z',
  ...over,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function setup(fetchImpl: (url: string, init: RequestInit) => Promise<Response>, over = {}) {
  const fetchMock = vi.fn(fetchImpl);
  const client = createNetClient({ config, fetch: fetchMock, isOnline: () => true, ...over });
  return { fetchMock, client };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('fetchTopRuns: request', () => {
  it('asks PostgREST for explicit public columns, ordered, filtered, limited', async () => {
    const { fetchMock, client } = setup(async () => json([row()]));
    const result = await client.fetchTopRuns('w1-03', 2, 20);
    expect(result).toEqual({
      ok: true,
      data: [{ displayName: 'ADA', steps: 1234, verified: false, createdAt: '2026-11-04T12:00:00.000Z' }],
    });
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const u = new URL(url);
    expect(`${u.origin}${u.pathname}`).toBe('https://abc.supabase.co/rest/v1/runs');
    expect(u.searchParams.get('level_id')).toBe('eq.w1-03');
    expect(u.searchParams.get('level_version')).toBe('eq.2');
    expect(u.searchParams.get('select')).toBe('display_name,steps,verified,created_at');
    expect(u.searchParams.get('order')).toBe('steps.asc,created_at.asc,id.asc');
    expect(u.searchParams.get('limit')).toBe('20');
    expect(u.searchParams.get('offset')).toBe('0');
    expect(url).not.toContain('input_log');
    expect(u.searchParams.get('select')).not.toContain('*');
  });

  it('sends the anon key as apikey, GET only, no credentials, no redirects', async () => {
    const { fetchMock, client } = setup(async () => json([]));
    await client.fetchTopRuns('w0-01', 1, 5);
    const init = (fetchMock.mock.calls[0] as [string, RequestInit])[1];
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ apikey: 'anon-key-value', Accept: 'application/json' });
    expect(init.credentials).toBe('omit');
    expect(init.redirect).toBe('error');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.body).toBeUndefined();
  });

  it('also sends a JWT-shaped anon key as the Bearer token', async () => {
    const fetchMock = vi.fn(async () => json([]));
    const client = createNetClient({ config: { ...config, anonKey: 'a.b.c' }, fetch: fetchMock, isOnline: () => true });
    await client.fetchTopRuns('w0-01', 1, 5);
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).toMatchObject({ apikey: 'a.b.c', Authorization: 'Bearer a.b.c' });
  });

  it('clamps limit and offset into sane ranges', async () => {
    const { fetchMock, client } = setup(async () => json([]));
    await client.fetchTopRuns('w1-01', 1, 5000, -3);
    await client.fetchTopRuns('w1-01', 1, 0, 99999);
    const params = fetchMock.mock.calls.map((c) => new URL((c as [string, RequestInit])[0]).searchParams);
    expect([params[0]?.get('limit'), params[0]?.get('offset')]).toEqual(['100', '0']);
    expect([params[1]?.get('limit'), params[1]?.get('offset')]).toEqual(['1', '10000']);
  });

  it.each([
    ['bad level id', 'w1-03&select=*', 1],
    ['empty level id', '', 1],
    ['world out of range', 'w9-01', 1],
    ['zero version', 'w1-01', 0],
    ['fractional version', 'w1-01', 1.5],
    ['NaN version', 'w1-01', Number.NaN],
  ])('refuses %s without a request', async (_name, id, version) => {
    const { fetchMock, client } = setup(async () => json([]));
    expect(await client.fetchTopRuns(id, version, 10)).toEqual({ ok: false, reason: 'invalid-args' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('fetchTopRuns: failures resolve quietly', () => {
  it('times out when the server never answers (and aborts the request)', async () => {
    let signal: AbortSignal | undefined;
    const { client } = setup(
      (_url, init) => {
        signal = init.signal ?? undefined;
        return new Promise<Response>(() => undefined); // ignores abort on purpose
      },
      { timeoutMs: 3000 },
    );
    const pending = client.fetchTopRuns('w1-01', 1, 10);
    await vi.advanceTimersByTimeAsync(2999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(await pending).toEqual({ ok: false, reason: 'timeout' });
    expect(signal?.aborted).toBe(true);
  });

  it('times out when the body stalls after the headers arrive', async () => {
    const stalled = {
      ok: true,
      status: 200,
      text: () => new Promise<string>(() => undefined),
    } as unknown as Response;
    const { client } = setup(async () => stalled, { timeoutMs: 1000 });
    const pending = client.fetchTopRuns('w1-01', 1, 10);
    await vi.advanceTimersByTimeAsync(1001);
    expect(await pending).toEqual({ ok: false, reason: 'timeout' });
  });

  it('rejects on content-length over the cap without reading the body', async () => {
    const text = vi.fn(async () => '[]');
    const big = { ok: true, status: 200, headers: new Headers({ 'content-length': String(300 * 1024) }), text } as unknown as Response;
    const { client } = setup(async () => big);
    const pending = client.fetchTopRuns('w1-01', 1, 10);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ ok: false, reason: 'invalid-response' });
    expect(text).not.toHaveBeenCalled();
  });

  it('cancels the stream once past the cap when there is no content-length', async () => {
    const cancel = vi.fn();
    const chunk = new Uint8Array(100 * 1024).fill(32);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        controller.enqueue(chunk); // endless: only a cap stops it
      },
      cancel,
    });
    const { client } = setup(async () => new Response(body, { status: 200 }));
    const pending = client.fetchTopRuns('w1-01', 1, 10);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ ok: false, reason: 'invalid-response' });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(sent).toBeLessThan(10);
  });

  it('cancels the stream once past the cap when content-length lies', async () => {
    const cancel = vi.fn();
    const chunk = new Uint8Array(100 * 1024).fill(32);
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(chunk);
      },
      cancel,
    });
    const res = new Response(body, { status: 200, headers: { 'content-length': '10' } });
    const { client } = setup(async () => res);
    const pending = client.fetchTopRuns('w1-01', 1, 10);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ ok: false, reason: 'invalid-response' });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('reports a 500 with its status', async () => {
    const { client } = setup(async () => new Response('boom', { status: 500 }));
    expect(await client.fetchTopRuns('w1-01', 1, 10)).toEqual({ ok: false, reason: 'http', status: 500 });
  });

  it('reports a 401 the same way', async () => {
    const { client } = setup(async () => json({ message: 'nope' }, 401));
    expect(await client.fetchTopRuns('w1-01', 1, 10)).toEqual({ ok: false, reason: 'http', status: 401 });
  });

  it('reports a rejected fetch (network down, CORS, blocked) as offline', async () => {
    const { client } = setup(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await client.fetchTopRuns('w1-01', 1, 10)).toEqual({ ok: false, reason: 'offline' });
  });

  it('reports a synchronous throw from fetch as offline', async () => {
    const { client } = setup(() => {
      throw new Error('sync');
    });
    expect(await client.fetchTopRuns('w1-01', 1, 10)).toEqual({ ok: false, reason: 'offline' });
  });

  it('does not call fetch at all when the browser says it is offline', async () => {
    const { fetchMock, client } = setup(async () => json([]), { isOnline: () => false });
    expect(await client.fetchTopRuns('w1-01', 1, 10)).toEqual({ ok: false, reason: 'offline' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('survives an isOnline probe that throws', async () => {
    const { client } = setup(async () => json([]), {
      isOnline: () => {
        throw new Error('no navigator');
      },
    });
    expect((await client.fetchTopRuns('w1-01', 1, 10)).ok).toBe(true);
  });

  it('treats a missing global fetch as offline', async () => {
    const client = createNetClient({ config, isOnline: () => true });
    vi.stubGlobal('fetch', undefined);
    try {
      expect(await client.fetchTopRuns('w1-01', 1, 10)).toEqual({ ok: false, reason: 'offline' });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([
    ['not JSON', () => new Response('<html>oops</html>', { status: 200 })],
    ['an object, not an array', () => json({ rows: [] })],
    ['null', () => json(null)],
    ['a row that is not an object', () => json([42])],
    ['a missing field', () => json([{ display_name: 'ADA', steps: 5 }])],
    ['a string for steps', () => json([row({ steps: '12' })])],
    ['negative steps', () => json([row({ steps: -1 })])],
    ['zero steps', () => json([row({ steps: 0 })])],
    ['fractional steps', () => json([row({ steps: 1.5 })])],
    ['absurd steps', () => json([row({ steps: 10_000_000 })])],
    ['an empty name', () => json([row({ display_name: '' })])],
    ['an overlong name', () => json([row({ display_name: 'x'.repeat(25) })])],
    ['a control character in the name', () => json([row({ display_name: 'a\u0007b' })])],
    ['a non-boolean verified', () => json([row({ verified: 'yes' })])],
    ['a bad timestamp', () => json([row({ created_at: 'yesterday' })])],
    ['more rows than asked', () => json([row(), row(), row()])],
    ['a body over the size cap', () => new Response(' '.repeat(300_000), { status: 200 })],
  ])('rejects %s as invalid-response', async (_name, make) => {
    const { client } = setup(async () => make());
    expect(await client.fetchTopRuns('w1-01', 1, 2)).toEqual({ ok: false, reason: 'invalid-response' });
  });

  it('accepts an empty board', async () => {
    const { client } = setup(async () => json([]));
    expect(await client.fetchTopRuns('w1-01', 1, 10)).toEqual({ ok: true, data: [] });
  });

  it('refuses markup in names (not on the shared allow-list)', async () => {
    const { client } = setup(async () => json([row({ display_name: '<b>x</b>' })]));
    expect(await client.fetchTopRuns('w1-01', 1, 10)).toEqual({ ok: false, reason: 'invalid-response' });
  });

  it('leaves no timer running after an answer', async () => {
    const { client } = setup(async () => json([]));
    await client.fetchTopRuns('w1-01', 1, 10);
    expect(vi.getTimerCount()).toBe(0);
  });
});

function fakeRun() {
  return {
    wonAtStep: 100,
    solution: { levelId: 'w1-01', levelVersion: 1, steps: 100, runs: [] },
  };
}

describe('without configuration', () => {
  it('is disabled, reports it, and never touches the network', async () => {
    const fetchMock = vi.fn();
    const client = createNetClient({ config: null, fetch: fetchMock });
    expect(client.enabled).toBe(false);
    expect(await client.fetchTopRuns('w1-01', 1, 10)).toEqual({ ok: false, reason: 'disabled' });
    expect(await client.submitRun(fakeRun())).toEqual({ ok: false, reason: 'disabled' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('submitRun (stub until the submit-run edge function exists, M3-11)', () => {
  it('is a no-op that resolves unavailable and sends nothing', async () => {
    const { fetchMock, client } = setup(async () => json({}));
    expect(client.enabled).toBe(true);
    expect(await client.submitRun(fakeRun())).toEqual({ ok: false, reason: 'unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws on garbage input', async () => {
    const { client } = setup(async () => json({}));
    await expect(client.submitRun(undefined as never)).resolves.toMatchObject({ ok: false });
  });
});

describe('fetchTopRuns: verified-only switch (B-1)', () => {
  it('ships OFF: no verified filter by default', async () => {
    expect(PUBLIC_BOARD_VERIFIED_ONLY).toBe(false);
    const { fetchMock, client } = setup(async () => json([row()]));
    await client.fetchTopRuns('w1-01', 1, 10);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).searchParams.has('verified')).toBe(false);
  });
  it('asks only for verified rows when switched on', async () => {
    const { fetchMock, client } = setup(async () => json([row({ verified: true })]), { verifiedOnly: true });
    expect((await client.fetchTopRuns('w1-01', 1, 10)).ok).toBe(true);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).searchParams.get('verified')).toBe('eq.true');
  });
  it('an explicit false overrides the constant', async () => {
    const { fetchMock, client } = setup(async () => json([row()]), { verifiedOnly: false });
    await client.fetchTopRuns('w1-01', 1, 10);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).searchParams.has('verified')).toBe(false);
  });
  it('rejects a row above the server step cap (B-8)', async () => {
    const { client } = setup(async () => json([row({ steps: 36_001 })]));
    expect(await client.fetchTopRuns('w1-01', 1, 10)).toEqual({ ok: false, reason: 'invalid-response' });
  });
});

describe('submitRun skip rule (long levels)', () => {
  const run = (frames: number) => ({
    wonAtStep: 100,
    solution: { levelId: 'w2-05', levelVersion: 2, steps: frames, runs: [] },
  });
  it('skips a run whose frames exceed MAX_RUN_STEPS, quietly and without a request', async () => {
    const { fetchMock, client } = setup(async () => json({}));
    expect(await client.submitRun(run(MAX_RUN_STEPS + 1))).toEqual({ ok: false, reason: 'skipped' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not skip a run at exactly MAX_RUN_STEPS', async () => {
    const { client } = setup(async () => json({}));
    expect(await client.submitRun(run(MAX_RUN_STEPS))).not.toEqual({ ok: false, reason: 'skipped' });
  });
  it('shouldSubmitRun is false for malformed runs', () => {
    expect(shouldSubmitRun(run(MAX_RUN_STEPS))).toBe(true);
    expect(shouldSubmitRun(run(0))).toBe(false);
    expect(shouldSubmitRun(null)).toBe(false);
    expect(shouldSubmitRun({})).toBe(false);
  });
});
