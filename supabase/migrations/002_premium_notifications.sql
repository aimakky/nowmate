-- =============================================
-- nowmate — Migration 002
-- Premium plan tracking & notification prefs
-- =============================================

-- ── Premium subscriptions ──────────────────
create table public.premium_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade unique,
  plan        text not null default 'monthly' check (plan in ('monthly','yearly')),
  status      text not null default 'active' check (status in ('active','cancelled','expired')),
  started_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

alter table public.premium_subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.premium_subscriptions for select
  using (auth.uid() = user_id);

-- ── Notification preferences ───────────────
create table public.notification_prefs (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  new_match       boolean not null default true,
  new_message     boolean not null default true,
  new_like        boolean not null default false,  -- Premium only
  marketing       boolean not null default false,
  updated_at      timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

create policy "Users can manage their own notification prefs"
  on public.notification_prefs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create prefs on new profile
create or replace function create_default_notification_prefs()
returns trigger language plpgsql security definer as $$
begin
  insert into public.notification_prefs (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function create_default_notification_prefs();

-- ── Helper: is_premium view ─────────────────
create or replace view public.user_premium_status as
  select
    p.id as user_id,
    case when ps.id is not null and ps.expires_at > now() then true else false end as is_premium,
    ps.expires_at
  from public.profiles p
  left join public.premium_subscriptions ps on ps.user_id = p.id and ps.status = 'active';

-- ── Update matches with last_message_at ────
alter table public.matches
  add column if not exists last_message_at timestamptz;

-- Trigger to update last_message_at
create or replace function update_match_last_message()
returns trigger language plpgsql security definer as $$
begin
  update public.matches
  set last_message_at = new.created_at
  where id = new.match_id;
  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute function update_match_last_message();
