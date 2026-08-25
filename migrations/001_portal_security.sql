begin;

create table if not exists portal_operation_snapshots (
  tenant_id text primary key,
  version bigint not null default 1,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text not null
);

create table if not exists portal_audit_log (
  id bigint generated always as identity primary key,
  tenant_id text not null,
  actor_user_id text not null,
  actor_login text not null,
  actor_role text not null check (actor_role in ('viewer', 'editor', 'admin')),
  action text not null,
  entity_type text not null,
  entity_id text,
  correlation_id text not null,
  client_mutation_id text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = current_schema() and table_name = 'portal_audit_log' and column_name = 'actor_email'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = current_schema() and table_name = 'portal_audit_log' and column_name = 'actor_login'
  ) then
    alter table portal_audit_log rename column actor_email to actor_login;
  end if;
end $$;

create unique index if not exists portal_audit_log_mutation_unique
  on portal_audit_log (tenant_id, client_mutation_id)
  where client_mutation_id is not null;
create index if not exists portal_audit_log_tenant_created_idx
  on portal_audit_log (tenant_id, created_at desc);

create table if not exists portal_external_identities (
  tenant_id text not null,
  entity_type text not null,
  entity_id text not null,
  source_system text not null,
  external_id text not null,
  external_company_id text,
  last_synced_at timestamptz,
  sync_cursor text,
  checksum text,
  primary key (tenant_id, source_system, external_id),
  unique (tenant_id, entity_type, entity_id, source_system, external_company_id)
);

create table if not exists portal_rate_limit_buckets (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  window_seconds integer not null,
  request_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash, window_started_at, window_seconds)
);
create index if not exists portal_rate_limit_cleanup_idx on portal_rate_limit_buckets (updated_at);

alter table portal_operation_snapshots enable row level security;
alter table portal_operation_snapshots force row level security;
alter table portal_audit_log enable row level security;
alter table portal_audit_log force row level security;
alter table portal_external_identities enable row level security;
alter table portal_external_identities force row level security;

drop policy if exists portal_snapshot_tenant_policy on portal_operation_snapshots;
create policy portal_snapshot_tenant_policy on portal_operation_snapshots
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));

drop policy if exists portal_audit_tenant_policy on portal_audit_log;
create policy portal_audit_tenant_policy on portal_audit_log
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));

drop policy if exists portal_external_identity_tenant_policy on portal_external_identities;
create policy portal_external_identity_tenant_policy on portal_external_identities
  using (tenant_id = current_setting('app.tenant_id', true))
  with check (tenant_id = current_setting('app.tenant_id', true));

commit;
