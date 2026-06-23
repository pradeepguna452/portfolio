-- Run this in Supabase SQL Editor to create the new tables

-- =========
-- Checklists & Habits
-- =========
create table if not exists public.checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  frequency text not null check (frequency in ('daily', 'monthly', 'yearly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- We assume set_updated_at function exists from previous schema
create trigger checklists_updated_at
before update on public.checklists
for each row execute function public.set_updated_at();

alter table public.checklists enable row level security;
create policy "checklists_select_own" on public.checklists for select using (auth.uid() = user_id);
create policy "checklists_insert_own" on public.checklists for insert with check (auth.uid() = user_id);
create policy "checklists_update_own" on public.checklists for update using (auth.uid() = user_id);
create policy "checklists_delete_own" on public.checklists for delete using (auth.uid() = user_id);

-- =========
-- Checklist Logs (Progression tracking)
-- =========
-- We use log_date (YYYY-MM-DD format) even for monthly/yearly, by normalizing:
-- Daily: YYYY-MM-DD (e.g. 2026-06-23)
-- Monthly: YYYY-MM-01 (e.g. 2026-06-01)
-- Yearly: YYYY-01-01 (e.g. 2026-01-01)
create table if not exists public.checklist_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checklist_id uuid not null references public.checklists(id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (checklist_id, log_date)
);

create index if not exists checklist_logs_date_idx on public.checklist_logs(log_date);

alter table public.checklist_logs enable row level security;
create policy "checklist_logs_select_own" on public.checklist_logs for select using (auth.uid() = user_id);
create policy "checklist_logs_insert_own" on public.checklist_logs for insert with check (auth.uid() = user_id);
create policy "checklist_logs_delete_own" on public.checklist_logs for delete using (auth.uid() = user_id);
