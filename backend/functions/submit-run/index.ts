// Supabase edge function `submit-run` (Deno). The only way a run gets into `public.runs`.
// Owner: backend-engineer. Not run in CI; the rules it uses are unit-tested (rules.ts).
//
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by Supabase into every
// function. Nothing is pasted anywhere, and nothing here logs a key, an IP or a payload.
// Client: POST /functions/v1/submit-run with the anon key (see src/net, M3-13).

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { ATTEMPT_RETENTION_MS, MAX_BODY_CHARS, checkSubmission, hashIp, rateVerdict, shouldStore, type RejectCode } from './rules.ts';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
};

function reply(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

const rejected = (code: RejectCode): Response => reply({ ok: false, code }, code === 'rate' ? 429 : 400);

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return rejected('invalid');

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reply({ ok: false, code: 'invalid' }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Rate limit first: it is cheap and covers malformed floods. The IP comes from the CDN header
  // and is stored only as a keyed hash. Order (B1, B4): prune old rows, count, then insert only
  // under the limit, so a flood cannot grow the table. Any database error fails closed.
  const ipHash = await hashIp(req.headers.get('cf-connecting-ip') ?? 'unknown', serviceKey);
  const now = Date.now();
  const pruned = await db.from('submit_attempts').delete().lt('created_at', new Date(now - ATTEMPT_RETENTION_MS).toISOString());
  const since = (ms: number) => new Date(now - ms).toISOString();
  const attempts = () => db.from('submit_attempts').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash);
  const [minute, hour] = await Promise.all([attempts().gte('created_at', since(60_000)), attempts().gte('created_at', since(ATTEMPT_RETENTION_MS))]);
  const verdict = pruned.error || minute.error || hour.error ? 'unavailable' : rateVerdict(minute.count, hour.count);
  if (verdict === 'unavailable') return reply({ ok: false, code: 'rate' }, 503);
  if (verdict === 'limited') return rejected('rate');
  const logged = await db.from('submit_attempts').insert({ ip_hash: ipHash });
  if (logged.error) return reply({ ok: false, code: 'rate' }, 503);

  const text = await req.text();
  if (text.length > MAX_BODY_CHARS) return rejected('invalid');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return rejected('invalid');
  }
  const checked = checkSubmission(body);
  if (!checked.ok) return rejected(checked.code);

  const { levelId, levelVersion, steps, name, inputLog } = checked.value;
  // Retention (B2): one row per name per level version, the best. A slower repeat is not stored.
  const mine = () => db.from('runs').select('steps').eq('level_id', levelId).eq('level_version', levelVersion).eq('display_name', name);
  const existing = await mine().order('steps', { ascending: true }).limit(1);
  if (existing.error) return reply({ ok: false, code: 'invalid' }, 500);
  if (shouldStore(existing.data[0]?.steps ?? null, steps)) {
    const { error } = await db.from('runs').insert({
      level_id: levelId,
      level_version: levelVersion,
      display_name: name,
      steps,
      input_log: inputLog,
    });
    if (error) return reply({ ok: false, code: 'invalid' }, 500);
    await db.from('runs').delete().eq('level_id', levelId).eq('level_version', levelVersion).eq('display_name', name).gt('steps', steps);
  }

  const board = () => db.from('runs').select('id', { count: 'exact', head: true }).eq('level_id', levelId).eq('level_version', levelVersion);
  const [better, total] = await Promise.all([board().lt('steps', steps), board()]);
  return reply({ ok: true, rank: (better.count ?? 0) + 1, total: total.count ?? 0 }, 200);
});
