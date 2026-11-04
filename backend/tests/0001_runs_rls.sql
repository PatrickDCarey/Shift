-- Checks for migration 0001 (backend/migrations/0001_runs.sql).
-- Paste into the Supabase SQL editor and run once after the migration.
-- Everything happens inside one transaction that is rolled back, so no data is
-- left behind. If every check passes the last result row says so; if one fails
-- the editor shows an error starting with "FAIL:" and nothing is changed.

begin;

-- 1. Structure: RLS is on and forced, and the only policy is a SELECT policy.
do $$
begin
  if not exists (
    select 1 from pg_class c
    where c.oid = 'public.runs'::regclass and c.relrowsecurity and c.relforcerowsecurity
  ) then
    raise exception 'FAIL: row level security is not enabled and forced on public.runs';
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'runs' and cmd <> 'SELECT'
  ) then
    raise exception 'FAIL: public.runs has a non-SELECT policy';
  end if;
end $$;

-- 2. The service role (what the edge function uses) can insert.
set local role service_role;
insert into public.runs (level_id, level_version, display_name, steps, input_log)
values ('w0-02', 1, 'rls-test', 775, '226R 90L 1+ 1. 1+ 102R 1RJ');
reset role;

-- 3. The service role cannot break the table constraints.
do $$
declare
  bad record;
  rejected boolean;
begin
  set local role service_role;
  for bad in
    select * from (values
      ('level id',    'level-1', 1, 'ok',            10, '10R'),
      ('version',     'w0-02',   0, 'ok',            10, '10R'),
      ('empty name',  'w0-02',   1, '',              10, '10R'),
      ('padded name', 'w0-02',   1, ' padded ',      10, '10R'),
      ('long name',   'w0-02',   1, repeat('a', 25), 10, '10R'),
      ('control name','w0-02',   1, E'bad\nname',    10, '10R'),
      ('zero steps',  'w0-02',   1, 'ok',            0,  '10R'),
      ('huge steps',  'w0-02',   1, 'ok',            1000001, '10R'),
      ('empty log',   'w0-02',   1, 'ok',            10, ''),
      ('log chars',   'w0-02',   1, 'ok',            10, '10R; drop table runs')
    ) as t(label, lid, lver, dname, st, lg)
  loop
    rejected := false;
    begin
      insert into public.runs (level_id, level_version, display_name, steps, input_log)
      values (bad.lid, bad.lver, bad.dname, bad.st, bad.lg);
    exception when check_violation then
      rejected := true;
    end;
    if not rejected then
      raise exception 'FAIL: a row with a bad % was accepted', bad.label;
    end if;
  end loop;
  reset role;
end $$;

-- 4. Anonymous clients (the game, using the anon key) can read public columns...
set local role anon;
do $$
declare n integer;
begin
  select count(*) into n from public.runs
  where level_id = 'w0-02' and display_name = 'rls-test';
  if n <> 1 then
    raise exception 'FAIL: anon cannot read the public columns (saw % rows, expected 1)', n;
  end if;
end $$;

-- 5. ...but not the input log, and cannot write in any way.
do $$
declare
  denied boolean;
begin
  denied := false;
  begin
    perform input_log from public.runs;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL: anon can read input_log'; end if;

  denied := false;
  begin
    insert into public.runs (level_id, level_version, display_name, steps, input_log)
    values ('w0-02', 1, 'cheater', 1, '1R');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL: anon can insert'; end if;

  denied := false;
  begin
    update public.runs set steps = 1;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL: anon can update'; end if;

  denied := false;
  begin
    delete from public.runs;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL: anon can delete'; end if;

  denied := false;
  begin
    truncate public.runs;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL: anon can truncate'; end if;
end $$;
reset role;

-- 6. The same for a signed-in user (no sign-in is offered, but the role exists).
set local role authenticated;
do $$
declare
  denied boolean;
begin
  denied := false;
  begin
    insert into public.runs (level_id, level_version, display_name, steps, input_log)
    values ('w0-02', 1, 'cheater', 1, '1R');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL: authenticated can insert'; end if;

  denied := false;
  begin
    update public.runs set steps = 1;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL: authenticated can update'; end if;

  denied := false;
  begin
    delete from public.runs;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL: authenticated can delete'; end if;
end $$;
reset role;

rollback;

select 'ok: all checks for 0001_runs passed (changes rolled back)' as result;
