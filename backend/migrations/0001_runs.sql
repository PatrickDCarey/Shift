-- Redshift leaderboards, migration 0001: the `runs` table and its access rules.
-- Owner: backend-engineer. Safe to run more than once (idempotent).
--
-- Model
--   One row per accepted run: which level (and which version of it), a display
--   name, the time as whole simulation steps (60 per second, never wall-clock),
--   and the recorded input log so the server can replay the run later (v2).
--
-- Access
--   * Anyone (anon, authenticated) can READ the public columns. The input log
--     is not readable by clients: it is large, it would hand out solutions, and
--     only the edge function needs it.
--   * Nobody but the service role can INSERT, UPDATE or DELETE. The edge
--     function `submit-run` (M3-11) uses the service-role key from Supabase
--     function secrets; that key never touches the client or the repo.
--   * Enforced twice: row level security has a SELECT policy and no write
--     policies (so writes are denied by default), and table privileges for the
--     client roles are revoked down to column-level SELECT.

begin;

create table if not exists public.runs (
  id            uuid        primary key default gen_random_uuid(),
  level_id      text        not null,
  level_version integer     not null,
  display_name  text        not null,
  steps         integer     not null,
  input_log     text        not null,
  verified      boolean     not null default false,
  created_at    timestamptz not null default now(),

  -- Level ids look like `w1-03` (world 0-5, two-digit index; levels/README.md).
  constraint runs_level_id_format check (level_id ~ '^w[0-5]-[0-9]{2}$'),
  -- The `version` header of the level file (an integer, bumped on every edit).
  -- A new version starts a new board; old rows stay but are no longer queried.
  constraint runs_level_version_positive check (level_version >= 1),
  -- Last line of defence only. The edge function applies the real name rules
  -- (charset, profanity); this blocks control characters, padding and empties.
  constraint runs_display_name_shape check (
    char_length(display_name) between 1 and 24
    and display_name = btrim(display_name)
    and display_name !~ '[[:cntrl:]]'
  ),
  -- Run time in simulation steps (SimState.wonAtStep). The upper bound is
  -- MAX_REPLAY_STEPS in src/core/level/limits.ts. Per-level floor times need
  -- level data and live in the edge function, not here.
  constraint runs_steps_range check (steps between 1 and 1000000),
  -- Run-length input log (docs/tech/level-format.md section 4): tokens such as
  -- `226R`, `1RJ`, `1+`, `36.` separated by whitespace. No header, no comments.
  constraint runs_input_log_shape check (
    char_length(input_log) between 1 and 200000
    and input_log ~ '^[0-9LRJ.+![:space:]-]+$'
  )
);

comment on table  public.runs               is 'Accepted leaderboard runs. Written only by the submit-run edge function (service role).';
comment on column public.runs.level_version is 'Level file version header at submission time; boards are per (level_id, level_version).';
comment on column public.runs.steps         is 'Run time in 60 Hz simulation steps (wonAtStep). Lower is better.';
comment on column public.runs.input_log     is 'Run-length input log of the whole recording, kept for server-side replay. Not readable by clients.';
comment on column public.runs.verified      is 'True once the server has replayed input_log through src/core and reproduced `steps` (v2).';

-- Top-N per level, paginated: filter on level and version, order by steps then
-- age then id so ties are stable across pages.
create index if not exists runs_leaderboard_idx
  on public.runs (level_id, level_version, steps, created_at, id);

-- Row level security: on for everyone, including the table owner.
alter table public.runs enable row level security;
alter table public.runs force row level security;

-- The only policy: read. With no INSERT, UPDATE or DELETE policy, those
-- commands match no rows and fail for any role that is subject to RLS.
drop policy if exists runs_public_read on public.runs;
create policy runs_public_read
  on public.runs
  for select
  to anon, authenticated
  using (true);

-- Table privileges. Supabase grants new tables to anon and authenticated by
-- default; take everything back, then give back only column-level SELECT
-- without input_log. PostgREST callers must therefore list their columns
-- (`select=id,level_id,...`), because `select=*` would include input_log and
-- be refused.
revoke all on table public.runs from public, anon, authenticated;
grant select (id, level_id, level_version, display_name, steps, verified, created_at)
  on public.runs to anon, authenticated;

-- The edge function connects as service_role (it also bypasses RLS).
grant all on table public.runs to service_role;

commit;
