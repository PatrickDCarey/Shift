-- Redshift leaderboards, migration 0002: tighter limits on `runs` and the rate-limit table.
-- Owner: backend-engineer. Safe to run more than once. Run after 0001.
--
--   * runs: name allow-list (A-Z 0-9 space -, 1 to 12, no edge or doubled spaces; mirrors
--     backend/functions/submit-run/rules.ts), steps <= 36000 and input_log <= 16000 characters
--     (MAX_RUN_STEPS and MAX_LOG_CHARS there).
--   * submit_attempts: one row per call to submit-run, keyed by a hash of the caller's IP, used
--     for the per-minute rate limit. Service role only: RLS on with no policy, and every client
--     privilege revoked (Supabase grants new public tables to anon and authenticated by default).

begin;

alter table public.runs drop constraint if exists runs_display_name_shape;
alter table public.runs add constraint runs_display_name_shape check (
  char_length(display_name) between 1 and 12
  and display_name ~ '^[A-Z0-9-]+( [A-Z0-9-]+)*$'
);

alter table public.runs drop constraint if exists runs_steps_range;
alter table public.runs add constraint runs_steps_range check (steps between 1 and 36000);

alter table public.runs drop constraint if exists runs_input_log_shape;
alter table public.runs add constraint runs_input_log_shape check (
  char_length(input_log) between 1 and 16000
  and input_log ~ '^[0-9LRJ.+![:space:]-]+$'
);

create table if not exists public.submit_attempts (
  id         bigint      generated always as identity primary key,
  ip_hash    text        not null check (char_length(ip_hash) = 64),
  created_at timestamptz not null default now()
);

create index if not exists submit_attempts_recent_idx on public.submit_attempts (ip_hash, created_at);

alter table public.submit_attempts enable row level security;
revoke all on table public.submit_attempts from public, anon, authenticated;
grant all on table public.submit_attempts to service_role;

commit;
