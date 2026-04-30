-- =====================================================================
-- 005_security_hardening
-- 本番監査で発見された Critical 問題の修正:
--   1. admin_* RPC が anon/authenticated 両方から呼び出し可能 → revoke
--   2. SECURITY DEFINER RPC を全て anon から revoke
--   3. SECURITY DEFINER view (user_premium_status, raised_hands) → security_invoker=true
--   4. qa_helpful_votes に RLS 未設定 → enable + policy
--   5. feedback / invites に SELECT/UPDATE が public で qual=true → 自分の行のみに制限
-- =====================================================================

-- ──────────────────────────────────────────────
-- 1. admin_* 関数を anon/authenticated から完全 REVOKE
-- ──────────────────────────────────────────────
do $$
declare
  fn record;
begin
  for fn in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'admin\_%' escape '\'
  loop
    execute format('revoke execute on function public.%I(%s) from public, anon, authenticated',
                   fn.proname, fn.args);
  end loop;
end $$;

-- ──────────────────────────────────────────────
-- 2. その他の SECURITY DEFINER 関数を anon から REVOKE
--    （authenticated は維持。ログインユーザーが必要に応じて呼び出せる前提の RPC のため）
-- ──────────────────────────────────────────────
do $$
declare
  fn record;
begin
  for fn in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef = true                       -- SECURITY DEFINER のみ
      and p.proname not like 'admin\_%' escape '\' -- admin は上で処理済
  loop
    execute format('revoke execute on function public.%I(%s) from anon',
                   fn.proname, fn.args);
  end loop;
end $$;

-- ──────────────────────────────────────────────
-- 3. SECURITY DEFINER view を security_invoker に変更
--    （Postgres 15+。view の RLS バイパスを防ぐ）
-- ──────────────────────────────────────────────
alter view if exists public.user_premium_status set (security_invoker = true);
alter view if exists public.raised_hands         set (security_invoker = true);

-- ──────────────────────────────────────────────
-- 4. qa_helpful_votes — RLS を有効化
-- ──────────────────────────────────────────────
alter table if exists public.qa_helpful_votes enable row level security;

drop policy if exists qa_votes_read on public.qa_helpful_votes;
create policy qa_votes_read on public.qa_helpful_votes
  for select to authenticated using (true);

drop policy if exists qa_votes_insert_self on public.qa_helpful_votes;
create policy qa_votes_insert_self on public.qa_helpful_votes
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists qa_votes_delete_self on public.qa_helpful_votes;
create policy qa_votes_delete_self on public.qa_helpful_votes
  for delete to authenticated using (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 5. feedback の漏れ穴ポリシー修正
--    旧: SELECT/UPDATE public + qual=true（誰でも他人の feedback を更新可能）
--    新: SELECT は自分の feedback のみ、UPDATE は service_role のみ
-- ──────────────────────────────────────────────
drop policy if exists "Anyone can read feedback" on public.feedback;
drop policy if exists "Admin can update feedback" on public.feedback;

drop policy if exists feedback_select_self on public.feedback;
create policy feedback_select_self on public.feedback
  for select to authenticated using (auth.uid() = user_id);

-- UPDATE/DELETE は許可しない（service_role は RLS バイパスするので別途 OK）
-- ── INSERT は既存の "Users can insert feedback" を維持 ──

-- ──────────────────────────────────────────────
-- 6. invites の漏れ穴ポリシー修正
--    旧: SELECT/UPDATE public + qual=true（招待履歴が全員に見える、reward を任意改変可能）
--    新: SELECT は自分が関与する招待のみ、UPDATE は service_role のみ
-- ──────────────────────────────────────────────
drop policy if exists "Users can read own invites" on public.invites;
drop policy if exists "Service can update invites" on public.invites;

drop policy if exists invites_select_involved on public.invites;
create policy invites_select_involved on public.invites
  for select to authenticated using (
    -- 自分が招待された側
    auth.uid() = invitee_id
    -- もしくは自分が招待した側（nowjp_id が自分の profile に紐づく）
    or inviter_nowjp_id in (
      select nowjp_id from public.profiles where id = auth.uid()
    )
  );

-- UPDATE は許可しない
-- INSERT は既存の "Anyone can insert invite" を維持（新規登録時に必要なケースあり）
