-- 安心ガイド（ルールブック）機能
--
-- 設計方針:
--  - rules テーブルで全ルールを一元管理（CRUD はコード直書き禁止）
--  - user_rule_agreements で同意ステータスとバージョンを記録
--  - version をルール側で管理し、上がったら再同意フラグが立つ
--  - display_locations は配列で複数面に出し分け
--  - RLS は read = 全員、write = service_role のみ（管理画面前提）

create table if not exists public.rules (
  id            text primary key,
  title         text not null,
  description   text not null,
  short_label   text not null,
  category      text not null check (category in ('critical','voice','community','safety','system')),
  importance    int  not null default 3 check (importance between 1 and 5),
  display_locations text[] not null default '{}',
  enabled       boolean not null default true,
  "order"       int not null default 0,
  icon          text not null default 'shield',
  color         text not null default '#8B5CF6',
  version       int not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists rules_enabled_order_idx on public.rules (enabled, importance desc, "order" asc);
create index if not exists rules_category_idx on public.rules (category);

create table if not exists public.user_rule_agreements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  agreed_version int  not null,
  agreed_at      timestamptz not null default now(),
  primary key (user_id)
);

-- グローバルなルールブック総合バージョン（個別ルール version の最大値より大きく管理可能）
create table if not exists public.rules_meta (
  singleton    boolean primary key default true,
  bundle_version int not null default 1,
  updated_at   timestamptz not null default now(),
  constraint singleton_row check (singleton)
);

insert into public.rules_meta (singleton, bundle_version) values (true, 1)
  on conflict (singleton) do nothing;

-- RLS
alter table public.rules                 enable row level security;
alter table public.user_rule_agreements  enable row level security;
alter table public.rules_meta            enable row level security;

-- rules: 全認証ユーザーが read 可能（enabled=true のみ意識する側で対応）
drop policy if exists rules_read on public.rules;
create policy rules_read on public.rules
  for select using (true);

-- user_rule_agreements: 自分の行のみ R/W
drop policy if exists ura_select_self on public.user_rule_agreements;
create policy ura_select_self on public.user_rule_agreements
  for select using (auth.uid() = user_id);

drop policy if exists ura_upsert_self on public.user_rule_agreements;
create policy ura_upsert_self on public.user_rule_agreements
  for insert with check (auth.uid() = user_id);

drop policy if exists ura_update_self on public.user_rule_agreements;
create policy ura_update_self on public.user_rule_agreements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists rmeta_read on public.rules_meta;
create policy rmeta_read on public.rules_meta
  for select using (true);

-- updated_at trigger
create or replace function public.touch_rules_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_rules_touch on public.rules;
create trigger trg_rules_touch before update on public.rules
  for each row execute function public.touch_rules_updated_at();

-- =========================================================================
-- 初期シードデータ（コードベースから抽出した実在ルール）
-- =========================================================================

insert into public.rules (id, title, description, short_label, category, importance, display_locations, "order", icon, color, version) values
  -- critical（最重要・全面に出す）
  ('age_20_only',
   '20歳以上限定',
   'sameeは20歳以上のみが利用できます。年齢を偽った登録は利用停止の対象になります。',
   '20歳+',
   'critical', 5, '{onboarding,mypage,voiceModal}', 10, 'shield-check', '#F97316', 1),

  ('id_verification_required',
   '本人確認は必須',
   '通話・DMを使うには本人確認（運転免許・マイナンバー・パスポート）が必要です。書類画像はサーバーに保存されません。',
   '本人確認',
   'critical', 5, '{onboarding,mypage,voiceModal}', 20, 'id-card', '#F97316', 1),

  ('respect_only',
   '誹謗中傷・ハラスメントは即時対応',
   '攻撃的な発言・差別・嫌がらせを検知した場合、投稿の非表示・利用停止になります。',
   '攻撃NG',
   'critical', 5, '{onboarding,mypage,voiceModal}', 30, 'alert-octagon', '#F97316', 1),

  -- voice
  ('voice_age_verified_only',
   'マイク発言は年齢確認済みのみ',
   '通話で声を出すには年齢確認の完了が必要です。未確認のままでは聞き専でも入れない部屋があります。',
   'マイク=確認済',
   'voice', 5, '{voiceModal,mypage}', 40, 'mic', '#3B82F6', 1),

  ('voice_room_levels',
   '部屋ごとに3段階のアクセス',
   'Open（確認済のみ）／Friend（招待で聞き専可）／Circle（部屋設定で可変）。入る前にアイコンで確認できます。',
   '部屋レベル',
   'voice', 4, '{voiceModal,mypage}', 50, 'door-open', '#3B82F6', 1),

  ('voice_create_verified',
   '通話ルーム作成は確認済のみ',
   '通話ルームを新しく立てるには年齢確認済みであることが必要です。',
   'ルーム作成',
   'voice', 3, '{voiceModal,mypage}', 60, 'plus-circle', '#3B82F6', 1),

  ('voice_recording_off',
   '通話の録音・録画は禁止',
   'sameeでの通話を録音・録画・スクショして外部に共有することは禁止されています。',
   '録音NG',
   'voice', 5, '{voiceModal,mypage}', 70, 'mic-off', '#3B82F6', 1),

  -- community
  ('trust_tier_unlocks',
   '使い込むほど機能が開く',
   '見習い→住民→常連→信頼の住民→村の柱。投稿・通話・村作成は段階的に解放されます。',
   'Tier解放',
   'community', 4, '{onboarding,mypage}', 80, 'sparkles', '#10B981', 1),

  ('trust_score_events',
   '信頼スコアで評価される',
   '電話認証・初投稿・通話参加・新人への返信などで加点。通報・ブロックで減点されます。',
   'スコア',
   'community', 3, '{mypage}', 90, 'gauge', '#10B981', 1),

  ('village_create_tier3',
   '村の作成は信頼の住民から',
   '新しい村（コミュニティ）を作るには信頼の住民（Tier3）以上が必要です。',
   '村作成',
   'community', 3, '{mypage}', 100, 'home-plus', '#10B981', 1),

  ('post_tier1',
   '投稿は住民から',
   '見習い（Tier0）は閲覧のみ。電話認証＋初投稿で住民に上がると発言できるようになります。',
   '投稿条件',
   'community', 3, '{onboarding,mypage}', 110, 'edit', '#10B981', 1),

  ('qa_post_tier2',
   'Q&Aの相談投稿は常連から',
   '相談を投げるには常連（Tier2）以上、回答は住民（Tier1）以上から可能です。',
   'Q&A条件',
   'community', 2, '{mypage}', 120, 'help-circle', '#10B981', 1),

  ('like_daily_10',
   '無料いいねは1日10回',
   '無料プランでは1日10回までいいねできます。プレミアムは無制限。',
   'いいね10/日',
   'community', 2, '{mypage}', 130, 'heart', '#10B981', 1),

  ('bottle_daily_3',
   '匿名ボトルは1日3通',
   '漂流ボトル（匿名投稿）は1日3通までです。',
   'ボトル3/日',
   'community', 1, '{mypage}', 140, 'bottle', '#10B981', 1),

  -- safety
  ('report_one_per_target',
   '通報は1人につき1回有効',
   '同じ相手への重複通報はカウントされません。冷静に最初の1回でしっかり書いてください。',
   '通報',
   'safety', 4, '{mypage,voiceModal}', 150, 'flag', '#EF4444', 1),

  ('block_isolates',
   'ブロックでDM・閲覧を遮断',
   'ブロックすると相手はあなたへDM送信・プロフィール閲覧ができなくなります。',
   'ブロック',
   'safety', 4, '{mypage}', 160, 'user-x', '#EF4444', 1),

  ('shadow_ban_auto',
   '通報多発で自動非表示',
   '繰り返し通報されると、本人気付かぬまま投稿が他ユーザーへ非表示になります。',
   '自動制限',
   'safety', 3, '{mypage}', 170, 'eye-off', '#EF4444', 1),

  ('crisis_keyword_help',
   '危機ワード検知でサポート表示',
   '「死にたい」など緊急性の高い言葉を検知すると、相談窓口リンクが投稿前に表示されます。',
   '緊急サポート',
   'safety', 4, '{onboarding,mypage}', 180, 'life-buoy', '#EF4444', 1),

  ('ng_words_filter',
   '誹謗・営業・連絡先要求は自動弾く',
   '誹謗中傷・宣伝勧誘・LINE等の連絡先交換要求は自動検出され、送信前にブロックされます。',
   'NGワード',
   'safety', 3, '{mypage}', 190, 'shield-x', '#EF4444', 1),

  ('dm_privacy_settings',
   'DM受信は4段階で選べる',
   '全員／同じ村のみ／Tier3以上／全員リクエスト の4段階。設定で安全度を選べます。',
   'DM設定',
   'safety', 3, '{mypage}', 200, 'message-square', '#EF4444', 1),

  ('one_to_one_call_both_verified',
   '1対1通話は両者確認済',
   '1対1通話は発信者・受信者の両方が年齢確認済みである必要があります。',
   '1on1通話',
   'safety', 3, '{voiceModal,mypage}', 210, 'phone', '#EF4444', 1),

  -- system
  ('no_personal_info',
   '個人情報の交換は自己責任',
   '本名・住所・電話番号・職場名などはアプリ外で交換しないでください。詐欺・ストーカー被害の温床です。',
   '個人情報',
   'system', 3, '{onboarding,mypage}', 220, 'eye', '#94A3B8', 1),

  ('no_commercial',
   '営業・宣伝・勧誘は禁止',
   'MLM・副業勧誘・宗教勧誘・出会い目的の連絡先誘導は利用停止対象です。',
   '営業NG',
   'system', 3, '{mypage}', 230, 'ban', '#94A3B8', 1)
on conflict (id) do update set
  title             = excluded.title,
  description       = excluded.description,
  short_label       = excluded.short_label,
  category          = excluded.category,
  importance        = excluded.importance,
  display_locations = excluded.display_locations,
  "order"           = excluded."order",
  icon              = excluded.icon,
  color             = excluded.color,
  version           = excluded.version,
  enabled           = true;
