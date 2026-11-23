-- Redshift leaderboards, migration 0005: longer input logs for long levels with checkpoints.
-- Owner: backend-engineer. Safe to run more than once. Run after 0004.
--
-- A run on a long level is every frame since load, deaths included, so the log can be longer
-- than 16,000 characters. Raises the input_log length check to 32,000 (MAX_LOG_CHARS in
-- backend/functions/submit-run/rules.ts). The character set check and the steps range
-- (36,000) are unchanged.

begin;

alter table public.runs drop constraint if exists runs_input_log_shape;
alter table public.runs add constraint runs_input_log_shape check (
  char_length(input_log) between 1 and 32000
  and input_log ~ '^[0-9LRJ.+![:space:]-]+$'
);

commit;
