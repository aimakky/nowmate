# グループ通話への明示的なフレンド招待 — 設計案

現状: /group ページでグループ通話を作成できるが、特定のフレンドを「呼ぶ」UI がない。
作成後に URL を共有 / FriendAvatarRail から眺めるだけ。
ゴール: 作成時 (もしくは作成後) にフレンドを複数選択して招待を送り、受信側に通知が届く。

このドキュメントは **マッキーさん判断のための設計提案** であり、コード実装は未。
案 A / B / C のどれを採用するか決まり次第、次の Claude Code セッションで実装する。

---

## 既存スキーマと仕様の整理

### 関連テーブル
- `voice_rooms`: id / host_id / title / room_type / status / created_at 等
  (現状の room_type 値: `open_voice_room` / `group_voice_room`)
- `voice_participants`: room_id / user_id / role / is_listener / join_mode
- `notifications`: id / user_id / type (text) / actor_id / target_id / target_type
  / is_read / priority / created_at
- `user_follows`: follower_id / following_id (= フレンド定義)

### 既存 notifications の type 列に存在する値 (app/(app)/notifications/page.tsx より)
- like / reply / follow / comment / bottle_reply / new_member_post /
  voice_room_started / tier_up / bottle_found
- `type` は text カラム (enum 制約なし) なので **新値を追加するだけで使える**
- 通知タブの TYPE_CONFIG に新値ごとの emoji / label / section を追加すれば
  既存 UI で受信側に表示される

### 既存 Realtime 利用箇所
- /voice/[roomId] 内で voice_participants の postgres_changes を購読
- /group ページで voice_rooms / voice_participants の postgres_changes を購読
  (debounce 900ms)

---

## 案 A. notifications テーブル拡張 (DB 変更なし、推奨)

### 概要
- 招待時に notifications テーブルへ各招待先 1 行ずつ insert
- type: `'group_invited'` (新規追加。text カラムなので DB 変更不要)
- target_id: 招待された voice_room の id
- target_type: `'voice_room'`
- actor_id: 招待を送ったユーザー (= グループ通話の host)
- 受信側は通知タブ (/notifications) で受け取り、タップで /voice/{room_id} へ

### Pros
- DB 変更ゼロ (text カラムに新値を入れるだけ)
- 既存 notifications UI / 既読化ロジック / バッジカウント (未読数) が自動で動く
- 受信側に「履歴が残る」(オフライン時に来た招待も後から見える)
- BottomNav の「通知」タブに自然に統合

### Cons
- 招待固有の状態 (declined / expired / accepted) を持てない
  → ただし「通知」は元々「お知らせ」のため、招待状態管理が必要なら voice_participants
   の有無で代用可能 (= 招待された人が ルームに参加 = accepted、参加せず時間経過 = expired
   とみなす)
- type 列に「通知」と「アクション系」が混在する命名上の不整合
  (既存の voice_room_started 等も「アクション通知」なので大差なし)

### 実装範囲
1. /group の作成シート (CreateSheet) に「フレンドを招待 (任意)」セクション追加
   - FriendAvatarRail と同じデータソース (= user_follows 経由のフォロー中ユーザー)
   - 複数選択可能なチェックボックス + アバター + 名前
   - 上限: 例えば 20 人まで
2. handleCreate() で voice_rooms insert + voice_participants insert (host) の後、
   選択された friend ids ごとに notifications を bulk insert
3. /notifications 側で TYPE_CONFIG に group_invited を追加
   ```ts
   group_invited: { emoji: '🎙️', label: 'グループ通話に誘われています',
                    section: 'voice' }
   ```
4. handleTap で type === 'group_invited' の場合 router.push(`/voice/${target_id}`)

### 必要な変更ファイル (DB 変更なし)
- app/(app)/group/page.tsx (CreateSheet にフレンド選択 UI + bulk insert)
- app/(app)/notifications/page.tsx (TYPE_CONFIG + handleTap 拡張)
- 推定: +120 行 / 新規ファイルなし

### 必要な SQL (実行不要、参考)
```sql
-- 案 A は DB 変更不要。コード側で notifications.insert を多重書きするだけ。
-- 念のため、insert 例:
INSERT INTO notifications (user_id, type, actor_id, target_id, target_type, priority)
VALUES
  ('<friend1_uuid>', 'group_invited', '<host_uuid>', '<room_uuid>', 'voice_room', 'high'),
  ('<friend2_uuid>', 'group_invited', '<host_uuid>', '<room_uuid>', 'voice_room', 'high');
```

### 推奨度: ★★★ (最有力)

---

## 案 B. 新規 group_call_invitations テーブル

### 概要
- 招待を専用テーブルで管理
- 状態を持つ: pending / accepted / declined / expired
- 招待 1 件 = 1 行、複数フレンドへの招待は複数行

### Pros
- 招待固有の状態 (declined / expired) を厳密に管理できる
- 既存 notifications と分離できるので「招待」と「通知」の概念が混ざらない
- 拡張余地が大きい (招待文言 / 有効期限 / 招待 ID への返信 / etc)

### Cons
- DB 変更が必要 (新規テーブル + RLS ポリシー)
- マッキーさん判断の SQL 実行が必要
- 通知タブとの統合に追加 UI 実装が必要 (= 受信側が「招待タブ」みたいな別場所を
  見ないと気付かない、もしくは通知側で別 query を merge する必要)

### 必要な SQL (マッキーさん判断で実行)
```sql
-- 1. テーブル作成
CREATE TABLE public.group_call_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES public.voice_rooms(id) ON DELETE CASCADE,
  inviter_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 minutes'),
  UNIQUE (room_id, invitee_id)
);

CREATE INDEX idx_group_invitations_invitee ON public.group_call_invitations
  (invitee_id, status, created_at DESC);
CREATE INDEX idx_group_invitations_room ON public.group_call_invitations(room_id);

-- 2. RLS 有効化
ALTER TABLE public.group_call_invitations ENABLE ROW LEVEL SECURITY;

-- 3. ポリシー: 招待者 / 被招待者は自分が関わる行を SELECT 可能
CREATE POLICY group_invite_select ON public.group_call_invitations
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- 4. ポリシー: 認証ユーザーは自分を inviter とした招待のみ INSERT 可能
CREATE POLICY group_invite_insert ON public.group_call_invitations
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

-- 5. ポリシー: 被招待者のみが自分宛の status を UPDATE 可能
CREATE POLICY group_invite_update ON public.group_call_invitations
  FOR UPDATE USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);
```

### 実装範囲
- 上記 SQL を Supabase SQL Editor で実行 (マッキーさん判断)
- /group の作成シートにフレンド選択 + insert
- /notifications または新規 /invitations ページで pending 招待を一覧表示
- 「参加する」「断る」ボタンで status を update + 参加時は voice_participants insert

### 推奨度: ★★ (招待状態を厳密に管理したい場合)

---

## 案 C. Realtime Broadcast のみ (DB 変更なし)

### 概要
- Supabase Realtime のチャンネル broadcast で招待を送る
- 受信側がオンラインで該当チャンネルを購読していれば即時に届く
- DB には何も書かない

### Pros
- DB 変更なし、テーブル追加なし
- 即時性が最も高い
- 履歴を意図的に残さない設計が「ゲーム仲間と今すぐ話す」に合致

### Cons
- 受信側がオフラインだと招待が届かない (履歴なし)
- 通知タブに残らないので、ユーザーが通知を後から確認できない
- 招待者には「届いたか」のフィードバックが弱い (送ったが受信側がオフラインだった
  かは分からない)
- 全員が AppLayout で常時購読する必要があり、不要なリアルタイム接続を増やす

### 実装範囲
- 招待チャンネル (例: `invitations:user-<uuid>`) を AppLayout で購読
- 招待時にチャンネルへ broadcast 送信
- 受信側で toast 表示 + 「参加する」ボタン

### 推奨度: ★ (履歴ゼロ前提なら有効、現状の YVOICE には不向き)

---

## 推奨

**案 A (notifications 拡張)** を推奨。
理由:
1. DB 変更ゼロで実現できる
2. 既存の通知タブ UI / バッジカウント / 既読化が自動で動く
3. 受信側がオフラインでも履歴として残る
4. ロールバックが容易 (次回 type=`group_invited` の表示を消すだけ)

**追加で案 C をおまけ実装するのもアリ**:
- 受信側がオンライン中なら即時 toast、オフライン中なら通知タブで後から気付く
  という二段構え
- ただし複雑度が上がるので、まずは案 A 単独で運用し、必要になったら追加

**案 B は将来オプション**:
- 「30 分で expire」「招待への返信機能」など状態管理が要るようになってから検討

---

## マッキーさんへの確認

以下を選んで Claude Code に共有してください:

1. **案 A で実装** (推奨、DB 変更なし)
2. **案 A + 案 C** (案 A をベースに Realtime も加える、二段構え)
3. **案 B で実装** (新規テーブル + RLS、マッキーさんが SQL を実行する形で進める)
4. **やっぱり保留** (招待 UI は不要、現状の URL 共有運用で OK)
5. **設計を見直したい** (このドキュメントへのフィードバック → 別案を検討)

選択後、次の Claude Code セッションで:
- 1 / 2 を選んだ場合: コード実装に着手 (DB 変更なし)
- 3 を選んだ場合: 上記 SQL を Supabase SQL Editor で実行する手順を
  ドキュメント化 → マッキーさんが実行 → 結果共有 → コード実装
- 4 を選んだ場合: 別タスクへ
- 5 を選んだ場合: フィードバックを反映して再提案
