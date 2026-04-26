-- =====================================================================
-- SOC 2 — Append-only audit log
--
-- Records every INSERT / UPDATE / DELETE on sensitive tables with the
-- acting user, role, organization, before/after row, and changed fields.
--
-- Properties:
--   * Append-only: UPDATE / DELETE are revoked from every client role.
--     Only the SECURITY DEFINER trigger function (owned by the database
--     superuser/postgres) is allowed to INSERT.
--   * RLS on: only org admins can SELECT their own org's rows.
--   * Org-scoped: every row carries organization_id (when derivable).
--   * Tamper-evident: each row stores a sha256 hash chained to the
--     previous row's hash for the same table, so any silent edit or
--     deletion in the underlying storage is detectable.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- TABLE
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id               bigint generated always as identity primary key,
  occurred_at      timestamptz   not null default now(),
  actor_id         uuid,                              -- auth.uid() at time of change (null for system writes)
  actor_email      text,
  actor_role       text,                              -- snapshot of users.role
  organization_id  text,                              -- snapshot; nullable for cross-org events
  table_name       text          not null,
  record_id        text,                              -- primary key value as text
  action           text          not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data         jsonb,
  new_data         jsonb,
  changed_fields   text[],
  prev_hash        text,
  row_hash         text          not null
);

create index if not exists audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index if not exists audit_log_org_idx         on public.audit_log (organization_id);
create index if not exists audit_log_table_idx       on public.audit_log (table_name, record_id);
create index if not exists audit_log_actor_idx       on public.audit_log (actor_id);

comment on table public.audit_log is
  'SOC 2 append-only audit trail. Direct INSERT/UPDATE/DELETE is revoked from all client roles; rows are written exclusively by public.audit_trigger().';

-- ---------------------------------------------------------------------
-- TRIGGER FUNCTION
-- ---------------------------------------------------------------------
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id   uuid;
  v_actor_row  record;
  v_org        text;
  v_record_id  text;
  v_old        jsonb;
  v_new        jsonb;
  v_changed    text[];
  v_prev_hash  text;
  v_payload    text;
  v_row_hash   text;
begin
  -- Best-effort actor lookup. auth.uid() is null for service_role / SQL
  -- editor calls; that is fine — we still record the event.
  begin
    v_actor_id := auth.uid();
  exception when others then
    v_actor_id := null;
  end;

  if v_actor_id is not null then
    select id, email, role, organization_id
      into v_actor_row
      from public.users
     where id = v_actor_id;
  end if;

  -- Serialize OLD / NEW.
  if TG_OP = 'DELETE' then
    v_old := to_jsonb(OLD);
    v_new := null;
  elsif TG_OP = 'INSERT' then
    v_old := null;
    v_new := to_jsonb(NEW);
  else
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  end if;

  -- Resolve record id (prefer NEW.id, fall back to OLD.id).
  v_record_id := coalesce(v_new->>'id', v_old->>'id');

  -- Resolve organization_id (table-specific).
  if TG_TABLE_NAME = 'organizations' then
    v_org := coalesce(v_new->>'id', v_old->>'id');
  elsif TG_TABLE_NAME = 'bank_transactions' then
    -- bank_transactions has no org column; derive via bank_accounts.
    select organization_id
      into v_org
      from public.bank_accounts
     where id = coalesce(v_new->>'bank_account_id', v_old->>'bank_account_id');
  else
    v_org := coalesce(v_new->>'organization_id', v_old->>'organization_id');
  end if;

  -- Diff for UPDATEs.
  if TG_OP = 'UPDATE' then
    select coalesce(array_agg(key), '{}')
      into v_changed
      from jsonb_each(v_new) n
     where n.value is distinct from (v_old -> n.key);
    -- Skip noise updates that only touch last_updated etc. with no real change.
    if v_changed = '{}'::text[] then
      return null;
    end if;
  end if;

  -- Tamper-evident chain: hash = sha256(prev_hash || canonical payload).
  select row_hash
    into v_prev_hash
    from public.audit_log
   where table_name = TG_TABLE_NAME
   order by id desc
   limit 1;

  v_payload := coalesce(v_prev_hash, '')
            || '|' || TG_TABLE_NAME
            || '|' || coalesce(v_record_id, '')
            || '|' || TG_OP
            || '|' || coalesce(v_actor_id::text, '')
            || '|' || coalesce(v_old::text, '')
            || '|' || coalesce(v_new::text, '');
  v_row_hash := encode(extensions.digest(v_payload, 'sha256'), 'hex');

  insert into public.audit_log (
    actor_id, actor_email, actor_role, organization_id,
    table_name, record_id, action, old_data, new_data, changed_fields,
    prev_hash, row_hash
  ) values (
    v_actor_id, v_actor_row.email, v_actor_row.role, v_org,
    TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new, v_changed,
    v_prev_hash, v_row_hash
  );

  return null;  -- AFTER trigger; return value is ignored.
end;
$$;

comment on function public.audit_trigger() is
  'SOC 2 audit trigger. Writes one row to public.audit_log per INSERT/UPDATE/DELETE on the attached table. Skips no-op UPDATEs.';

-- ---------------------------------------------------------------------
-- ATTACH TRIGGERS
-- Sensitive tables: identity, money, access grants, valuable inventory,
-- contracts, reconciliations.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  audited_tables text[] := array[
    'organizations',
    'users',
    'invites',
    'inventory',
    'transactions',
    'bank_accounts',
    'bank_transactions',
    'reconciliations',
    'contracts'
  ];
begin
  foreach t in array audited_tables loop
    -- Only attach if the table actually exists (contracts is in a later migration too).
    if exists (
      select 1 from information_schema.tables
       where table_schema = 'public' and table_name = t
    ) then
      execute format('drop trigger if exists trg_audit_%I on public.%I', t, t);
      execute format(
        'create trigger trg_audit_%I after insert or update or delete on public.%I
           for each row execute function public.audit_trigger()',
        t, t
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY — read-only for org admins
-- ---------------------------------------------------------------------
alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;   -- applies even to table owner

drop policy if exists audit_log_admin_read on public.audit_log;
create policy audit_log_admin_read on public.audit_log
  for select
  using (
    public.is_admin()
    and organization_id is not distinct from public.current_org()
  );

-- No INSERT/UPDATE/DELETE policies => no client can write or mutate rows.
-- The SECURITY DEFINER trigger function bypasses RLS for inserts.

-- ---------------------------------------------------------------------
-- HARD APPEND-ONLY GRANTS
-- Revoke every mutation grant from every client role.
-- ---------------------------------------------------------------------
revoke all on public.audit_log from public, anon, authenticated, service_role;
grant select on public.audit_log to authenticated, service_role;

-- ---------------------------------------------------------------------
-- VERIFICATION HELPER — recomputes the hash chain and returns the first
-- row (if any) where the chain is broken. Returns no rows when intact.
-- Run periodically (cron) and alert if it returns anything.
-- ---------------------------------------------------------------------
create or replace function public.audit_log_verify()
returns table (
  id           bigint,
  table_name   text,
  expected     text,
  actual       text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with chained as (
    select
      a.id,
      a.table_name,
      a.row_hash as actual,
      encode(
        extensions.digest(
          coalesce(
            lag(a.row_hash) over (partition by a.table_name order by a.id),
            ''
          )
          || '|' || a.table_name
          || '|' || coalesce(a.record_id, '')
          || '|' || a.action
          || '|' || coalesce(a.actor_id::text, '')
          || '|' || coalesce(a.old_data::text, '')
          || '|' || coalesce(a.new_data::text, ''),
          'sha256'
        ),
        'hex'
      ) as expected
    from public.audit_log a
  )
  select id, table_name, expected, actual
    from chained
   where expected <> actual
   order by id
   limit 1;
$$;

comment on function public.audit_log_verify() is
  'Returns the first audit_log row whose sha256 chain hash does not match a recomputation. Empty result = chain intact.';

revoke all on function public.audit_log_verify() from public, anon, authenticated;
grant execute on function public.audit_log_verify() to authenticated;
