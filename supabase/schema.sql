-- Run this in Supabase SQL Editor (Project -> SQL Editor).
-- It creates tables + Row Level Security so only you can see your own data.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========
-- Daily tracker
-- =========
create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  mood smallint,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create trigger daily_entries_updated_at
before update on public.daily_entries
for each row execute function public.set_updated_at();

alter table public.daily_entries enable row level security;
create policy "daily_entries_select_own"
on public.daily_entries for select
using (auth.uid() = user_id);
create policy "daily_entries_insert_own"
on public.daily_entries for insert
with check (auth.uid() = user_id);
create policy "daily_entries_update_own"
on public.daily_entries for update
using (auth.uid() = user_id);
create policy "daily_entries_delete_own"
on public.daily_entries for delete
using (auth.uid() = user_id);

-- =========
-- Money management
-- =========
create table if not exists public.money_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tx_date date not null,
  kind text not null check (kind in ('income', 'expense')),
  category text,
  amount numeric(12,2) not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists money_transactions_user_date_idx
on public.money_transactions (user_id, tx_date desc);

create trigger money_transactions_updated_at
before update on public.money_transactions
for each row execute function public.set_updated_at();

alter table public.money_transactions enable row level security;
create policy "money_transactions_select_own"
on public.money_transactions for select
using (auth.uid() = user_id);
create policy "money_transactions_insert_own"
on public.money_transactions for insert
with check (auth.uid() = user_id);
create policy "money_transactions_update_own"
on public.money_transactions for update
using (auth.uid() = user_id);
create policy "money_transactions_delete_own"
on public.money_transactions for delete
using (auth.uid() = user_id);

-- =========
-- Items bought / expiry
-- =========
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bought_on date,
  expires_on date,
  used_until date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_user_expires_idx
on public.items (user_id, expires_on);

create trigger items_updated_at
before update on public.items
for each row execute function public.set_updated_at();

alter table public.items enable row level security;
create policy "items_select_own"
on public.items for select
using (auth.uid() = user_id);
create policy "items_insert_own"
on public.items for insert
with check (auth.uid() = user_id);
create policy "items_update_own"
on public.items for update
using (auth.uid() = user_id);
create policy "items_delete_own"
on public.items for delete
using (auth.uid() = user_id);

-- =========
-- Documents (metadata; store files in Supabase Storage bucket)
-- =========
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  tags text[] not null default '{}',
  storage_bucket text not null default 'documents',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_user_created_idx
on public.documents (user_id, created_at desc);

create trigger documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

alter table public.documents enable row level security;
create policy "documents_select_own"
on public.documents for select
using (auth.uid() = user_id);
create policy "documents_insert_own"
on public.documents for insert
with check (auth.uid() = user_id);
create policy "documents_update_own"
on public.documents for update
using (auth.uid() = user_id);
create policy "documents_delete_own"
on public.documents for delete
using (auth.uid() = user_id);

-- =========
-- Reminders
-- =========
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  note text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_user_time_idx
on public.reminders (user_id, remind_at);

create trigger reminders_updated_at
before update on public.reminders
for each row execute function public.set_updated_at();

alter table public.reminders enable row level security;
create policy "reminders_select_own"
on public.reminders for select
using (auth.uid() = user_id);
create policy "reminders_insert_own"
on public.reminders for insert
with check (auth.uid() = user_id);
create policy "reminders_update_own"
on public.reminders for update
using (auth.uid() = user_id);
create policy "reminders_delete_own"
on public.reminders for delete
using (auth.uid() = user_id);

-- =========
-- Birthdays
-- =========
create table if not exists public.birthdays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  birthday date not null,
  email text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists birthdays_user_bday_idx
on public.birthdays (user_id, birthday);

create trigger birthdays_updated_at
before update on public.birthdays
for each row execute function public.set_updated_at();

alter table public.birthdays enable row level security;
create policy "birthdays_select_own"
on public.birthdays for select
using (auth.uid() = user_id);
create policy "birthdays_insert_own"
on public.birthdays for insert
with check (auth.uid() = user_id);
create policy "birthdays_update_own"
on public.birthdays for update
using (auth.uid() = user_id);
create policy "birthdays_delete_own"
on public.birthdays for delete
using (auth.uid() = user_id);

-- =========
-- Vault (store ONLY encrypted payloads)
-- =========
create table if not exists public.vault_secrets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  username text,
  -- base64-encoded fields for client-side encryption
  salt_b64 text not null,
  iv_b64 text not null,
  ciphertext_b64 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vault_secrets_user_created_idx
on public.vault_secrets (user_id, created_at desc);

create trigger vault_secrets_updated_at
before update on public.vault_secrets
for each row execute function public.set_updated_at();

alter table public.vault_secrets enable row level security;
create policy "vault_secrets_select_own"
on public.vault_secrets for select
using (auth.uid() = user_id);
create policy "vault_secrets_insert_own"
on public.vault_secrets for insert
with check (auth.uid() = user_id);
create policy "vault_secrets_update_own"
on public.vault_secrets for update
using (auth.uid() = user_id);
create policy "vault_secrets_delete_own"
on public.vault_secrets for delete
using (auth.uid() = user_id);

