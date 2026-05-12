-- =====================================================================
-- 007_recruitment_cards (PR-B1)
-- YVOICE Phase B「募集カード機能」用の DB 準備
--
-- 目的:
--   - 既存 village_posts に「募集カード」用のフラグ・属性カラムを安全に追加する
--   - 参加者管理用に village_post_participants テーブルを新規作成する
--   - 新規テーブルにのみ RLS を作成する
--
-- 安全原則 (絶対に守る):
--   - 既存 village_posts / village_members の RLS は触らない
--   - 既存データを削除 / 変更しない
--   - 既存カラム名・型は変更しない
--   - DELETE / DROP / DROP TABLE / DROP POLICY 一切無し
--   - 全て idempotent
--       * create table / index / column → if not exists
--       * constraint / policy        → pg_constraint / pg_policies 存在チェック
--   - 既存 LFG カラム (lfg_platform / lfg_time / lfg_game) と
--     既存 deadline_at は重複させない (重複検知済み)
-- =====================================================================


-- ──────────────────────────────────────────────
-- 1. village_posts に募集カード用カラムを追加 (全て nullable / 既存行に影響なし)
-- ──────────────────────────────────────────────
-- 注: 既存 LFG カラム (lfg_platform / lfg_time / lfg_game) はそのまま活用するため
--     追加しない。expires_at は既存 deadline_at と重複するため追加しない。

alter table public.village_posts
  add column if not exists is_recruitment             boolean      not null default false;

alter table public.village_posts
  add column if not exists recruitment_type           text;        -- 例: 'voice_play' / 'beginner_friendly' / 'rank' / 'casual'

alter table public.village_posts
  add column if not exists max_participants           smallint;    -- 募集人数上限 (null = 上限なし)

alter table public.village_posts
  add column if not exists current_participants_count smallint     not null default 0;

alter table public.village_posts
  add column if not exists recruitment_status         text         not null default 'open';
  -- 'open' / 'closed' / 'expired' / 'completed'

alter table public.village_posts
  add column if not exists voice_enabled              boolean      not null default false;

alter table public.village_posts
  add column if not exists beginner_friendly          boolean      not null default false;

alter table public.village_posts
  add column if not exists play_style                 text;        -- 例: 'casual' / 'rank' / 'fun' (null = 未指定)


-- ──────────────────────────────────────────────
-- 2. 軽量な CHECK 制約 (既存行は default 値が入っているため違反しない)
--    constraint は重複追加できない (ADD CONSTRAINT IF NOT EXISTS が存在しない) ので
--    do $$ ブロックで pg_constraint を存在チェックして idempotent にする。
-- ──────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'village_posts_recruitment_status_check'
  ) then
    alter table public.village_posts
      add constraint village_posts_recruitment_status_check
      check (recruitment_status in ('open', 'closed', 'expired', 'completed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'village_posts_max_participants_check'
  ) then
    alter table public.village_posts
      add constraint village_posts_max_participants_check
      check (max_participants is null or (max_participants >= 1 and max_participants <= 50));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'village_posts_current_participants_check'
  ) then
    alter table public.village_posts
      add constraint village_posts_current_participants_check
      check (current_participants_count >= 0);
  end if;
end $$;


-- ──────────────────────────────────────────────
-- 3. index 追加 (募集カード一覧の検索パフォーマンス用)
-- ──────────────────────────────────────────────
create index if not exists village_posts_is_recruitment_idx
  on public.village_posts (is_recruitment)
  where is_recruitment = true;

create index if not exists village_posts_recruitment_status_idx
  on public.village_posts (recruitment_status)
  where is_recruitment = true;


-- ──────────────────────────────────────────────
-- 4. village_post_participants を新規作成 (参加者管理)
-- ──────────────────────────────────────────────
create table if not exists public.village_post_participants (
  id          uuid         primary key default uuid_generate_v4(),
  post_id     uuid         not null references public.village_posts(id) on delete cascade,
  user_id     uuid         not null references auth.users(id)           on delete cascade,
  status      text         not null default 'joined',
  created_at  timestamptz  not null default now(),
  unique (post_id, user_id)
);

-- status の値域チェック (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'village_post_participants_status_check'
  ) then
    alter table public.village_post_participants
      add constraint village_post_participants_status_check
      check (status in ('joined', 'pending', 'left', 'kicked'));
  end if;
end $$;

create index if not exists village_post_participants_post_idx
  on public.village_post_participants (post_id, status);

create index if not exists village_post_participants_user_idx
  on public.village_post_participants (user_id, status);


-- ──────────────────────────────────────────────
-- 5. RLS — 新規テーブル village_post_participants のみに作成
--    (既存 village_posts / village_members の RLS は一切触らない)
--
--   DROP POLICY を一切使わず、pg_policies で存在チェックしてから
--   create policy する idempotent パターンに統一。
-- ──────────────────────────────────────────────
alter table public.village_post_participants enable row level security;

-- SELECT: 認証ユーザーは募集の参加者を閲覧可能
--   (募集カードは公開情報。誰が参加するかは募集主催者・他の参加者も知る必要がある)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'village_post_participants'
      and policyname = 'village_post_participants_select'
  ) then
    create policy village_post_participants_select
      on public.village_post_participants
      for select to authenticated
      using (true);
  end if;
end $$;

-- INSERT: 自分の参加レコードだけ作成可能 (なりすまし防止) かつ
--         対象 post が「募集カードかつ open 状態」である場合に限定。
--         通常投稿への誤参加 / 締切後参加を DB レベルで弾く。
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'village_post_participants'
      and policyname = 'village_post_participants_insert_self'
  ) then
    create policy village_post_participants_insert_self
      on public.village_post_participants
      for insert to authenticated
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from public.village_posts vp
          where vp.id = post_id
            and vp.is_recruitment = true
            and vp.recruitment_status = 'open'
        )
      );
  end if;
end $$;

-- UPDATE: 自分の参加だけ更新可能。
--         一般ユーザーが自分で設定できる status は 'joined' / 'left' のみ。
--         'kicked' は将来の管理者機能 (service_role バイパス) 用、
--         'pending' は将来の承認制募集用予約値で、本人 UPDATE では設定させない。
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'village_post_participants'
      and policyname = 'village_post_participants_update_self'
  ) then
    create policy village_post_participants_update_self
      on public.village_post_participants
      for update to authenticated
      using (auth.uid() = user_id)
      with check (
        auth.uid() = user_id
        and status in ('joined', 'left')
      );
  end if;
end $$;

-- DELETE: 自分の参加だけ取り消し可能
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'village_post_participants'
      and policyname = 'village_post_participants_delete_self'
  ) then
    create policy village_post_participants_delete_self
      on public.village_post_participants
      for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;


-- =====================================================================
-- 実行後の検証 SQL (任意・実行前確認用)
-- =====================================================================
-- 以下を SQL Editor で実行すると、追加が正しく入っているか確認できる。
-- ※ migration 本体ではないのでコメントアウトしている。
--
--   select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--   where table_schema='public' and table_name='village_posts'
--     and column_name in ('is_recruitment','recruitment_type','max_participants',
--                         'current_participants_count','recruitment_status',
--                         'voice_enabled','beginner_friendly','play_style')
--   order by column_name;
--
--   select count(*) as total, count(*) filter (where is_recruitment) as recruitment_rows
--   from public.village_posts;
--
--   select policyname, cmd, qual, with_check
--   from pg_policies
--   where tablename = 'village_post_participants';
--
-- =====================================================================
