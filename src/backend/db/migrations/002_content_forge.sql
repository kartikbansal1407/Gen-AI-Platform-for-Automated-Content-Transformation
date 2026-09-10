-- Content Forge extension: transformation jobs, artefacts, source documents
-- PDF §5.7 G. Data Model – migration 002 (NTRO SIH 26154)
-- Keep existing 21 Content Forge tables, add job-centric tables for multi-output pipeline

create extension if not exists "pgcrypto";

create table if not exists transformation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  source_summary text not null default '',
  source_bundle jsonb not null default '{}'::jsonb,
  controls jsonb not null default '{}'::jsonb,
  status text not null check (status in ('processing','done','partial','failed')) default 'processing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists artefacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references transformation_jobs(id) on delete cascade,
  output_type text not null check (output_type in ('Video','LinkedIn','Twitter','Advisory','Infographic','ExecutiveSummary','Presentation','video_package','linkedin_post','twitter_post','advisory','infographic','executive_summary','presentation')),
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  confidence integer check (confidence >= 0 and confidence <= 100),
  warnings text[] not null default '{}',
  source_attribution text,
  claim_support jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists source_documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references transformation_jobs(id) on delete cascade,
  filename text not null,
  mime text not null,
  size integer not null check (size >= 0),
  parsed_text text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_transformation_jobs_user_created on transformation_jobs(user_id, created_at desc);
create index if not exists idx_artefacts_job_type on artefacts(job_id, output_type);
create index if not exists idx_source_documents_job on source_documents(job_id);

-- Extend content_items platform check to include Content Forge types if table exists
-- Keep backward compat: do not drop existing check, add new values via separate artefact table
-- If you reuse content_items for artefacts, uncomment:
-- alter table content_items drop constraint if exists content_items_platform_check;
-- alter table content_items add constraint content_items_platform_check check (platform in ('LinkedIn','X','Reddit','Advisory','Infographic','ExecutiveSummary','Video','Presentation'));

-- Audit log for jobs (reuse audit_logs)
-- analytics: ensure transformation_completed event can be stored (no schema change needed, metadata jsonb flexible)
