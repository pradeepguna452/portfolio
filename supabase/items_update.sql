-- Run this in your Supabase SQL Editor to add the new columns
alter table public.items 
add column if not exists value numeric not null default 0,
add column if not exists usage text,
add column if not exists notify_email text;
