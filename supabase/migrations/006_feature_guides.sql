-- =====================================================================
-- 006_feature_guides
-- 機能ガイド（できること紹介） - 安心ガイドと同じ管理設計
--   - DB 一元管理 / version 付き / RLS read-only public
--   - displayLocations 複数面 / minTrustTier / requiredVerified / requiredAge による条件分岐
--   - locked 表示用の "coming soon" / "条件達成で解放" を UI 側で制御
-- =====================================================================

create table if not exists public.feature_guides (
  id                text primary key,
  title             text not null,
  short_label       text not null,
  description       text not null,
  example           text not null default '',
  category          text not null default 'community',
  icon              text not null default 'sparkles',
  color             text not null default '#8B5CF6',
  display_locations text[] not null default '{}',
  enabled           boolean not null default true,
  "order"           int not null default 0,
  min_trust_tier    int,
  required_verified boolean not null default false,
  required_age      int,
  first_action      text,
  version           int not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists feature_guides_enabled_order_idx
  on public.feature_guides (enabled, "order" asc);
create index if not exists feature_guides_category_idx
  on public.feature_guides (category);

-- メタ情報（bundle_version、catchcopy、不安解消メッセージ、3ステップフロー等の補助文言）
create table if not exists public.feature_guide_meta (
  singleton           boolean primary key default true,
  bundle_version      int not null default 1,
  catchcopies         jsonb not null default '[]'::jsonb,           -- string[] のキャッチコピー候補
  anxiety_messages    jsonb not null default '[]'::jsonb,           -- {key: string, candidates: string[]}[]
  starter_flow        jsonb not null default '[]'::jsonb,           -- {step: number, title: string, hint: string}[]
  updated_at          timestamptz not null default now(),
  constraint singleton_row check (singleton)
);

-- RLS
alter table public.feature_guides     enable row level security;
alter table public.feature_guide_meta enable row level security;

drop policy if exists fg_read on public.feature_guides;
create policy fg_read on public.feature_guides for select using (true);

drop policy if exists fgm_read on public.feature_guide_meta;
create policy fgm_read on public.feature_guide_meta for select using (true);

-- updated_at trigger（既存の touch_rules_updated_at を流用可能だが独立で）
create or replace function public.touch_feature_guides_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_fg_touch on public.feature_guides;
create trigger trg_fg_touch before update on public.feature_guides
  for each row execute function public.touch_feature_guides_updated_at();
