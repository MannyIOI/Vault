-- =============================================================================
-- Incremental migration — 2026-04-19
-- Apply this to an EXISTING database. It is idempotent and PRESERVES all
-- existing rows; it only adjusts schema and policies that changed in this
-- iteration. Safe to re-run.
--
-- Run from the Supabase SQL editor (or `supabase db push`).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. inventory.warehouse_id is now optional (assets can sit unassigned).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'inventory'
       and column_name  = 'warehouse_id'
       and is_nullable  = 'NO'
  ) then
    alter table public.inventory
      alter column warehouse_id drop not null;
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2. Loans table (skip if it already exists; preserves data).
-- ---------------------------------------------------------------------------
create table if not exists public.loans (
  id              text primary key,
  organization_id text not null references public.organizations (id) on delete cascade,
  type            text not null check (type in ('GIVEN','RECEIVED')),
  counterparty    text not null,
  amount          numeric not null check (amount >= 0),
  bank_account_id text references public.bank_accounts (id) on delete set null,
  status          text not null default 'OUTSTANDING' check (status in ('OUTSTANDING','SETTLED')),
  date            timestamptz not null default now(),
  due_date        timestamptz,
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists loans_org_idx  on public.loans (organization_id);
create index if not exists loans_bank_idx on public.loans (bank_account_id);
alter table public.loans enable row level security;

drop policy if exists loan_read   on public.loans;
drop policy if exists loan_insert on public.loans;
drop policy if exists loan_update on public.loans;
drop policy if exists loan_delete on public.loans;

create policy loan_read on public.loans for select
  using (organization_id = public.current_org());

create policy loan_insert on public.loans for insert
  with check (
    (public.is_admin() or public.is_clerk())
    and organization_id = public.current_org()
  );

create policy loan_update on public.loans for update
  using (
    (public.is_admin() or public.is_clerk())
    and organization_id = public.current_org()
  );

create policy loan_delete on public.loans for delete
  using (public.is_admin() and organization_id = public.current_org());

-- ---------------------------------------------------------------------------
-- 3. bank_accounts — clerks can manage ONLY their own EMPLOYEE account.
--    (Admins keep full control via existing ba_admin_all policy.)
-- ---------------------------------------------------------------------------
drop policy if exists ba_clerk_insert on public.bank_accounts;
drop policy if exists ba_clerk_update on public.bank_accounts;
drop policy if exists ba_clerk_delete on public.bank_accounts;

create policy ba_clerk_insert on public.bank_accounts for insert
  with check (
    public.is_clerk()
    and organization_id = public.current_org()
    and type    = 'EMPLOYEE'
    and owner_id = auth.uid()
  );

create policy ba_clerk_update on public.bank_accounts for update
  using (
    public.is_clerk()
    and organization_id = public.current_org()
    and type    = 'EMPLOYEE'
    and owner_id = auth.uid()
  );

create policy ba_clerk_delete on public.bank_accounts for delete
  using (
    public.is_clerk()
    and organization_id = public.current_org()
    and type    = 'EMPLOYEE'
    and owner_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 4. bank_transactions — clerks can insert rows that reference an account
--    inside their org (admins covered by btx_admin_all).
-- ---------------------------------------------------------------------------
drop policy if exists btx_clerk_insert on public.bank_transactions;

create policy btx_clerk_insert on public.bank_transactions for insert
  with check (
    public.is_admin()
    or (
      public.is_clerk()
      and exists (
        select 1
          from public.bank_accounts ba
         where ba.id = bank_account_id
           and ba.organization_id = public.current_org()
      )
    )
  );

commit;
