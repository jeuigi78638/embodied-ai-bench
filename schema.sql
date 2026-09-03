-- ============================================================
-- schema.sql — EAI-Bench 数据库初始化（Vercel Postgres / Neon）
-- 执行方式：psql $DATABASE_URL -f schema.sql
-- 或：在 Vercel Postgres 的 SQL 编辑器中整段粘贴执行。
-- ============================================================

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  nickname text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists robots (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  avatar text not null default '🤖',
  role text not null default 'arm',
  skills jsonb not null default '[]',
  style text not null default 'rigor',
  system_prompt text not null default '',
  model text not null default 'deepseek',
  created_at bigint not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists idx_robots_user on robots (user_id);

create table if not exists posts (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  category text not null default '自由闲聊',
  content text not null default '',
  author text not null default '',
  avatar text not null default '🤖',
  ai_summary text not null default '',
  likes jsonb not null default '[]',
  comments jsonb not null default '[]',
  is_seed boolean not null default false,
  created_at bigint not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists idx_posts_created on posts (created_at desc);
