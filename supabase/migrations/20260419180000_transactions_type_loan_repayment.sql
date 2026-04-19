-- =============================================================================
-- 2026-04-19 — extend transactions.type to support loan + repayment events
-- =============================================================================
-- Loans (cash given/received from a counterparty) and their repayments now
-- write a row to public.transactions so they show up in the All Transactions
-- list alongside sales, purchases, expenses, lends, etc. The existing
-- bank_transactions.transaction_id NOT NULL FK already required this — every
-- bank movement must be paired with a transactions row — so this migration
-- simply broadens the allowed type values.
-- =============================================================================

begin;

alter table public.transactions
  drop constraint if exists transactions_type_check;

alter table public.transactions
  add  constraint transactions_type_check
  check (type in (
    'SALE','PURCHASE','LENT','BORROWED','EXPENSE','VOID','RETURNED','TRANSFER',
    'LOAN','REPAYMENT'
  ));

commit;
