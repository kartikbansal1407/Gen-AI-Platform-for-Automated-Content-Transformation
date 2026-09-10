-- Runtime metadata for replay, per-output overrides, failures, and distributed rate limits.
alter table transformation_jobs add column if not exists runtime jsonb not null default '{}';
create table if not exists request_limits (
  key text primary key,
  count integer not null check (count >= 0),
  expires_at timestamptz not null
);
create index if not exists request_limits_expiry on request_limits(expires_at);

alter table source_documents add column if not exists metadata jsonb not null default '{}';
