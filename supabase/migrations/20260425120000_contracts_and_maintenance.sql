-- =============================================================================
-- 2026-04-25 — contracts + inventory.under_maintenance
-- =============================================================================
-- Adds a `contracts` table so users can record one-time / milestone /
-- recurring payment agreements with a contact (typically a vendor), and an
-- `under_maintenance` flag on inventory so staff can mark and filter items
-- that are currently out for repair. Idempotent.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. contracts
-- ---------------------------------------------------------------------------
create table if not exists public.contracts (
    id              text primary key,
    organization_id text not null references public.organizations (id) on delete cascade,
    code            text,
    name            text not null,
    contact_id      text references public.contacts (id) on delete restrict,
    client_party    text,
    vendor_party    text,
    amount          numeric not null default 0,
    currency        text not null default 'ETB',
    term            text not null default 'ONE_TIME'
                        check (term in ('ONE_TIME','MILESTONES','RECURRING')),
    recurrence      jsonb,
    start_date      timestamptz,
    end_date        timestamptz,
    status          text not null default 'APPROVED'
                        check (status in ('PENDING','APPROVED','ACTIVE','COMPLETED','CANCELLED')),
    notes           text,
    created_at      timestamptz not null default now()
);
create index if not exists contracts_org_idx     on public.contracts (organization_id);
create index if not exists contracts_contact_idx on public.contracts (contact_id);

alter table public.contracts enable row level security;

drop policy if exists contract_read   on public.contracts;
drop policy if exists contract_insert on public.contracts;
drop policy if exists contract_update on public.contracts;
drop policy if exists contract_delete on public.contracts;

create policy contract_read on public.contracts for select
using (organization_id = public.current_org());

create policy contract_insert on public.contracts for insert
with check (
    (public.is_admin() or public.is_clerk())
    and organization_id = public.current_org()
);

create policy contract_update on public.contracts for update
using (
    (public.is_admin() or public.is_clerk())
    and organization_id = public.current_org()
);

create policy contract_delete on public.contracts for delete
using (public.is_admin() and organization_id = public.current_org());

-- ---------------------------------------------------------------------------
-- 2. inventory.under_maintenance flag + filter index
-- ---------------------------------------------------------------------------
alter table public.inventory
    add column if not exists under_maintenance boolean not null default false;
create index if not exists inventory_maintenance_idx
    on public.inventory (organization_id)
    where under_maintenance = true;

commit;
