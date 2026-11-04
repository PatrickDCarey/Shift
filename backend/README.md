# Redshift backend (Supabase leaderboards)

Optional. The game plays fully offline; leaderboards switch on only when the two client values below are present at build time. Owner: backend-engineer.

## What is here

| Path | What it is |
|---|---|
| `migrations/0001_runs.sql` | The `runs` table, indexes and access rules. Safe to run twice. |
| `tests/0001_runs_rls.sql` | Checks that clients can read but never write. Run it right after the migration. |
| `functions/submit-run/` | Not written yet (task M3-11): the only way to add a run. |

## Set up the Supabase project (owner steps, USER-2, due Nov 14)

You need a free Supabase account. You do not give any key to an agent or to the repo.

1. Go to https://supabase.com/dashboard, sign in, and choose **New project**.
2. Name it `redshift`. Pick the region closest to most players. Generate a database password and store it in your password manager (nothing in this project needs it; do not paste it anywhere). Create the project and wait until it is ready.
3. **Run the migration.** Left menu, **SQL Editor**, **New query**. Open `backend/migrations/0001_runs.sql` from this repo, copy the whole file, paste it, press **Run**. Expect "Success. No rows returned".
4. **Check the rules.** New query again, paste all of `backend/tests/0001_runs_rls.sql`, press **Run**. Expect one row: `ok: all checks for 0001_runs passed (changes rolled back)`. If you see an error starting with `FAIL:`, stop and send the message to the backend-engineer. The test leaves no data behind.
5. **Copy the two public client values.** **Project Settings**, **API** (or **API Keys**). You need:
   - the **Project URL**, like `https://abcdefghij.supabase.co`
   - the **anon / publishable** key. Newer projects call it the *publishable* key (starts `sb_publishable_`); older ones call it *anon public* (a long `eyJ...` string). Either works.

   Do **not** copy the `service_role` or *secret* key anywhere in this repo, in `.env`, or into chat. It is only ever pasted into Supabase's own function secrets later (M3-12), and the backend-engineer will tell you exactly when.
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
   $h = @{ apikey = $key; Authorization = "Bearer $key" }

   # Reading works and returns an empty list: []
   Invoke-RestMethod "$url/rest/v1/runs?select=id,level_id,steps&limit=5" -Headers $h

   # Writing must be refused: expect an error with status 401 or 403 (code 42501)
   $body = '{"level_id":"w0-02","level_version":1,"display_name":"cheater","steps":1,"input_log":"1R"}'
   try {
     Invoke-RestMethod "$url/rest/v1/runs" -Method Post -Headers $h -ContentType "application/json" -Body $body
     "BAD: the insert was accepted, tell the backend-engineer"
   } catch { "good, insert refused: $($_.Exception.Response.StatusCode.value__)" }
   ```
8. Free-tier note: Supabase pauses free projects after about a week with no activity. Open the dashboard and restore the project if it says paused, and do so again a day or two before submitting (Nov 30).

You do not need to configure Authentication, Storage or Realtime. No one signs in; the game only ever uses the anon key.

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

- Row level security is **enabled and forced**. The only policy is `runs_public_read` (SELECT for `anon` and `authenticated`, all rows). There is no INSERT, UPDATE or DELETE policy, so those are denied by default.
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
headers: apikey: <anon key>, Authorization: Bearer <anon key>
```

## Not in 0001 (planned)

- Per-level floor times, name and profanity checks, and the per-IP rate limit: all in the `submit-run` edge function and a small service-only table in `0002` (M3-11).
- Server-side replay: set `verified` after re-running `input_log` (stretch, v2).

## Release build for itch.io

```
npm run package
```

Builds a production bundle into a temporary folder (never `dist/`), checks it, and writes `release/redshift-<version>.zip` plus a `.sha256` file. `index.html` is at the zip root, asset paths are relative, and there are no source maps, `.env` files or QA hook. The script refuses to package if `VITE_QA_HOOK` or any other `VITE_` variable besides the two Supabase ones is set, if the anon key looks like a service-role key, or if the bundle contains `__redshift` or a secret-looking string. Options: `-- --out <file.zip>`, `-- --build-dir <empty folder>`.

Vite bakes `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env` into the bundle. Package with `.env` filled in for the real release; without it the zip is an offline build (the script says which one it made). The zip is reproducible: the same source gives the same checksum.

Uploading to itch.io with butler comes later (M4-08): it needs your itch.io API key stored as a GitHub secret, which the backend-engineer will ask for then.
