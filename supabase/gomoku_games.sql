-- Run this manually in Supabase SQL Editor to create the gomoku_games table.
-- (No migration file per project preference.)

create table if not exists public.gomoku_games (
  id uuid primary key default gen_random_uuid(),
  short_code text unique not null,
  status text not null default 'waiting',
  black_player text,
  white_player text,
  current_turn text not null default 'B',
  winner text,
  board text not null default '',
  move_count int not null default 0,
  version int not null default 0,
  last_move_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration for existing tables
alter table public.gomoku_games add column if not exists version int not null default 0;

create index if not exists idx_gomoku_games_short_code on public.gomoku_games(short_code);
