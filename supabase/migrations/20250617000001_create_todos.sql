-- Create todos table for cloud sync
-- Each todo belongs to an authenticated user and is isolated via RLS

create table public.todos (
  id uuid primary key,
  user_id uuid not null,
  content text not null,
  status text not null,
  created_at bigint not null,
  completed_at bigint,
  updated_at bigint not null,
  deleted_at bigint
);

-- Indexes for common queries
comment on column public.todos.created_at is 'Unix timestamp in milliseconds (Date.now())';
comment on column public.todos.updated_at is 'Unix timestamp in milliseconds (Date.now())';
comment on column public.todos.completed_at is 'Unix timestamp in milliseconds (Date.now())';
comment on column public.todos.deleted_at is 'Unix timestamp in milliseconds when soft-deleted; null means active';

create index idx_todos_user_id on public.todos(user_id);
create index idx_todos_updated_at on public.todos(updated_at);
create index idx_todos_user_updated on public.todos(user_id, updated_at);

-- Enable RLS
alter table public.todos enable row level security;

-- Users can only access their own todos
create policy "select own todos"
  on public.todos for select
  to authenticated
  using (auth.uid() = user_id);

create policy "insert own todos"
  on public.todos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "update own todos"
  on public.todos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own todos"
  on public.todos for delete
  to authenticated
  using (auth.uid() = user_id);

-- Allow anon/authenticated roles to access the table via the Data API
-- (RLS still enforces row-level access above)
grant select, insert, update, delete on public.todos to authenticated;
