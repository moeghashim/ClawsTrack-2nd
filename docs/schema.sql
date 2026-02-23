-- Phase 1 draft schema (PostgreSQL)

create extension if not exists pgcrypto;

create table if not exists repositories (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  owner text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists repository_snapshots (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references repositories(id) on delete cascade,
  captured_at timestamptz not null default now(),
  default_branch text,
  stars int,
  forks int,
  open_issues int,
  latest_release_tag text,
  raw_payload_ref text
);

create table if not exists release_events (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references repositories(id) on delete cascade,
  version text,
  published_at timestamptz,
  title text,
  notes_ref text,
  source_url text,
  is_security_relevant boolean not null default false
);

create table if not exists change_analyses (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references repositories(id) on delete cascade,
  snapshot_id uuid references repository_snapshots(id) on delete set null,
  release_event_id uuid references release_events(id) on delete set null,
  change_type text not null,
  summary text not null,
  impact_level text not null,
  confidence numeric(4,3) not null,
  rationale text not null,
  model text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create table if not exists comparison_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  criteria_weights jsonb not null,
  repositories jsonb not null,
  results jsonb not null,
  created_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  repository_id uuid references repositories(id) on delete cascade,
  criteria jsonb not null default '{}'::jsonb,
  min_severity text,
  channel text not null default 'email',
  is_active boolean not null default true
);

create table if not exists notification_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'queued',
  sent_at timestamptz,
  error text
);
