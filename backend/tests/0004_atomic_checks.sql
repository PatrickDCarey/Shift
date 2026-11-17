-- Checks for migration 0004 (backend/migrations/0004_atomic_submit.sql). Paste into the Supabase
-- SQL editor after the migration. Everything is rolled back; a failure raises "FAIL: ...".
-- This is the only place the SQL functions are exercised: nothing has run them yet.

begin;

do $$
declare
  h text := repeat('a', 64);
  r record;
begin
  -- rate limit: the third call under a limit of 2 per minute is refused, and is not recorded
  if public.submit_attempt(h, 2, 100, false) <> 'ok' then raise exception 'FAIL: first attempt refused'; end if;
  if public.submit_attempt(h, 2, 100, false) <> 'ok' then raise exception 'FAIL: second attempt refused'; end if;
  if public.submit_attempt(h, 2, 100, false) <> 'limited' then raise exception 'FAIL: third attempt not limited'; end if;
  if (select count(*) from public.submit_attempts where ip_hash = h) <> 2 then raise exception 'FAIL: a limited attempt was recorded'; end if;
  if public.submit_attempt(repeat('b', 64), 2, 100, false) <> 'ok' then raise exception 'FAIL: another IP shares the bucket'; end if;

  -- best per name: first insert stores, slower and tied runs do not, faster replaces
  select * into r from public.record_run('w1-01', 2, 'ACE', 400, '400R', false);
  if not r.was_stored or r.board_rank <> 1 or r.board_total <> 1 then raise exception 'FAIL: first run'; end if;
  select * into r from public.record_run('w1-01', 2, 'ACE', 401, '401R', false);
  if r.was_stored then raise exception 'FAIL: slower run stored'; end if;
  select * into r from public.record_run('w1-01', 2, 'ACE', 400, '400R', false);
  if r.was_stored then raise exception 'FAIL: tied run stored'; end if;
  select * into r from public.record_run('w1-01', 2, 'ACE', 399, '399R', false);
  if not r.was_stored or (select count(*) from public.runs where display_name = 'ACE') <> 1 then raise exception 'FAIL: faster run did not replace'; end if;
  select * into r from public.record_run('w1-01', 2, 'BOB', 450, '450R', false);
  if r.board_rank <> 2 or r.board_total <> 2 then raise exception 'FAIL: rank or total'; end if;

  -- the unique key rejects a direct duplicate
  begin
    insert into public.runs (level_id, level_version, display_name, steps, input_log) values ('w1-01', 2, 'ACE', 500, '500R');
    raise exception 'FAIL: duplicate name accepted';
  exception when unique_violation then null;
  end;

  -- clients cannot call either function
  if has_function_privilege('anon', 'public.submit_attempt(text,integer,integer,boolean)', 'execute')
     or has_function_privilege('authenticated', 'public.record_run(text,integer,text,integer,text,boolean)', 'execute')
     or has_function_privilege('anon', 'public.record_run(text,integer,text,integer,text,boolean)', 'execute') then
    raise exception 'FAIL: a client role can execute a function';
  end if;
end $$;

select 'ok: all checks for 0004_atomic_submit passed (changes rolled back)' as result;
rollback;
