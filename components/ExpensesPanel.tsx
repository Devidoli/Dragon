-- Run this ONCE in Supabase: SQL Editor > New query > paste > Run
-- Safe to run again; it only adds what is missing.

-- 1) Income / Expenses book
create table if not exists public.expenses (
  id text primary key,
  name text not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);
alter table public.expenses add column if not exists type text not null default 'expense';
alter table public.expenses disable row level security;

-- 2) POS payment type (cash / qr / split) and bill grouping
alter table public.counter_sales add column if not exists bill_id text;
alter table public.counter_sales add column if not exists payment_method text;
alter table public.counter_sales add column if not exists cash_amount numeric;
alter table public.counter_sales add column if not exists qr_amount numeric;
