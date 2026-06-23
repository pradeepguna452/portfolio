-- Run this in Supabase SQL Editor to create the new tables for the Quantitative Habit Tracker

-- =========
-- Habits Table
-- =========
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target integer not null default 1,
  unit text not null default 'times',
  goal_type text not null check (goal_type in ('build', 'quit')),
  frequency text not null check (frequency in ('daily', 'weekly')),
  icon text not null default 'activity',
  color text not null default 'indigo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- We assume set_updated_at function exists from previous schema
create trigger habits_updated_at
before update on public.habits
for each row execute function public.set_updated_at();

alter table public.habits enable row level security;
create policy "habits_select_own" on public.habits for select using (auth.uid() = user_id);
create policy "habits_insert_own" on public.habits for insert with check (auth.uid() = user_id);
create policy "habits_update_own" on public.habits for update using (auth.uid() = user_id);
create policy "habits_delete_own" on public.habits for delete using (auth.uid() = user_id);

-- =========
-- Habit Logs Table
-- =========
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null,
  progress_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create trigger habit_logs_updated_at
before update on public.habit_logs
for each row execute function public.set_updated_at();

create index if not exists habit_logs_date_idx on public.habit_logs(log_date);

alter table public.habit_logs enable row level security;
create policy "habit_logs_select_own" on public.habit_logs for select using (auth.uid() = user_id);
create policy "habit_logs_insert_own" on public.habit_logs for insert with check (auth.uid() = user_id);
create policy "habit_logs_update_own" on public.habit_logs for update using (auth.uid() = user_id);
create policy "habit_logs_delete_own" on public.habit_logs for delete using (auth.uid() = user_id);
