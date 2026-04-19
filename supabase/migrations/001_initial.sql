-- =============================================
-- nowmate — Initial Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES
-- =============================================
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text not null,
  age               smallint not null check (age >= 18 and age <= 99),
  gender            text not null check (gender in ('male','female','other')),
  nationality       text not null,
  area              text not null,
  spoken_languages  text[] not null default '{}',
  learning_languages text[] not null default '{}',
  purposes          text[] not null default '{}',
  bio               text,
  avatar_url        text,
  is_online         boolean not null default false,
  is_active         boolean not null default true,
  updated_at        timestamptz not null default now()
);

-- =============================================
-- LIKES
-- =============================================
create table public.likes (
  id            uuid primary key default uuid_generate_v4(),
  from_user_id  uuid not null references public.profiles(id) on delete cascade,
  to_user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (from_user_id, to_user_id)
);

-- =============================================
-- MATCHES
-- =============================================
create table public.matches (
  id          uuid primary key default uuid_generate_v4(),
  user1_id    uuid not null references public.profiles(id) on delete cascade,
  user2_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user1_id, user2_id),
  check (user1_id < user2_id)
);

-- =============================================
-- MESSAGES
-- =============================================
create table public.messages (
  id          uuid primary key default uuid_generate_v4(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- =============================================
-- REPORTS
-- =============================================
create table public.reports (
  id            uuid primary key default uuid_generate_v4(),
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  reported_id   uuid not null references public.profiles(id) on delete cascade,
  reason        text not null,
  description   text,
  created_at    timestamptz not null default now()
);

-- =============================================
-- BLOCKS
-- =============================================
create table public.blocks (
  id          uuid primary key default uuid_generate_v4(),
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

-- =============================================
-- INDEXES
-- =============================================
create index on public.profiles (area);
create index on public.profiles (nationality);
create index on public.profiles (is_active);
create index on public.likes (from_user_id);
create index on public.likes (to_user_id);
create index on public.matches (user1_id);
create index on public.matches (user2_id);
create index on public.messages (match_id, created_at);
create index on public.blocks (blocker_id);
create index on public.blocks (blocked_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

alter table public.profiles  enable row level security;
alter table public.likes      enable row level security;
alter table public.matches    enable row level security;
alter table public.messages   enable row level security;
alter table public.reports    enable row level security;
alter table public.blocks     enable row level security;

-- PROFILES policies
create policy "Anyone can view active profiles"
  on public.profiles for select
  using (is_active = true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- LIKES policies
create policy "Users can view their own likes"
  on public.likes for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Users can create likes"
  on public.likes for insert
  with check (auth.uid() = from_user_id);

create policy "Users can delete their own likes"
  on public.likes for delete
  using (auth.uid() = from_user_id);

-- MATCHES policies
create policy "Users can view their own matches"
  on public.matches for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "Authenticated users can create matches"
  on public.matches for insert
  with check (auth.uid() = user1_id or auth.uid() = user2_id);

-- MESSAGES policies
create policy "Match participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
      and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

create policy "Match participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
      and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

-- REPORTS policies (users can create, cannot read others' reports)
create policy "Users can submit reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- BLOCKS policies
create policy "Users can view their own blocks"
  on public.blocks for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create policy "Users can create blocks"
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

create policy "Users can delete their own blocks"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

-- =============================================
-- STORAGE: avatars bucket
-- (Run separately in Storage section or here)
-- =============================================

-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- create policy "Avatars are publicly readable"
--   on storage.objects for select
--   using (bucket_id = 'avatars');

-- create policy "Users can upload their own avatar"
--   on storage.objects for insert
--   with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- create policy "Users can update their own avatar"
--   on storage.objects for update
--   using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
