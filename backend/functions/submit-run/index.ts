// Supabase edge function `submit-run` (Deno). The only way a run gets into `public.runs`.
// Owner: backend-engineer. Not run in CI; the rules it uses are unit-tested (rules.ts).
//
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by Supabase into every
// function. Nothing is pasted anywhere, and nothing here logs a key, an IP or a payload.
// Client: POST /functions/v1/submit-run with the anon key (see src/net, M3-13).

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import {
  MAX_BODY_BYTES,
  MAX_BODY_CHARS,
  RATE_LIMIT_PER_HOUR,
  RATE_LIMIT_PER_MINUTE,
  attemptVerdict,
  checkSubmission,
  clientIp,
  hashIp,
  parseRecordResult,
  shouldPrune,
  type RejectCode,
} from './rules.ts';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
};

function reply(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

const rejected = (code: RejectCode): Response => reply({ ok: false, code }, code === 'rate' ? 429 : 400);


/** Reads the request body, counting bytes and cancelling the stream past the cap. Null when over it. */
async function readCappedBody(req: Request): Promise<string | null> {
  if (!req.body) return '';
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text.length > MAX_BODY_CHARS ? null : text;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return rejected('invalid');

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // K5: own secret for the IP hash (supabase secrets set IP_HASH_SALT=<random string>), so rotating the service key does not reset the buckets.
  const salt = Deno.env.get('IP_HASH_SALT');
  if (!url || !serviceKey) return reply({ ok: false, code: 'invalid' }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Rate limit first: it is cheap and covers malformed floods. The IP comes from the CDN header
  // (clientIp: cf-connecting-ip only) and is stored only as a keyed hash. A request with no usable address is refused
  // (B-2), never put in a shared bucket. Count and record happen in ONE SQL call, serialised per
  // IP (B-3, migration 0004). Any database error fails closed.
  const ip = clientIp(req.headers);
  if (ip === null || !salt) return reply({ ok: false, code: 'rate' }, 503); // K2: a server-side refusal, not a bad submission
  const ipHash = await hashIp(ip, salt);
  const gate = await db.rpc('submit_attempt', {
    p_ip_hash: ipHash,
    p_per_minute: RATE_LIMIT_PER_MINUTE,
    p_per_hour: RATE_LIMIT_PER_HOUR,
    p_prune: shouldPrune(Math.random()),
  });
  const verdict = gate.error ? 'unavailable' : attemptVerdict(gate.data);
  if (verdict === 'unavailable') return reply({ ok: false, code: 'rate' }, 503);
  if (verdict === 'limited') return rejected('rate');

  // N4: refuse by declared length first, then still cap what is actually read (the header can lie or be absent).
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return rejected('invalid');
  const text = await readCappedBody(req);
  if (text === null) return rejected('invalid');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return rejected('invalid');
  }
  const checked = checkSubmission(body);
  if (!checked.ok) return rejected(checked.code);

  const { levelId, levelVersion, steps, name, inputLog } = checked.value;
  // Best per name (B-5): one upsert that keeps the lower time, rank and total from the same call.
  // `verified` is false until server replay exists (B-1, backend/README.md). A database fault is a
  // 503 `rate` (the client treats it as a failure to retry later), not a bad submission (B-6).
  const saved = await db.rpc('record_run', {
    p_level_id: levelId,
    p_level_version: levelVersion,
    p_name: name,
    p_steps: steps,
    p_input_log: inputLog,
    p_verified: false,
  });
  const result = saved.error ? null : parseRecordResult(saved.data);
  if (result === null) return reply({ ok: false, code: 'rate' }, 503);
  return reply({ ok: true, rank: result.rank, total: result.total }, 200);
});
