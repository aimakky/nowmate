# プロフィール画面バグ修正 — 実機検証チェックリスト

対象 commit: `5ede609`
対象バグ:
- バグ1: マイページ「フォロー中 / フォロワー」を押しても一覧が出ない
- バグ2: 他人プロフィール (例: ミヤさん) の投稿数 6 に対し一覧が空、「6件中5件を表示」のみ

このドキュメントは、修正後の本番に対してマッキーさんが実機で動作確認するための手順書。
バグが残っている場合に、原因を切り分けて Claude Code に共有するためのテンプレートも含む。

---

## 1. 検証前の準備

### 1.1 デプロイ反映の確認
- Vercel ダッシュボードで `5ede609` (または以降の commit) が production にデプロイ済みか確認
- 反映前ならビルドが終わるまで待つ (通常 1〜3 分)

### 1.2 キャッシュクリア (重要)
古い JS が残っていると修正前の挙動に見えるため、必ず実施:
- iPhone Safari: 設定 → Safari → 履歴と Web サイトデータを消去
- iPhone Chrome: 設定 → プライバシー → 閲覧履歴データの削除
- PWA インストール済みなら一度アンインストール → 再インストール

---

## 2. バグ1 検証 — マイページのフォロー切替

前提: マッキーさんのアカウント
- フォロー中: 1 人 (前ターン画像から)
- フォロワー: 1 人 (前ターン画像から)

### 2.1 操作手順
1. ログイン後、`/mypage` を開く
2. ページ最上部の統計カード「フォロー中 1」をタップ
3. 期待: ユーザーカード 1 件が下に表示される
4. 続けて「フォロワー 1」をタップ
5. 期待: ユーザーカード 1 件が下に表示される
6. 表示されたユーザーカードをタップ
7. 期待: そのユーザーのプロフィール画面 (`/profile/[userId]`) に遷移する

### 2.2 結果パターン

- **「ユーザー名 + アバター」がちゃんと出る** → 完全修正成功。次はバグ2 検証へ。
- **「名無し」「アバターなし」のプレースホルダーが出る** → ids は取れているが、profiles の SELECT が制限されている (RLS が原因の可能性大)。Console ログ取得に進む。
- **まだ「まだフォロー中のユーザーはいません」のまま** → ids すら取れていない。Console ログ取得に進む。
- **タブを押しても何も切り替わらない** → JS 自体が古いキャッシュ。1.2 のキャッシュクリアからやり直し。

---

## 3. バグ2 検証 — 他人プロフィールの投稿一覧 (ミヤさん)

前提: ミヤさんのプロフィール
- 投稿数: 6 (前ターン画像から)

### 3.1 操作手順
1. ミヤさんのプロフィールを開く (フォロー中一覧 / 検索 / 直 URL いずれでも可)
2. プロフィールヘッダーの「投稿」数値が 6 (もしくは 6 以上) か確認
3. デフォルトで選択されている「投稿」タブを確認
4. 期待: 投稿カードが最大 5 件並ぶ
5. 期待: `postCount > 5` のときは右上に「6件中5件を表示」が出る
6. 各カードに以下のいずれかが表示されているか確認
   - 村アイコン + 村名 (村投稿)
   - 「つぶやき」ラベル (tweet)

### 3.2 結果パターン

- **投稿カード 5 件が並ぶ + ラベル正常** → 完全修正成功。検証完了。
- **「まだ投稿がありません」のまま** → tweets / village_posts ともに空配列で取得。Console ログ取得に進む。
- **投稿数が 0 になっている** → count 取得自体が失敗。RLS 確認手順へ。
- **投稿数は出るがカードが 0 件** → 修正前と同じ症状。Console ログ取得に進む。

---

## 4. Console ログの取得方法

### 4.1 方法 A — iPhone Safari + Mac Web Inspector (推奨)

必要なもの:
- Mac (macOS Big Sur 以降推奨)
- iPhone と Mac を Lightning / USB-C ケーブルで接続

セットアップ:
1. iPhone: 設定 → Safari → 詳細 → Web インスペクタ をオン
2. Mac: Safari メニュー → 設定 → 詳細 → 「メニューバーに開発を表示」をオン
3. iPhone と Mac をケーブル接続 (信頼するか聞かれたら信頼)

ログ取得:
1. iPhone で nowmatejapan.com を開く
2. Mac の Safari メニュー: 開発 → [iPhone 名] → nowmatejapan.com を選択
3. Web Inspector が開く → コンソールタブを表示
4. iPhone でフォロー中ボタン / 他人プロフィールを操作
5. Console に出ているメッセージをすべてコピー

### 4.2 方法 B — Eruda ブックマークレット (Mac なし)

Mac が無い / 出先で簡易確認したい場合。本番アプリへの埋め込みは行わず、マッキーさんの Safari 上だけで動く。

セットアップ (1 回のみ):
1. iPhone Safari で適当なページをブックマーク
2. ブックマークを編集して URL を以下に書き換え:

```
javascript:(function(){var s=document.createElement('script');s.src='//cdn.jsdelivr.net/npm/eruda';document.body.appendChild(s);s.onload=function(){eruda.init();};})();
```

3. ブックマーク名を「DevTools」等にして保存

使い方:
1. nowmatejapan.com を Safari で開く
2. アドレスバーから「DevTools」ブックマークをタップ
3. 画面右下に DevTools アイコンが出る → タップして Console タブを開く
4. 操作してログを取得

注意点:
- ブックマークレットは URL バーへの直打ちでは Safari の制限で動かない場合がある。必ずブックマーク経由で起動
- マッキーさん個人の Safari でしか動かない (他のユーザーには影響しない)

---

## 5. 想定エラーパターンと対応

### 5.1 `[mypage] loadFollowList user_follows error:` が出る
- 意味: user_follows テーブルへの SELECT が RLS で拒否
- 通常起きない (count はその前で取れているはず)
- 出たら error.code と error.message を共有 → RLS ポリシー確認へ

### 5.2 `[mypage] follow profiles fetch error:` が出る
- 意味: profiles の SELECT が部分的に拒否されている
- ids には UUID が入っているか確認 (同じログ行に `{ ids }` も出る)
- このパターンだと「名無し」プレースホルダーが画面に出る
- profiles の RLS で「他人の profile が SELECT 可能か」確認 SQL を実行 (下記)

### 5.3 `[profile/userId] village_posts fetch error:` が出る
- 意味: village_posts の SELECT が失敗
- error.message を共有
- relation ambiguity の場合は select をさらに minimal に
- RLS の場合は他人 village_posts の SELECT 権限を確認

### 5.4 `[profile/userId] tweets fetch error:` が出る
- 意味: tweets の SELECT が失敗
- 同様に error.message を共有

### 5.5 `[profile/userId] villages fetch error:` が出る
- 意味: village_id から村情報を引く query が失敗
- 投稿カードの「村アイコン + 村名」が出ないだけで、投稿本文は表示されるはず
- error.message を共有

### 5.6 Console に何もエラーが出ないが一覧が空
- 意味: query は成功して 0 件が返ってきている
- 該当ユーザーが本当にフォロー / 投稿しているか SQL で直接確認 (下記)
- count と data は別 query なので、片方が古い / もう片方が新しいというキャッシュずれの可能性も

---

## 6. RLS / データ確認用 SQL (Supabase SQL Editor)

DB 変更は勝手に実行しない方針。**確認用 SELECT のみ**:

```sql
-- 1. user_follows の RLS ポリシー
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_follows';

-- 2. profiles の RLS ポリシー
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 3. village_posts / tweets の RLS ポリシー
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('village_posts', 'tweets');

-- 4. マッキーさん自身のフォロー関係を直接確認
--    <MY_UUID> はマッキーさんの auth.users.id
SELECT uf.follower_id, uf.following_id, p.display_name AS target_name
FROM user_follows uf
LEFT JOIN profiles p ON p.id = uf.following_id
WHERE uf.follower_id = '<MY_UUID>';

-- 5. ミヤさんの投稿を直接確認
--    <MIYA_UUID> はミヤさんの auth.users.id
SELECT 'village_post' AS kind, id, content, created_at FROM village_posts WHERE user_id = '<MIYA_UUID>'
UNION ALL
SELECT 'tweet', id, content, created_at FROM tweets WHERE user_id = '<MIYA_UUID>'
ORDER BY created_at DESC;
```

各クエリの結果を Claude Code に共有すれば、ピンポイントで RLS 緩和案 / コード修正案を出せる。

---

## 7. 検証結果報告テンプレート

実機検証が終わったら、以下を埋めて Claude Code に貼ってください:

```
【バグ1 検証結果】
- フォロー中タブ: [完全表示 / 名無し / 空のまま / その他]
- フォロワータブ: [完全表示 / 名無し / 空のまま / その他]
- Console エラーログ:
  (あれば貼る、なければ「なし」)

【バグ2 検証結果】
- ミヤさんプロフィール 投稿数表示: [6 / 6 以外: ___]
- 投稿カード表示数: [5 / 5 未満: ___]
- カードラベル: [村アイコン+村名 / つぶやき / 出ない]
- Console エラーログ:
  (あれば貼る、なければ「なし」)

【その他気付き】
- (デザイン崩れ / レスポンス遅延 / 別の画面の影響など)
```

このテンプレートを基に、追加の調査 / 修正方針を判断する。

---

## 8. 検証で OK だった場合の次アクション

両バグとも完全表示なら、次は以下のいずれかへ進める:

- **B**: マイページの「投稿」タブも他人プロフィールと同じ統合表示 (village + tweet) に揃える
- **C**: signup ページのテーマ刷新 / Search Console 再クロール依頼の手順 / LiveKit room name の `samee-voice-*` → `yvoice-voice-*` リネーム etc

検証で部分修正止まり (プレースホルダーが出た等) なら、本ドキュメント 6 の SQL で RLS / データを確認してから、次の修正サイクルへ。
