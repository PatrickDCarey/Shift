-- Redshift leaderboards, migration 0004: atomic rate limit and best-per-name upsert (B-2, B-3, B-5, B-7).
-- Owner: backend-engineer. Safe to run more than once. Run after 0003. Not yet run on a real database.
--
--   * runs: unique (level_id, level_version, display_name): one row per name per level version. Any
--     duplicates (there should be none) are collapsed to the best first. The unique index also serves
--     the "my best" lookup (B-7).
--   * submit_attempt(): counts and records an attempt for one IP hash in ONE call, serialised per
--     hash with a transaction advisory lock, so a parallel burst cannot pass the limit. Prunes old
--     rows only when asked (about 1 call in 50), not on every call. Limits are passed in, so they
--     stay in rules.ts (RATE_LIMIT_PER_MINUTE, RATE_LIMIT_PER_HOUR).
--   * record_run(): insert, or update only when the new time is strictly lower, in one statement;
--     returns whether it stored, and the rank and size of the board. Ties keep the older run.
--   * Both functions are service-role only (execute revoked from everyone else).

begin;

delete from public.runs r
using public.runs better
where r.level_id = better.level_id
  and r.level_version = better.level_version
  and r.display_name = better.display_name
  and (r.steps, r.created_at, r.id) > (better.steps, better.created_at, better.id);

create unique index if not exists runs_best_per_name_idx
  on public.runs (level_id, level_version, display_name);

create or replace function public.submit_attempt(
  p_ip_hash text,
  p_per_minute integer,
  p_per_hour integer,
  p_prune boolean
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_minute integer;
  v_hour integer;
begin
  if p_ip_hash is null or char_length(p_ip_hash) <> 64 then
    raise exception 'bad ip hash';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));
  if p_prune then
    delete from public.submit_attempts where created_at < now() - interval '1 hour';
  end if;
  select count(*) filter (where created_at >= now() - interval '1 minute'), count(*)
    into v_minute, v_hour
    from public.submit_attempts
   where ip_hash = p_ip_hash and created_at >= now() - interval '1 hour';
  if v_minute >= p_per_minute or v_hour >= p_per_hour then
    return 'limited';
  end if;
  insert into public.submit_attempts (ip_hash) values (p_ip_hash);
  return 'ok';
end;
$$;

create or replace function public.record_run(
  p_level_id text,
  p_level_version integer,
  p_name text,
  p_steps integer,
  p_input_log text,
  p_verified boolean
) returns table (was_stored boolean, board_rank bigint, board_total bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows integer;
begin
  insert into public.runs as r (level_id, level_version, display_name, steps, input_log, verified)
  values (p_level_id, p_level_version, p_name, p_steps, p_input_log, coalesce(p_verified, false))
  on conflict (level_id, level_version, display_name) do update
    set steps = excluded.steps,
        input_log = excluded.input_log,
        verified = excluded.verified,
        created_at = now()
    where r.steps > excluded.steps;
  get diagnostics v_rows = row_count;
  return query
    select v_rows > 0,
           (select count(*) from public.runs x
             where x.level_id = p_level_id and x.level_version = p_level_version and x.steps < p_steps) + 1,
           (select count(*) from public.runs x
             where x.level_id = p_level_id and x.level_version = p_level_version);
end;
$$;

revoke all on function public.submit_attempt(text, integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.record_run(text, integer, text, integer, text, boolean) from public, anon, authenticated;
grant execute on function public.submit_attempt(text, integer, integer, boolean) to service_role;
grant execute on function public.record_run(text, integer, text, integer, text, boolean) to service_role;

commit;
