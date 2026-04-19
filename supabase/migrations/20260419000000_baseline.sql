-- =====================================================================
-- Vault — Supabase schema (Postgres) — multi-tenant
--
-- Top-level tenant:  ORGANIZATIONS
-- All business data (branches, warehouses, inventory, transactions,
-- bank accounts, invites, reconciliations) is scoped to an organization.
--
-- Key relationships introduced in this revision:
--   inventory.warehouse_id        -> warehouses(id)        (real FK)
--   inventory.organization_id     -> organizations(id)
--   warehouses.organization_id    -> organizations(id)
--   branches.organization_id      -> organizations(id)
--   bank_accounts.organization_id -> organizations(id)
--   transactions.organization_id  -> organizations(id)
--   transactions.branch_id        -> branches(id)
--   bank_transactions.transaction_id -> transactions(id)   (every bank
--      movement must reference the originating SALE / PURCHASE /
--      EXPENSE / TRANSFER record in `transactions`)
--   users.organization_id         -> organizations(id)     (membership)
--   invites.organization_id       -> organizations(id)
--
-- Run in the Supabase SQL editor or via `psql`.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- CLEAN SLATE
-- This schema is destructive: it drops and recreates all app tables so
-- the new columns / FKs / RLS policies always apply. Safe while there
-- is no production data. Remove this block once you have data to keep.
-- ---------------------------------------------------------------------
drop table if exists public.bank_transactions cascade;
drop table if exists public.bank_accounts     cascade;
drop table if exists public.reconciliations   cascade;
drop table if exists public.notifications     cascade;
drop table if exists public.invites           cascade;
drop table if exists public.transactions      cascade;
drop table if exists public.inventory         cascade;
drop table if exists public.warehouses        cascade;
drop table if exists public.branches          cascade;
drop table if exists public.users             cascade;
drop table if exists public.organizations     cascade;

drop function if exists public.handle_new_user()         cascade;
drop function if exists public.bank_tx_org_consistency() cascade;
drop function if exists public.current_org()             cascade;
drop function if exists public.is_admin()                cascade;
drop function if exists public.is_clerk()                cascade;
drop function if exists public.is_member(text)           cascade;

-- ---------------------------------------------------------------------
-- ORGANIZATIONS (top-level tenant — multiple unrelated orgs supported)
-- ---------------------------------------------------------------------
create table if not exists public.organizations (
  id          text primary key,
  name        text not null,
  slug        text unique,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- USERS  (1:1 with auth.users) — belongs to one organization
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id              uuid primary key references auth.users (id) on delete cascade,
  uid             text generated always as (id::text) stored,   -- compat alias
  email           text not null,
  display_name    text,
  photo_url       text,
  role            text not null default 'clerk'
                    check (role in ('admin', 'clerk', 'warehouse_manager')),
  organization_id text references public.organizations (id) on delete set null,
  branch          text,
  favorites       jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists users_org_idx on public.users (organization_id);

-- Auto-create a public.users row when a new auth user is created.
-- The user is unassigned to any org until invited / promoted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, photo_url, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    case when new.email = 'aman.teferi.80@gmail.com' then 'admin' else 'clerk' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- BRANCHES (org-scoped)
-- ---------------------------------------------------------------------
create table if not exists public.branches (
  id              text primary key,
  organization_id text not null references public.organizations (id) on delete cascade,
  name            text not null,
  location        text,
  created_at      timestamptz not null default now()
);
create index if not exists branches_org_idx on public.branches (organization_id);

-- ---------------------------------------------------------------------
-- WAREHOUSES (org-scoped)
-- ---------------------------------------------------------------------
create table if not exists public.warehouses (
  id              text primary key,
  organization_id text not null references public.organizations (id) on delete cascade,
  name            text not null,
  location        text not null,
  created_at      timestamptz not null default now()
);
create index if not exists warehouses_org_idx on public.warehouses (organization_id);

-- ---------------------------------------------------------------------
-- INVENTORY (org-scoped, lives in a warehouse)
-- ---------------------------------------------------------------------
create table if not exists public.inventory (
  id                  text primary key,
  organization_id     text not null references public.organizations (id) on delete cascade,
  warehouse_id        text references public.warehouses    (id) on delete restrict,
  name                text not null,
  imei                text not null,
  purchase_price      numeric not null default 0,
  valuation           numeric not null,
  status              text not null
                        check (status in ('IN_STOCK','LENT','SOLD','SOLD_BY_RECIPIENT','PENDING_APPROVAL','IN_TRANSIT')),
  category            text not null check (category in ('PHONES','TABLETS','ACCESSORIES')),
  branch              text,
  is_approved         boolean default false,
  lent_to             text,
  expected_return_date timestamptz,
  created_at          timestamptz not null default now(),
  last_updated        timestamptz not null default now()
);
create index if not exists inventory_org_idx       on public.inventory (organization_id);
create index if not exists inventory_warehouse_idx on public.inventory (warehouse_id);
create index if not exists inventory_status_idx    on public.inventory (status);
create index if not exists inventory_branch_idx    on public.inventory (branch);

-- ---------------------------------------------------------------------
-- TRANSACTIONS (org-scoped business event)
-- A SALE, PURCHASE, EXPENSE, LENT, BORROWED, RETURNED, VOID, TRANSFER.
-- All bank movements (deposits/withdrawals/transfers) reference one of these.
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id              text primary key,
  organization_id text not null references public.organizations (id) on delete cascade,
  branch_id       text references public.branches (id) on delete set null,
  type            text not null
                    check (type in ('SALE','PURCHASE','LENT','BORROWED','EXPENSE','VOID','RETURNED','TRANSFER')),
  item            text not null,
  amount          numeric not null,
  timestamp       timestamptz not null default now(),
  clerk           text not null,
  clerk_id        uuid not null references public.users (id),
  status          text not null
                    check (status in ('SETTLED','PENDING','VOIDED','COMPLETED','IN_TRANSIT','APPROVED')),
  imei            text,
  location        text,
  source          text,
  branch          text,
  direction       text check (direction in ('SEND','RECEIVE')),
  transfer_type   text check (transfer_type in ('ASSET','CASH'))
);
create index if not exists transactions_org_idx       on public.transactions (organization_id);
create index if not exists transactions_branch_idx    on public.transactions (branch_id);
create index if not exists transactions_clerk_idx    on public.transactions (clerk_id);
create index if not exists transactions_timestamp_idx on public.transactions (timestamp desc);

-- ---------------------------------------------------------------------
-- BANK ACCOUNTS (org-scoped)
-- ---------------------------------------------------------------------
create table if not exists public.bank_accounts (
  id              text primary key,
  organization_id text not null references public.organizations (id) on delete cascade,
  bank_name       text not null,
  account_number  text not null,
  balance         numeric not null default 0,
  currency        text not null default 'ETB',
  color           text,
  owner_id        text not null,
  type            text not null check (type in ('STORE','EMPLOYEE')),
  created_at      timestamptz not null default now()
);
create index if not exists bank_accounts_org_idx on public.bank_accounts (organization_id);

-- ---------------------------------------------------------------------
-- BANK TRANSACTIONS — every entry MUST reference a `transactions` row
-- (the originating SALE / EXPENSE / PURCHASE / TRANSFER).
-- ---------------------------------------------------------------------
create table if not exists public.bank_transactions (
  id              text primary key,
  bank_account_id text not null references public.bank_accounts (id) on delete cascade,
  transaction_id  text not null references public.transactions  (id) on delete restrict,
  type            text not null check (type in ('DEPOSIT','WITHDRAWAL','TRANSFER')),
  amount          numeric not null,
  activity        text,
  project         text,
  "to"            text,
  date            timestamptz not null default now()
);
create index if not exists bank_tx_account_idx on public.bank_transactions (bank_account_id);
create index if not exists bank_tx_tx_idx      on public.bank_transactions (transaction_id);
create index if not exists bank_tx_date_idx    on public.bank_transactions (date desc);

-- Trigger: ensure bank_transactions.transaction_id belongs to the same
-- organization as the bank account being moved against.
create or replace function public.bank_tx_org_consistency()
returns trigger
language plpgsql
as $$
declare
  acct_org text;
  txn_org  text;
begin
  select organization_id into acct_org from public.bank_accounts where id = new.bank_account_id;
  select organization_id into txn_org  from public.transactions  where id = new.transaction_id;
  if acct_org is null or txn_org is null then
    raise exception 'bank_transactions: account or transaction not found';
  end if;
  if acct_org <> txn_org then
    raise exception 'bank_transactions: account and transaction belong to different organizations (% vs %)', acct_org, txn_org;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bank_tx_org_consistency on public.bank_transactions;
create trigger trg_bank_tx_org_consistency
  before insert or update on public.bank_transactions
  for each row execute function public.bank_tx_org_consistency();

-- ---------------------------------------------------------------------
-- NOTIFICATIONS (per-user; org inferred via user)
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id           text primary key,
  user_id      uuid references public.users (id) on delete cascade,
  title        text not null,
  body         text,
  type         text,
  warehouse_id text references public.warehouses (id) on delete set null,
  read         boolean not null default false,
  timestamp    timestamptz not null default now(),
  payload      jsonb
);
-- Ensure columns exist on pre-existing tables (idempotent migration).
alter table public.notifications add column if not exists type         text;
alter table public.notifications add column if not exists warehouse_id text references public.warehouses (id) on delete set null;
create index if not exists notifications_user_idx on public.notifications (user_id);

-- ---------------------------------------------------------------------
-- INVITES (org-scoped)
-- ---------------------------------------------------------------------
create table if not exists public.invites (
  id              text primary key,
  organization_id text not null references public.organizations (id) on delete cascade,
  email           text not null,
  role            text not null default 'clerk',
  status          text not null default 'PENDING'
                    check (status in ('PENDING','ACCEPTED','REVOKED')),
  invited_by      uuid references public.users (id),
  branch          text,
  timestamp       timestamptz not null default now()
);
create index if not exists invites_email_idx on public.invites (email);
create index if not exists invites_org_idx   on public.invites (organization_id);

-- ---------------------------------------------------------------------
-- RECONCILIATIONS (org-scoped, by clerk)
-- ---------------------------------------------------------------------
create table if not exists public.reconciliations (
  id              text primary key,
  organization_id text not null references public.organizations (id) on delete cascade,
  clerk_id        uuid not null references public.users (id),
  total           numeric not null,
  expected        numeric not null,
  variance        numeric not null,
  notes           text,
  timestamp       timestamptz not null default now()
);
create index if not exists reconciliations_clerk_idx on public.reconciliations (clerk_id);
create index if not exists reconciliations_org_idx   on public.reconciliations (organization_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- All policies enforce: signed-in + org-membership + role.
-- =====================================================================

alter table public.organizations     enable row level security;
alter table public.users             enable row level security;
alter table public.inventory         enable row level security;
alter table public.transactions      enable row level security;
alter table public.branches          enable row level security;
alter table public.warehouses        enable row level security;
alter table public.bank_accounts     enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.notifications     enable row level security;
alter table public.invites           enable row level security;
alter table public.reconciliations   enable row level security;

-- Helpers
create or replace function public.current_org()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_clerk()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'clerk'
  );
$$;

create or replace function public.is_member(org text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and organization_id = org
  );
$$;

-- ---------- ORGANIZATIONS ----------
drop policy if exists org_read on public.organizations;
create policy org_read on public.organizations for select
  using (id = public.current_org() or public.is_admin());

drop policy if exists org_create on public.organizations;
create policy org_create on public.organizations for insert
  with check (auth.uid() is not null);   -- any signed-in user can create a new org

drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations for update
  using (public.is_admin() and id = public.current_org());

drop policy if exists org_delete on public.organizations;
create policy org_delete on public.organizations for delete
  using (public.is_admin() and id = public.current_org());

-- ---------- USERS ----------
drop policy if exists users_read on public.users;
create policy users_read on public.users for select
  using (id = auth.uid() or organization_id = public.current_org());

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users for insert
  with check (auth.uid() = id);

drop policy if exists users_update_self_or_admin on public.users;
create policy users_update_self_or_admin on public.users for update
  using (
    auth.uid() = id
    or (public.is_admin() and organization_id = public.current_org())
  );

drop policy if exists users_delete_admin on public.users;
create policy users_delete_admin on public.users for delete
  using (public.is_admin() and organization_id = public.current_org());

-- ---------- INVENTORY ----------
drop policy if exists inv_read on public.inventory;
create policy inv_read on public.inventory for select
  using (organization_id = public.current_org());

drop policy if exists inv_insert on public.inventory;
create policy inv_insert on public.inventory for insert
  with check ((public.is_admin() or public.is_clerk()) and organization_id = public.current_org());

drop policy if exists inv_update on public.inventory;
create policy inv_update on public.inventory for update
  using ((public.is_admin() or public.is_clerk()) and organization_id = public.current_org());

drop policy if exists inv_delete on public.inventory;
create policy inv_delete on public.inventory for delete
  using (public.is_admin() and organization_id = public.current_org());

-- ---------- TRANSACTIONS ----------
drop policy if exists tx_read on public.transactions;
create policy tx_read on public.transactions for select
  using (organization_id = public.current_org());

drop policy if exists tx_insert on public.transactions;
create policy tx_insert on public.transactions for insert
  with check (
    (public.is_admin() or public.is_clerk())
    and organization_id = public.current_org()
    and clerk_id = auth.uid()
  );

drop policy if exists tx_update on public.transactions;
create policy tx_update on public.transactions for update
  using (public.is_admin() and organization_id = public.current_org());

drop policy if exists tx_delete on public.transactions;
create policy tx_delete on public.transactions for delete
  using (public.is_admin() and organization_id = public.current_org());

-- ---------- BRANCHES ----------
drop policy if exists br_read on public.branches;
create policy br_read on public.branches for select
  using (organization_id = public.current_org());
drop policy if exists br_insert on public.branches;
create policy br_insert on public.branches for insert
  with check ((public.is_admin() or public.is_clerk()) and organization_id = public.current_org());
drop policy if exists br_update on public.branches;
create policy br_update on public.branches for update
  using (public.is_admin() and organization_id = public.current_org());
drop policy if exists br_delete on public.branches;
create policy br_delete on public.branches for delete
  using (public.is_admin() and organization_id = public.current_org());

-- ---------- WAREHOUSES ----------
drop policy if exists wh_read on public.warehouses;
create policy wh_read on public.warehouses for select
  using (organization_id = public.current_org());
drop policy if exists wh_admin_all on public.warehouses;
create policy wh_admin_all on public.warehouses for all
  using (public.is_admin() and organization_id = public.current_org())
  with check (public.is_admin() and organization_id = public.current_org());

-- ---------- BANK ACCOUNTS / BANK TRANSACTIONS ----------
-- All org members can SELECT bank_accounts so RLS sub-queries (e.g. the
-- bank_transactions visibility check) work uniformly. The application
-- layer is responsible for hiding STORE accounts from non-admins.
drop policy if exists ba_read on public.bank_accounts;
create policy ba_read on public.bank_accounts for select
  using (organization_id = public.current_org());
drop policy if exists ba_admin_all on public.bank_accounts;
create policy ba_admin_all on public.bank_accounts for all
  using (public.is_admin() and organization_id = public.current_org())
  with check (public.is_admin() and organization_id = public.current_org());
-- Clerks may create / update / delete their OWN employee bank account.
drop policy if exists ba_clerk_insert on public.bank_accounts;
create policy ba_clerk_insert on public.bank_accounts for insert
  with check (
    public.is_clerk()
    and organization_id = public.current_org()
    and type = 'EMPLOYEE'
    and owner_id = auth.uid()::text
  );
drop policy if exists ba_clerk_update on public.bank_accounts;
create policy ba_clerk_update on public.bank_accounts for update
  using (
    public.is_clerk()
    and organization_id = public.current_org()
    and type = 'EMPLOYEE'
    and owner_id = auth.uid()::text
  )
  with check (
    public.is_clerk()
    and organization_id = public.current_org()
    and type = 'EMPLOYEE'
    and owner_id = auth.uid()::text
  );
drop policy if exists ba_clerk_delete on public.bank_accounts;
create policy ba_clerk_delete on public.bank_accounts for delete
  using (
    public.is_clerk()
    and organization_id = public.current_org()
    and type = 'EMPLOYEE'
    and owner_id = auth.uid()::text
  );

drop policy if exists btx_read on public.bank_transactions;
create policy btx_read on public.bank_transactions for select
  using (
    exists (
      select 1 from public.bank_accounts ba
      where ba.id = bank_account_id
        and ba.organization_id = public.current_org()
    )
  );
drop policy if exists btx_admin_all on public.bank_transactions;
create policy btx_admin_all on public.bank_transactions for all
  using (
    public.is_admin()
    and exists (
      select 1 from public.bank_accounts ba
      where ba.id = bank_account_id
        and ba.organization_id = public.current_org()
    )
  )
  with check (
    public.is_admin()
    and exists (
      select 1 from public.bank_accounts ba
      where ba.id = bank_account_id
        and ba.organization_id = public.current_org()
    )
  );
-- Clerks (employees) need to insert bank_transactions when posting sales/purchases.
drop policy if exists btx_clerk_insert on public.bank_transactions;
create policy btx_clerk_insert on public.bank_transactions for insert
  with check (
    (public.is_admin() or public.is_clerk())
    and exists (
      select 1 from public.bank_accounts ba
      where ba.id = bank_account_id
        and ba.organization_id = public.current_org()
    )
  );

-- ---------- NOTIFICATIONS ----------
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists notif_insert on public.notifications;
create policy notif_insert on public.notifications for insert
  with check (auth.uid() is not null);
drop policy if exists notif_admin_modify on public.notifications;
create policy notif_admin_modify on public.notifications for update using (public.is_admin());
drop policy if exists notif_admin_delete on public.notifications;
create policy notif_admin_delete on public.notifications for delete using (public.is_admin());

-- ---------- INVITES ----------
drop policy if exists inv_invitee_or_admin_read on public.invites;
create policy inv_invitee_or_admin_read on public.invites for select
  using (
    email = auth.email()
    or (public.is_admin() and organization_id = public.current_org())
  );
drop policy if exists inv_admin_create on public.invites;
create policy inv_admin_create on public.invites for insert
  with check (public.is_admin() and organization_id = public.current_org());
drop policy if exists inv_invitee_or_admin_update on public.invites;
create policy inv_invitee_or_admin_update on public.invites for update
  using (
    email = auth.email()
    or (public.is_admin() and organization_id = public.current_org())
  );
drop policy if exists inv_admin_delete on public.invites;
create policy inv_admin_delete on public.invites for delete
  using (public.is_admin() and organization_id = public.current_org());

-- ---------- RECONCILIATIONS ----------
drop policy if exists rec_read on public.reconciliations;
create policy rec_read on public.reconciliations for select
  using (
    clerk_id = auth.uid()
    or (public.is_admin() and organization_id = public.current_org())
  );
drop policy if exists rec_insert on public.reconciliations;
create policy rec_insert on public.reconciliations for insert
  with check (
    (public.is_admin() or public.is_clerk())
    and organization_id = public.current_org()
    and clerk_id = auth.uid()
  );
drop policy if exists rec_admin_modify on public.reconciliations;
create policy rec_admin_modify on public.reconciliations for update
  using (public.is_admin() and organization_id = public.current_org());
drop policy if exists rec_admin_delete on public.reconciliations;
create policy rec_admin_delete on public.reconciliations for delete
  using (public.is_admin() and organization_id = public.current_org());

-- ============================================================================
-- LOANS — money lent or borrowed by the org (counterparty + bank linkage)
-- ============================================================================
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
create index if not exists loans_org_idx on public.loans (organization_id);
create index if not exists loans_bank_idx on public.loans (bank_account_id);
alter table public.loans enable row level security;

drop policy if exists loan_read on public.loans;
create policy loan_read on public.loans for select
  using (organization_id = public.current_org());
drop policy if exists loan_insert on public.loans;
create policy loan_insert on public.loans for insert
  with check (
    (public.is_admin() or public.is_clerk())
    and organization_id = public.current_org()
  );
drop policy if exists loan_update on public.loans;
create policy loan_update on public.loans for update
  using (
    (public.is_admin() or public.is_clerk())
    and organization_id = public.current_org()
  );
drop policy if exists loan_delete on public.loans;
create policy loan_delete on public.loans for delete
  using (public.is_admin() and organization_id = public.current_org());
