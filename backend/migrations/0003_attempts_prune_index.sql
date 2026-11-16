-- Redshift leaderboards, migration 0003: index for pruning `submit_attempts` by age (B1).
-- Owner: backend-engineer. Safe to run more than once. Run after 0002.
-- submit-run deletes rows older than an hour on every call, which needs created_at alone.

create index if not exists submit_attempts_created_idx on public.submit_attempts (created_at);
