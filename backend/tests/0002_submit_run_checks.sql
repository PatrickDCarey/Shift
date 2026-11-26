-- Checks for migration 0002 (backend/migrations/0002_submit_run.sql). Paste into the Supabase
-- SQL editor after 0001, 0001's test and 0002. Everything is rolled back; a failure raises "FAIL: ...".

begin;

-- submit_attempts is closed to clients: RLS on, no policy, no privileges.
do $$
begin
  if not exists (select 1 from pg_class where oid = 'public.submit_attempts'::regclass and relrowsecurity) then
    raise exception 'FAIL: RLS is off on submit_attempts';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'submit_attempts') then
    raise exception 'FAIL: submit_attempts has a policy';
  end if;
  if has_table_privilege('anon', 'public.submit_attempts', 'select')
     or has_table_privilege('authenticated', 'public.submit_attempts', 'select')
     or has_table_privilege('anon', 'public.submit_attempts', 'insert') then
    raise exception 'FAIL: a client role has a privilege on submit_attempts';
  end if;
end $$;

-- The name allow-list and limits reject what the old pattern let through.
do $$
declare
  bad record;
  rejected boolean;
begin
  for bad in
    select * from (values
      ('lower case',      'ace',                    10, '10R'),
      ('zero-width space', 'AC' || chr(8203) || 'E',   10, '10R'),
      ('bidi override',   'AC' || chr(8238) || 'E',    10, '10R'),
      ('nbsp',            'AC' || chr(160) || 'E',    10, '10R'),
      ('line separator',  'AC' || chr(8232) || 'E',    10, '10R'),
      ('combining mark',  'A' || chr(769),            10, '10R'),
      ('double space',    'A  B',                   10, '10R'),
      ('leading space',   ' AB',                    10, '10R'),
      ('13 characters',   'ABCDEFGHIJKLM',          10, '10R'),
      ('36001 steps',     'ACE',                    36001, '10R'),
      ('log too long',    'ACE',                    10, repeat('1R ', 10700))
    ) as t(label, dname, st, lg)
  loop
    rejected := false;
    begin
      insert into public.runs (level_id, level_version, display_name, steps, input_log)
      values ('w1-01', 1, bad.dname, bad.st, bad.lg);
    exception when check_violation then rejected := true; end;
    if not rejected then raise exception 'FAIL: a row with % was accepted', bad.label; end if;
  end loop;

  insert into public.runs (level_id, level_version, display_name, steps, input_log)
  values ('w1-01', 1, 'ACE-1 B2', 400, '20. 380R');
end $$;

rollback;

select 'ok: all checks for 0002_submit_run passed (changes rolled back)' as result;
