-- Run this in your Supabase SQL Editor
alter table public.items 
add column if not exists notified boolean not null default false;

alter table public.reminders 
add column if not exists notified boolean not null default false,
add column if not exists notify_email text;
