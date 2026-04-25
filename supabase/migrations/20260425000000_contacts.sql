-- =============================================================================
-- 2026-04-25 — contacts (vendors / customers) + loan ↔ contact link
-- =============================================================================
-- Each payable / receivable (a row in public.loans) is now optionally tied to
-- a row in public.contacts. The Ledger screen aggregates outstanding balances
-- per contact to surface Top Vendors (payables) and Top Customers
-- (receivables). Idempotent; preserves existing data.
-- =============================================================================

    begin;

    -- ---------------------------------------------------------------------------
    -- 1. contacts table
    -- ---------------------------------------------------------------------------
    create table if not exists public.contacts (
    id              text primary key,
    organization_id text not null references public.organizations (id) on delete cascade,
    name            text not null,
    type            text not null default 'BOTH'
                        check (type in ('VENDOR','CUSTOMER','BOTH')),
    phone           text,
    email           text,
    notes           text,
    created_at      timestamptz not null default now()
    );
    create index if not exists contacts_org_idx  on public.contacts (organization_id);
    create index if not exists contacts_name_idx on public.contacts (organization_id, lower(name));

    alter table public.contacts enable row level security;

    drop policy if exists contact_read   on public.contacts;
    drop policy if exists contact_insert on public.contacts;
    drop policy if exists contact_update on public.contacts;
    drop policy if exists contact_delete on public.contacts;

    create policy contact_read on public.contacts for select
    using (organization_id = public.current_org());

    create policy contact_insert on public.contacts for insert
    with check (
        (public.is_admin() or public.is_clerk())
        and organization_id = public.current_org()
    );

    create policy contact_update on public.contacts for update
    using (
        (public.is_admin() or public.is_clerk())
        and organization_id = public.current_org()
    );

    create policy contact_delete on public.contacts for delete
    using (public.is_admin() and organization_id = public.current_org());

    -- ---------------------------------------------------------------------------
    -- 2. loans.contact_id — optional FK so legacy free-text counterparties keep
    --    working until a contact is assigned.
    -- ---------------------------------------------------------------------------
    alter table public.loans
    add column if not exists contact_id text references public.contacts (id) on delete set null;
    create index if not exists loans_contact_idx on public.loans (contact_id);

    commit;
