# フレンド導線リニューアル — 実機検証チェックリスト

対象 commit: `dd115ef` (および前提 commit `b609d60`)
対象機能:
- 下部ナビ刷新 (フレンド → グループ)
- FriendAvatarRail (全ページ上部の横スクロール)
- /users の「あなたのフレンド」セクション
- 最終ログイン時間 (lastSeenLabelJP) の表示

このドキュメントは、上記の機能群がマッキーさんの iPhone 実機で
意図通りに動くかを順番に確認するための手順書。
不具合があった場合に Claude Code に共有するためのテンプレートも含む。

---

## 1. 検証前の準備

### 1.1 デプロイ反映の確認
- Vercel ダッシュボードで `dd115ef` (または以降の commit) が production
  にデプロイされているか確認
- 反映前ならビルドが終わるまで待つ (通常 1〜3 分)

### 1.2 キャッシュクリア (必須)
古い JS / CSS / OG 画像が残っていると修正前の状態に見える:
- iPhone Safari: 設定 → Safari → 履歴と Web サイトデータを消去
- iPhone Chrome: 設定 → プライバシー → 閲覧履歴データの削除
- PWA としてインストール済みの場合は一度アンインストール → 再インストール

### 1.3 動作確認用のフレンド準備
意味のある検証のため、以下が望ましい:
- 自分が follow しているユーザー: 1 人以上 (オフラインで構わない)
- 自分が follow している、5 分以内に最終ログインしているユーザー: 1 人以上
- 上記がいない場合は別アカウントで /mypage を開いてもらい last_seen_at
  を更新してもらってから本端末に戻る

---

## 2. 下部ナビ刷新の確認

### 2.1 操作手順
1. ログイン後、TL (`/timeline`) を開く
2. 画面下部のナビバーを目視
3. 左から順に以下のアイコンと文言が並んでいるか確認
   - TL (緑、Layers)
   - グループ (シアン、Users2 = 複数人アイコン)
   - ゲーム村 (紫、Gamepad2、LIVE バッジ)
   - チャット (ピンク、MessageSquare)
   - 通知 (黄、Bell)
4. 「グループ」をタップ
5. `/group` ページへ遷移するか確認
6. 戻って /timeline へ。ナビバーが古いキャッシュで「フレンド」のままに
   なっていないか確認 (古ければ 1.2 のキャッシュクリアからやり直し)

### 2.2 結果パターン
- 「グループ」タブが出ている、押すと /group が開く → OK
- 「フレンド」のまま → キャッシュクリア未完了。1.2 やり直し
- 「グループ」タブが出ているが押しても遷移しない → コード側の問題。
  Console エラーを 5. の手順で取得

---

## 3. FriendAvatarRail (横スクロール) の確認

### 3.1 表示されるべきページ (whitelist)
- TL (`/timeline`)
- グループ (`/group`)
- ゲーム村 (`/guild`)
- チャット (`/chat`、一覧ページ)
- 通知 (`/notifications`)
- プロフィール (`/mypage`)

各ページを順に開き、最上部にフレンドアイコンの横スクロールバーが
出ていることを確認する。

### 3.2 表示されないべきページ
- ログイン前 LP (`/`)
- ログイン (`/login`) / 登録 (`/signup`)
- /onboarding 配下
- /verify-age, /verify-age/complete
- /chat/[matchId] (1:1 トーク詳細)
- /voice/[roomId] (通話中)
- /villages/[id], /guilds/[id] (詳細)
- /profile/[userId] (他人プロフィール)
- /settings, /search 等

→ 出ていたら whitelist の漏れ。出ていない場合は OK。

### 3.3 表示要素のチェック (フレンドが 1 人以上いる場合)
- 各フレンドの円形アバター
- アバター下に名前 (1 行 / 2 行)
- 名前の下にステータス
  - オンライン中: 緑文字で「オンライン中」
  - オフライン: 灰文字で「5分前」「3時間前」「2日前」「1週間前」
    「2ヶ月前」「3年前」のいずれか
  - last_seen_at が無い: 空文字で行は確保される (= レイアウトが崩れない)
- オンライン中のアバターは緑のリング + 緑グロー
- 右下に小さなステータスドット (オンライン: 緑、オフライン: 灰)
- 横スクロールが指で動かせる
- 右端に「もっと見る」セル (紫 + 矢印アイコン)

### 3.4 結果パターン
- 上記すべてが揃っている → OK
- フレンドはいるはずなのに横スクロール自体が出ない → ids 取得失敗。
  Console で `[FriendRail]` を確認 (5. の手順)
- アバターは出るが名前が「名無し」になる人がいる → profiles の RLS で
  該当ユーザーの SELECT が通っていない。Console には `[FriendRail]
  profiles fetch error:` または partial 取得のログが出るはず
- ステータス行が「オンライン中」でも「N分前」でもなく空っぽ →
  last_seen_at が null。データ側の問題、コードは正しく分岐している
- グローが眩しすぎる / 暗すぎる → 色味の調整希望として Claude Code に
  伝える (rgba の opacity 値で調整可能)

### 3.5 タップ動作
- フレンドのアバターをタップ → そのユーザーの `/profile/[userId]` へ
  遷移
- 「もっと見る」をタップ → `/users` へ遷移

---

## 4. /users ページの「あなたのフレンド」セクション

### 4.1 操作手順
1. FriendAvatarRail の右端「もっと見る」を押すか、`/users` を直接開く
2. 検索ボックスは空のまま、ページ上部を確認

### 4.2 表示要素のチェック
- ページ上部に「あなたのフレンド (N)」セクション
  - N = 自分が follow している人数
- 各フレンドカード
  - 左にアバター (オンラインなら緑のリング + 緑グロー)
  - 真下に小さなステータスドット
  - 中央に名前 + VerifiedBadge (本人確認済みなら)
  - 名前の下に
    - 「🟢 オンライン中」(オンライン時、緑)
    - 「最終ログイン 5分前」(オフライン + last_seen 有り、灰)
    - 「最終ログイン不明」(last_seen が null)
  - 右側に 2 つの丸ボタン
    - シアンのヘッドホンアイコン → /group へ
    - ピンクのメールアイコン → DM 開始 → /chat/[matchId]
- 並び順: オンラインの人が上、その下にオフラインを last_seen 新しい順

### 4.3 検索動作の確認 (壊れていないか)
- 検索ボックスに何か入力する
- 「あなたのフレンド」セクションが消える
- 代わりに「一致するユーザー」セクションが出る (従来通り)
- ✕ で検索クリア → 「あなたのフレンド」が再表示

### 4.4 結果パターン
- 上記すべてが揃っている → OK
- セクションそのものが出ない → friends state が空配列のまま。Console
  で `[users] friends fetch error:` を確認
- カードは並ぶが「最終ログイン不明」が大量 → last_seen_at が null の
  ユーザーが多い (B 案 = AppLayout からの定期 update_last_seen で改善余地)
- 並び順がおかしい (オフラインが上に来る等) → ソートロジックを再確認

### 4.5 通話招待 / DM ボタンの動作
- ヘッドホンボタンを押す → /group ページへ
  - 期待: 仕様上、現状は /group の一覧画面に飛ぶだけ。フレンド指定での
    招待は未実装 (C 案で追加予定)
- メールボタンを押す → DM 画面へ
  - 既に DM がある相手なら `/chat/[matchId]` で既存トークに飛ぶ
  - 初回なら startDM 経由で match を作成し /chat/[matchId] へ
  - 年齢未確認時はトーストで誘導 (画面によっては alert 表示)

---

## 5. Console ログの取得方法 (異常時)

### 5.1 方法 A — iPhone Safari + Mac Web Inspector
docs/profile-bug-verification.md と同じ手順:
1. iPhone: 設定 → Safari → 詳細 → Web インスペクタをオン
2. Mac: Safari → 設定 → 詳細 → 「メニューバーに開発を表示」
3. iPhone と Mac をケーブル接続
4. Mac の Safari メニュー: 開発 → [iPhone 名] → nowmatejapan.com を選択
5. Web Inspector → コンソールタブ
6. iPhone でフレンド横スクロール / /users / グループ作成等の操作
7. `[FriendRail]` `[users]` `[group]` で始まるログを全コピー

### 5.2 方法 B — Eruda ブックマークレット
Mac が無い場合の代替手段:
1. iPhone Safari で適当なページをブックマーク
2. ブックマーク URL を以下に置換:
   ```
   javascript:(function(){var s=document.createElement('script');s.src='//cdn.jsdelivr.net/npm/eruda';document.body.appendChild(s);s.onload=function(){eruda.init();};})();
   ```
3. nowmatejapan.com を開いて「DevTools」ブックマークを起動
4. 画面右下のアイコン → Console タブ

---

## 6. 想定エラーパターンと対応

### 6.1 `[FriendRail] follows fetch error:`
- 意味: user_follows の SELECT が RLS で拒否
- 通常は起きない。出たら error.code と error.message を共有 → RLS
  ポリシー確認が必要

### 6.2 `[FriendRail] profiles fetch error:` または部分欠落
- 意味: profiles の他人 SELECT が拒否されている可能性
- 症状: 「名無し」プレースホルダーが出る
- 確認 SQL (Supabase SQL Editor)
  ```sql
  SELECT policyname, cmd, qual
  FROM pg_policies
  WHERE schemaname='public' AND tablename='profiles';
  ```

### 6.3 `[users] friends fetch error:`
- 意味: /users のフレンド一覧で user_follows fetch が失敗
- 6.1 と同様に確認

### 6.4 last_seen_at がほぼ全員 null / 過去日付
- 意味: update_last_seen RPC を呼ぶパスが mypage 開いた時のみのため、
  他画面メインで使うユーザーの値が古い
- 対応: B 案 (AppLayout から visibilitychange で update_last_seen 呼出)

### 6.5 「グループ」タップで /group が 404
- 意味: ビルドが反映されていない
- 1.1 → 1.2 やり直し

---

## 7. 検証結果報告テンプレート

検証が終わったら以下を埋めて Claude Code に貼ってください:

```
【下部ナビ】
- グループタブ表示: [OK / NG]
- /group へ遷移: [OK / NG]
- 旧フレンドタブの残存: [なし / あり]

【FriendAvatarRail】
- TL に表示: [OK / NG]
- グループ に表示: [OK / NG]
- ゲーム村 に表示: [OK / NG]
- チャット に表示: [OK / NG]
- 通知 に表示: [OK / NG]
- マイページ に表示: [OK / NG]
- 詳細ページ (/chat/[id], /profile/[id], /voice/[id]) で非表示: [OK / NG]
- オンライングロー: [OK / 強すぎ / 弱すぎ]
- ステータス行 (オンライン中 / N前 / 空): [OK / NG]
- 「もっと見る」→ /users 遷移: [OK / NG]
- アバター → /profile/[id] 遷移: [OK / NG]

【/users あなたのフレンド】
- セクション表示: [OK / NG]
- 件数表示の値: ___
- 並び順 (オンライン上 + last_seen 降順): [OK / NG]
- 「最終ログイン不明」表示の発生数: ___ / 全 ___
- ヘッドホン → /group: [OK / NG]
- メール → /chat/[id]: [OK / NG]
- 検索時にフレンドセクションが隠れる: [OK / NG]

【Console エラーログ】
(あれば貼る、なければ「なし」)

【その他気付き】
- 文字サイズ (9px / 10px) の見やすさ: ___
- グロー色味の所感: ___
- 表示崩れ・iPhone 幅問題: ___
```

このテンプレートを基に、追加調整 / 次フェーズの判断を行う。

---

## 8. 検証で OK だった場合の次アクション

両機能とも完全動作なら、次は以下から選ぶ:

- **B**: AppLayout から visibilitychange (タブ復帰時) で update_last_seen
  RPC を呼びプレゼンス精度を上げる (DB 変更なし)
- **C**: グループ通話への明示的なフレンド招待 UI を追加 (フレンド複数
  選択 → 通知 or DM 経由)
- **D**: /friends 専用ページを新規作成し、/users は検索専用に戻す
- **E**: 別タスク (signup テーマ刷新 / Search Console 再クロール手順 /
  過去バグ実機検証 等)

部分的に NG の場合は、本ドキュメント 6 の SQL や Console ログを共有して
ピンポイント修正に進む。
