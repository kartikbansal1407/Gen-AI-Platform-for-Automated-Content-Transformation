create table if not exists transformation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  source_summary text not null default '',
  source_bundle jsonb not null default '{}',
  controls jsonb not null default '{}',
  status text not null default 'done',
  created_at timestamptz not null default now()
);

create table if not exists artefacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references transformation_jobs(id) on delete cascade,
  output_type text not null check (output_type in ('Video','LinkedIn','Twitter','Advisory','Infographic','ExecutiveSummary','Presentation')),
  title text not null,
  body text not null,
  metadata jsonb not null default '{}',
  confidence integer not null default 0,
  warnings text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists source_documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references transformation_jobs(id) on delete cascade,
  filename text not null,
  mime text not null,
  size integer not null default 0,
  parsed_text text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_jobs_created on transformation_jobs(created_at desc);
create index if not exists idx_artefacts_job on artefacts(job_id);
