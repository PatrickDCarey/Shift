# Redshift backend (Supabase leaderboards)

Optional. The game plays fully offline; leaderboards switch on only when the two client values below are present at build time. Owner: backend-engineer.

## What is here

| Path | What it is |
|---|---|
| `migrations/0001_runs.sql` | The `runs` table, indexes and access rules. Safe to run twice. |
| `tests/0001_runs_rls.sql` | Checks that clients can read but never write. Run it right after the migration. |
| `migrations/0002_submit_run.sql` | Name allow-list, step and log caps, and the service-only `submit_attempts` rate-limit table. Run after 0001. |
| `migrations/0003_attempts_prune_index.sql` | Index on `submit_attempts(created_at)` for the per-call prune. Run after 0002. |
| `migrations/0004_atomic_submit.sql` | Unique best-per-name key on `runs`; service-only SQL functions `submit_attempt` (atomic rate limit) and `record_run` (upsert keeping the lower time). Run after 0003. |
| `tests/0004_atomic_checks.sql` | Checks for 0004 (limit, upsert, unique key, no client execute). Run it right after the migration. |
| `tests/0002_submit_run_checks.sql` | Checks for 0002. Run it right after the migration. |
| `functions/submit-run/` | The edge function (task M3-11): the only way to add a run. `rules.ts` holds the pure rules (unit tests: `scripts/submit-run.test.ts`), `index.ts` the Deno handler. Not deployed until M3-12. |

## Set up the Supabase project (owner steps, USER-2, due Nov 14)

You need a free Supabase account. You do not give any key to an agent or to the repo.

1. Go to https://supabase.com/dashboard, sign in, and choose **New project**.
2. Name it `redshift`. Pick the region closest to most players. Generate a database password and store it in your password manager (nothing in this project needs it; do not paste it anywhere). Create the project and wait until it is ready.
3. **Run the migration.** Left menu, **SQL Editor**, **New query**. Open `backend/migrations/0001_runs.sql` from this repo, copy the whole file, paste it, press **Run**. Expect "Success. No rows returned".
4. **Check the rules.** New query again, paste all of `backend/tests/0001_runs_rls.sql`, press **Run**. Expect one row: `ok: all checks for 0001_runs passed (changes rolled back)`. If you see an error starting with `FAIL:`, stop and send the message to the backend-engineer. The test leaves no data behind.
5. **Copy the two public client values.** **Project Settings**, **API** (or **API Keys**). You need:
   - the **Project URL**, like `https://abcdefghij.supabase.co`
   - the **anon / publishable** key. Newer projects call it the *publishable* key (starts `sb_publishable_`); older ones call it *anon public* (a long `eyJ...` string). Either works.

   Do **not** copy the `service_role` or *secret* key anywhere: not into this repo, `.env`, chat or any dashboard field. You never need it. Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into every edge function by itself, and `submit-run` reads them with `Deno.env.get`.
6. **Put them in `.env`** in the repo root (it is git-ignored; `.env.example` shows the names). Copy the example and fill in the two lines:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-OR-PUBLISHABLE-KEY
   ```

   In PowerShell: `Copy-Item .env.example .env`, then edit `.env`.
7. **Smoke test the public API** (PowerShell, from anywhere). Replace the two placeholders:

   ```powershell
   $url = "https://YOUR-PROJECT-REF.supabase.co"
   $key = "YOUR-ANON-OR-PUBLISHABLE-KEY"
   # Only the apikey header: a publishable key (sb_publishable_...) is not a JWT, so do not send it as Bearer.
   $h = @{ apikey = $key }

   # Reading works and returns an empty list: []
   Invoke-RestMethod "$url/rest/v1/runs?select=id,level_id,steps&limit=5" -Headers $h

   # A client must not be able to read the input logs: expect an error (permission denied), not rows
try { Invoke-RestMethod "$url/rest/v1/runs?select=input_log&limit=1" -Headers $h; "BAD: input_log is readable" } catch { "good, input_log refused" }

# Writing must be refused: expect an error with status 401 or 403 (code 42501)
   $body = '{"level_id":"w0-02","level_version":1,"display_name":"cheater","steps":1,"input_log":"1R"}'
   try {
     Invoke-RestMethod "$url/rest/v1/runs" -Method Post -Headers $h -ContentType "application/json" -Body $body
     "BAD: the insert was accepted, tell the backend-engineer"
   } catch { "good, insert refused: $($_.Exception.Response.StatusCode.value__)" }
   ```
8. Free-tier note: Supabase pauses free projects after about a week with no activity. Open the dashboard and restore the project if it says paused, and do so again a day or two before submitting (Nov 30).

9. **Turn off sign-ups.** By default the anon key can create users, and a signed-in user gets the `authenticated` role. Nobody signs in here, so in **Authentication**, **Sign In / Providers** (or **Settings**) switch off **Allow new users to sign up** and **Allow anonymous sign-ins**, and leave every provider disabled.
10. **Check the GraphQL endpoint.** Run the same two checks against `$url/graphql/v1` (POST `{"query":"{ runsCollection { edges { node { inputLog } } } }"}` with the `apikey` header): it must not return `inputLog` values. If it does, tell the backend-engineer. (If you do not use GraphQL, disabling the `pg_graphql` extension also closes it.)

You do not need to configure Storage or Realtime. The game only ever uses the anon key.

### If a secret key leaks

If a `service_role` / secret key (or the database password) ever appears in the repo, a log, chat or a build, treat it as public: in the dashboard go to **Project Settings**, **API Keys** (older projects: **API**, JWT settings) and rotate it, then redeploy the function. Remove it from git history before the repo goes public (SEC-3 scan). Rotating the anon key is only needed if you want to change the public key; update `.env` and rebuild afterwards.

## Schema: `public.runs`

One row per accepted run. Boards are per `(level_id, level_version)`: editing a level bumps its version and starts a fresh board.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk | generated |
| `level_id` | text | `w<0-5>-<nn>`, like `w1-03` |
| `level_version` | integer >= 1 | the `version` header of the level file (an integer in this repo, not a hash) |
| `display_name` | text | 1 to 24 characters, trimmed, no control characters. The edge function applies the real charset and profanity rules. |
| `steps` | integer 1..1,000,000 | run time in 60 Hz simulation steps (`wonAtStep`). Lower is better. Time shown to players is `steps / 60`. |
| `input_log` | text | run-length input log of the whole recording (`docs/tech/level-format.md` section 4), up to 200,000 characters, characters limited to `0-9 L R J . + - !` and whitespace. Kept for server-side replay (v2). |
| `verified` | boolean, default false | set true when a replay through `src/core` reproduces `steps` (v2) |
| `created_at` | timestamptz | default now() |

Index `runs_leaderboard_idx (level_id, level_version, steps, created_at, id)` serves "top N for a level" with stable paging.

### Policies and privileges

- Row level security is **enabled** (and forced for the table owner, which does not affect Supabase's own `postgres` and `service_role`, so the privilege revoke below is the real guard). The only policy is `runs_public_read` (SELECT for `anon` and `authenticated`, all rows). There is no INSERT, UPDATE or DELETE policy, so those are denied by default.
- Privileges are revoked from `public`, `anon` and `authenticated`, then granted back as **column-level SELECT** on every column except `input_log`. Consequences:
  - clients cannot insert, update, delete or truncate, even if a policy were added by mistake;
  - clients cannot read the input logs (large, and they would give away solutions);
  - clients must list columns in reads. `select=*` is refused; use `select=display_name,steps,created_at`.
- `service_role` (the edge function, key kept in Supabase function secrets) has full access and bypasses RLS.

### How the game reads a board

```
GET {URL}/rest/v1/runs
    ?level_id=eq.w1-03&level_version=eq.1
    &select=display_name,steps,created_at
    &order=steps.asc,created_at.asc,id.asc
    &limit=20&offset=0
headers: apikey: <anon key> (plus Authorization: Bearer <anon key> only when the key is a JWT)
```

## Migration 0002 and `submit-run` (M3-11)

`0002` replaces three `runs` checks: names are 1 to 12 of `A-Z 0-9 space -` (no padding, no doubled spaces), `steps` is at most 36,000 and `input_log` at most 16,000 characters. It also creates `submit_attempts` (hashed IP and time) with RLS on, no policy and all client privileges revoked. A new table in `public` is granted to `anon` and `authenticated` by default on Supabase, so any further table must repeat that revoke and enable RLS.

`submit-run` takes `POST /functions/v1/submit-run` with `{ levelId, levelVersion, steps, name, inputLog }` and answers `{ ok: true, rank, total }` or `{ ok: false, code }` where code is one of:

| Code | When |
|---|---|
| `rate` | 30 calls per minute or 200 per hour from one IP reached (keyed hash; raw addresses are never stored), the database could not be reached, there is no usable `cf-connecting-ip`, or `IP_HASH_SALT` is not set (all 503, fail closed). Rejected attempts count toward the hourly cap too. IPv4-mapped IPv6 is treated as the IPv4 address and other IPv6 is bucketed by /64. |
| `invalid` | wrong shape or extra keys, unknown level (world 0 included), steps outside 1..36,000, a malformed log, or a log shorter than `steps`. Run counts are summed, never expanded. |
| `version` | the level version is not the one the function knows |
| `floor` | fewer steps than 85% of the fastest known (table in `rules.ts`, from `levels/README.md`) |
| `name` | fails the name rule or the normalised blocklist (`DEFAULT_BLOCKLIST` is a placeholder until design-lead supplies the list) |

Deploy (M3-12): `supabase functions deploy submit-run`. No `supabase secrets set` is needed. The level table in `rules.ts` must be updated when a level is added or its version or fastest time changes.

Rate limit and best-per-name (0004): `submit_attempt` counts and records in one call, serialised per IP hash by an advisory lock, and prunes old rows on about 1 call in 50 (2%). `record_run` is one `insert ... on conflict (level_id, level_version, display_name) do update ... where runs.steps > excluded.steps`, so a tie or a slower run changes nothing and two parallel submits cannot leave two rows. Database faults answer 503 `rate`, not `invalid`.

Not done: server-side replay (see below) and keeping only the top N rows per level.

## Unverified times: the owner's decision (B-1)

Today the function never replays `input_log`. It checks shape, the 85% floor and that the log is at least `steps` long, so a hand-made POST such as `{steps: <floor>, inputLog: "36000R"}` takes rank 1. Every run is stored `verified = false` (column exists since 0001; `record_run` takes `p_verified`).

**Option A: server replay.** The function decodes `input_log`, runs the shared `src/core` sim (cap 36,000 steps, a few ms), stores `verified = true` only if the level is won at exactly `steps`, and rejects otherwise.
- Cost: about 1 to 2 days: bundle `src/core` for Deno, a level-text loader inside the function (levels baked in at deploy, kept in step with `levels/`), tests that replay every shipped solution, a deploy check. Every level edit needs a redeploy.
- Risk: sim and function drift (mitigated: same code, arch tests); a Deno bundling problem found only at first deploy; a bug rejects honest runs.

**Option B: public board shows only verified runs.** Flip `PUBLIC_BOARD_VERIFIED_ONLY` in `src/net/client.ts` (default `false`); the board request then adds `verified=eq.true`.
- Cost: minutes, but alone it shows an EMPTY board, because nothing sets `verified` until something replays. It is only useful together with A, or with the owner marking runs by hand (`update runs set verified = true where id = ...`, SQL editor).
- Risk: a forged time is still stored (hidden, not refused), and the rank returned to a submitter counts all rows, forged ones included.

Recommendation: A before the boards go public; B stays as the one-line fallback if A slips (then verify the top rows by hand). Neither is built.

## First real deploy must check (nothing here has run on Supabase or Deno)

1. Run 0001 to 0004 in order, then each `tests/*.sql`; 0004 has never executed (plpgsql, `returns table`, ON CONFLICT with an alias, advisory lock).
2. `supabase functions deploy submit-run`; POST a good run twice and a slower one: rank, total and a single row per name.
3. Fire 40 parallel POSTs from one machine: at most 30 accepted in a minute.
4. **Client IP header (K1).** Only `cf-connecting-ip` is trusted (the function never reads `x-real-ip` or `x-forwarded-for`, which a client can forge). Deploy a throwaway echo function that returns all request headers and call it with forged `x-forwarded-for`, `x-real-ip` and `cf-connecting-ip` values: record which ones the platform overwrites. If `cf-connecting-ip` is missing, every submit is refused (503 `rate`); only then add a measured hop counted from the RIGHT of `x-forwarded-for`, never the first. This blocks turning submissions on, not the first deploy.
7. **Secret:** `supabase secrets set IP_HASH_SALT=<long random string>` before the first call (without it every submit is refused 503). It is a function secret only: never in `.env`, the repo or a `VITE_` variable; rotating it resets the rate-limit buckets.
5. `rpc` returns `board_rank` and `board_total` as bigint strings or numbers; `parseRecordResult` accepts both.
6. Anon cannot call `/rest/v1/rpc/submit_attempt` or `record_run` (expect 401 or 403).

## Release build for itch.io

```
npm run package
```

Builds a production bundle into a temporary folder (never `dist/`), checks it, and writes `release/redshift-<version>.zip` plus a `.sha256` file. `index.html` is at the zip root, asset paths are relative, and there are no source maps, `.env` files or QA hook. The script refuses to package if `VITE_QA_HOOK` or any other `VITE_` variable besides the two Supabase ones is set, if the anon key looks like a service-role key, or if the bundle contains `__redshift` or a secret-looking string. Options: `-- --out <file.zip>`, `-- --build-dir <empty folder>`.

Vite bakes `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env` into the bundle. Package with `.env` filled in for the real release; without it the zip is an offline build (the script says which one it made). The zip is reproducible: the same source gives the same checksum.

Uploading to itch.io with butler comes later (M4-08): it needs your itch.io API key stored as a GitHub secret, which the backend-engineer will ask for then.
