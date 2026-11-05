# Security review: backend schema, RLS test, packaging, save parsing (2026-11-04)

Reviewer: security-reviewer agent (read-only), run by the orchestrator for M1-34. Nothing was edited and the SQL has never been executed (no Postgres available). Input for tech-lead's M1-34 verdict; tech-lead files the follow-ups.

No CRITICAL findings. Tracked files and git history show no secrets (`git ls-files`, history search for JWT-shaped strings and `sb_secret_`; only `.env.example` is tracked). `src/net` was an empty stub and `backend/functions/` does not exist yet, so the edge function was reviewed as design only.

## HIGH

1. **`backend/README.md:25`, `0001_runs.sql:14`: service-role key paste step.** The plan has the owner paste the service-role key into function secrets (M3-12). Supabase is believed to inject `SUPABASE_SERVICE_ROLE_KEY` into edge functions automatically, and `supabase secrets set` is believed to reject `SUPABASE_*` names (not verified against current docs). Fix: read `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` in the function, drop the paste step, add "if a secret key leaks, rotate it in Project Settings > API".
2. **Key guards only in `scripts/package.mjs`.** `npm run build`, `npm run dev` and CI have none; README steps 5–6 have the owner paste keys into `.env`, so a pasted secret goes straight into `dist/` and `npm run preview`. Fix: move `checkEnvironment` into a Vite plugin in `vite.config.ts` that runs on every build and dev start.
3. **Before the repo goes public:** run `gitleaks detect` or `trufflehog git` over the full history (the review only searched two patterns).

## MEDIUM

4. **`scripts/package.mjs:28-33`: a service-role JWT is not caught** (`service_role` is base64 inside the token). Fix: scan for `eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+`, decode the payload, fail unless the role is `anon`; for the env key, allow only `sb_publishable_` or a JWT with `role=anon` (allow-list instead of the deny-list at line 92).
5. **`scripts/package.mjs:25,114`: only known text extensions are scanned**, so a `.glsl/.frag/.vert` or other text asset skips the secret and hook checks. Fix: scan every file or skip only known binary types; add `*.pem|*.key|.npmrc` to `FORBIDDEN_NAME`.
6. **`0001_runs.sql:39-43`: display names allow Unicode tricks** (U+200B, U+FEFF, U+202E bidi override, NBSP, U+2028, stacked combining marks; `[[:cntrl:]]` is locale-dependent). Fix: an explicit allow-list such as `^[A-Za-z0-9_.-]+( [A-Za-z0-9_.-]+)*$`, mirrored in the edge function; render names with Phaser `Text` / `textContent`, never `innerHTML`. Needs a design-lead ruling on name rules (M3-02).
7. **`0001_runs.sql:50-53`: loose limits for a free-tier database** (`input_log` 200,000 chars, `steps` 1,000,000). Fix: about 16,000 chars and a per-level step cap; the edge function must bound the sum of run lengths before expanding (`999999999R` is a replay-CPU DoS); replay on submit with a step cap so `steps` is verified, not client-claimed; keep only the top N rows per level.
8. **Planned `0002` (README:94): Supabase default privileges grant ALL on new `public` tables to `anon`/`authenticated`.** A rate-limit table created like 0001 without the revoke and RLS would be open. Fix: non-exposed schema, or repeat revoke + enable RLS; hash and expire IPs; take the IP from `cf-connecting-ip`, not `x-forwarded-for`.
9. **README:53 "no need to configure Auth":** by default the anon key can sign up and mint `authenticated` JWTs. Fix: owner turns off new signups and anonymous sign-ins; check `/graphql/v1` doesn't expose `input_log` (not verified).
10. **`backend/tests/0001_runs_rls.sql` doesn't prove "enforced twice":** every denial comes from the column revoke, so the RLS layer is never exercised (both give 42501). Fix: inside the transaction grant insert/update/delete to anon and assert insert fails 42501 and update/delete affect 0 rows (`get diagnostics`); add `perform * from public.runs` as anon; the same `input_log` denial for `authenticated`; `has_column_privilege` / `has_table_privilege` checks; Unicode and padded-name cases; assert the policy's roles are exactly `{anon,authenticated}`.

## LOW

11. `0001_runs.sql:69`: `FORCE ROW LEVEL SECURITY` has no effect on Supabase's `postgres`/`service_role` (BYPASSRLS); comments overstate it. The real protection is the column revoke.
12. Revoke-then-column-grant ordering is correct; a future table-level `grant select ... to anon` would expose `input_log`, so keep the item-10 checks in a runbook.
13. README:39,89 send `Authorization: Bearer <key>`; a `sb_publishable_` key is not a JWT and may 401 on newer projects (correctness, unverified). Add a smoke test for `?select=input_log` expecting refusal.
14. `.gitignore`: add `*.env`, `supabase/.temp/`, `release/`, `*.pem`.
15. `src/save/schema.ts:104-106`: `bestSteps` is a plain `{}`; ids `constructor`/`toString` are allowed and return functions on lookup. Use `Object.create(null)` or a `Map`, or require the `w[0-5]-NN` format.
16. `src/save/schema.ts:99-104`: no size cap before `JSON.parse`; arrays filtered before slicing. Fix: defaults if `text.length > 65536`; slice before filtering.
17. `scripts/lib/zip.mjs`: `checkName` doesn't reject NUL, `:` or names over 65535 (inputs come from Vite, so low risk); `readZip` has no `maxOutputLength`, so use it on trusted zips only.
18. `.github/workflows/ci.yml`: clean (`contents: read`, no secrets); actions pinned to mutable tags; no `npm audit` step; CI doesn't run `npm run package`.

## Not verified

`set local role` privileges for `postgres` in the Supabase SQL editor; aborted-transaction behaviour after a `FAIL:` in the editor; `[:space:]`/`[:cntrl:]` in the project locale; the PostgREST `select=*` refusal; pg_graphql column exposure; function-secret naming rules; publishable-key `Bearer` behaviour. The package script was read, not run.
