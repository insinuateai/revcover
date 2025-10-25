-- === Revcover Core (idempotent) ===
create extension if not exists "uuid-ossp";

-- orgs (minimal)
create table if not exists orgs (
  id text primary key,
  name text,
  created_at timestamptz default now()
);

-- runs: one per failed invoice (idempotent on invoice_id)
create table if not exists runs (
  id uuid primary key default uuid_generate_v4(),
  org_id text not null references orgs(id) on delete cascade,
  customer_id text,
  invoice_id text unique,              -- idempotency key
  input jsonb default '{}'::jsonb,
  status text default 'started',
  created_at timestamptz default now()
);

-- receipts: actions taken during a run (emails, sms, etc.)
create table if not exists receipts (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null references runs(id) on delete cascade,
  kind text not null,                  -- e.g., "email", "sms", "stripe"
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- DLQ for webhooks (best-effort)
create table if not exists dlq_webhooks (
  id uuid primary key default uuid_generate_v4(),
  event_id text,
  payload jsonb,
  reason text,
  created_at timestamptz default now()
);

-- seed demo org (safe upsert)
insert into orgs (id, name)
values ('demo-org', 'Demo Org')
on conflict (id) do update set name = excluded.name;

-- helpful indexes
create index if not exists runs_org_created_idx on runs (org_id, created_at desc);
create index if not exists receipts_run_created_idx on receipts (run_id, created_at desc);
