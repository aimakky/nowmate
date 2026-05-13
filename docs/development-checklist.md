# YVOICE / samee 開発チェックリスト・再発防止ルール

> 作成: 2026-05-06 / 大規模振り返り後
> 過去発生した問題を二度と起こさないための開発・確認手順集。
> 新機能追加・バグ修正・UI 変更すべてでこのドキュメントを参照。

---

## 1. 過去に起きた問題分類とその真因

### 1-1. UI 変更が反映されない問題

| 症状 | 真因 | 再発防止 |
|--|--|--|
| タブ「投稿/参加中/使い方/安心」がいくら直しても消えない | **GitHub Action `Deploy to Vercel` が 274 連敗、私の commit が一度も Vercel に届いていなかった** | 必ず `vercel deploy --prod` または Vercel ダッシュボードで「Deployment が READY か」「直近 commit hash と一致するか」を確認 |
| Vercel Edge cache が 30 分以上古い HTML を HIT で返す | next.config.js の `Cache-Control: no-cache` だけでは Edge レイヤを bust できない | `middleware.ts` で全レスポンスに `CDN-Cache-Control: no-store` / `Vercel-CDN-Cache-Control: no-store` を **動的に注入** (現在実装済) |
| iPhone Safari で戻る/進む後に古い画面が出る | Safari の bfcache (back-forward cache) が `Cache-Control` を無視 | `AppLayout` の `pageshow` event で `event.persisted === true` 時に `window.location.reload()` (現在実装済) |

### 1-2. プロフィール表示系

| 症状 | 真因 | 再発防止 |
|--|--|--|
| ミヤさんの投稿が TL「みんな」に 1 件しか出ない | `fetchPosts` の SELECT に `profiles(...)` / `villages(...)` embed が残存。RLS で参照先が隠れた時に親 row ごと消える PostgREST 挙動 | embed 撤廃 → 別 query で `.in()` 取得 + in-memory Map merge (`fetchTweets` 同パターン) |
| TL の投稿は出るが、村投稿が 0 件 (PostCard が消える) | 同上の embed 失敗 | 同上 + `lib/post-media.ts` の安全判定関数 |
| マイページ投稿数=1、プロフィール=10 で差分 | mypage が `tweets` のみ取得し `village_posts` を取得していなかった | mypage に `village_posts` 取得を追加し時系列マージ |
| 自分プロフィール (白) と マイページ (黒) で UI が分裂 | `/profile/[userId]` と `/mypage` が完全別実装 | TL の avatar/名前タップを `myId === user_id ? '/mypage' : '/profile/${id}'` に分岐 + `/profile/[userId]` で自分 ID 直アクセス時 `router.replace('/mypage')` |
| /profile/[userId] が白テーマで他画面と分離 | 旧ライト UI 検証フェーズの遺物 | dark theme 化済 (commit 5e251df) |

### 1-3. データ取得・カラム名系

| 症状 | 真因 | 再発防止 |
|--|--|--|
| フォロー中・フォロワー一覧で全員「名無し」 | DB 実カラムは `nowjp_id` だがコードは存在しない `VILLIA_id` を SELECT、PostgREST 42703 エラー → fallback で 名無し プレースホルダー | 全コードで `VILLIA_id` → `nowjp_id` に置換済 (commit 6b5765c) + `lib/user-display.ts` で表示名取得を共通化 |
| ミヤさんが is_shadow_banned 扱いで TL から消えていた | mypage の `fetchPosts` に client-side で `is_shadow_banned` を弾くフィルタが存在 | TL では撤廃済。モデレーションが必要なら RLS or 明示 UI |

### 1-4. 反映確認の困難さ

| 症状 | 真因 | 再発防止 |
|--|--|--|
| 修正したのに iPhone で見た目が変わらない | 端末側 Safari キャッシュ + Vercel Edge cache + bfcache の三重苦 | 修正反映確認は (1) curl で `X-Vercel-Cache: MISS` 確認 (2) live HTML に新しい文字列が含まれるか grep (3) 端末は完全終了 + 履歴消去 |
| BUILD バージョン表示が無く「最新を見ているか」分からない | バージョン可視化なし | デバッグ時は一時的に `BUILD: vX-YYYY-MM-DD` 等のマーカーを目立つ位置に追加。確認後に削除 |

---

## 2. 開発前チェックリスト (UI 変更・バグ修正 共通)

### 着手前

- [ ] **「変更前」のスクショ or 該当 URL を確認**
- [ ] **rg で該当文字列を全網羅検索**して、UI を出している実体ファイルを特定
- [ ] 自分用画面 / 他人用画面 / mobile / desktop で別実装になっていないか確認
- [ ] DB のカラム名を Supabase ダッシュボード または `SELECT * FROM ... LIMIT 1` で実物確認 (推測しない)

### 実装中

- [ ] **PostgREST embed を新規導入しない** (`profiles(...)` / `villages(...)` のような nested select は RLS 失敗で親 row が消えるので使用禁止)。必要なら別 query + Map merge
- [ ] 表示名表示は `lib/user-display.ts` の `getUserDisplayName(profile)` を使用 (独自 fallback 禁止)
- [ ] アバター頭文字は `getAvatarInitial(profile)` を使用
- [ ] 写真/動画判定は `lib/post-media.ts` の `hasImagePost` / `hasVideoPost` を使用
- [ ] `'use client'` ファイルでは `export const dynamic` / `revalidate` / `fetchCache` を使わない (build error: "Invalid revalidate value [object Object]")

### 完了前

- [ ] `npm run build` がエラーなしで通る
- [ ] `rg <旧UI文字列>` で旧表記が残っていないか確認
- [ ] (本番反映時) 必ず `npx vercel --prod` で手動デプロイ
- [ ] live HTML を curl して新文字列が含まれるか確認
- [ ] iPhone は Safari 完全終了 + 履歴消去 + PWA 再追加

---

## 3. ファイル責務マップ (現状)

### プロフィール表示

| 画面 | 実体ファイル | 責務 |
|--|--|--|
| 自分のマイページ | `app/(app)/mypage/page.tsx` | dark theme, 投稿/写真/動画 タブ, トラスト/認証カード |
| 他人プロフィール | `app/(app)/profile/[userId]/page.tsx` | dark theme, 投稿/写真/動画 タブ, フォロー/DM ボタン |
| 設定 | `app/(app)/settings/page.tsx` | アカウント編集, 使い方/安心 へのリンク |
| 使い方ガイド | `app/(app)/guide/page.tsx` (`FeaturesTab` ラップ) | 機能説明 |
| 安心ガイド | `app/safety/page.tsx` (public route) | YVOICE 安全対策の公開ページ |

### 投稿表示

| 画面 | 実体ファイル |
|--|--|
| TL | `app/(app)/timeline/page.tsx` (PostCard / TweetCard 含む) |
| 投稿カード (tweets) | `components/ui/TweetCard.tsx` |
| 投稿カード (village_posts) | `app/(app)/timeline/page.tsx` 内 PostCard, `app/(app)/villages/[id]/page.tsx` 内 PostCard, `app/(app)/guilds/[id]/page.tsx` 内 PostCard (3 か所重複あり、要将来統合) |

### フォロー一覧

| 画面 | 実体ファイル |
|--|--|
| マイページ内フォロー中/フォロワー (擬似タブ) | `app/(app)/mypage/page.tsx` の `loadFollowList` |
| 全フレンド一覧 | `app/(app)/users/page.tsx` |
| 上部のフレンドアバター列 (全画面) | `components/layout/FriendAvatarRail.tsx` |

---

## 4. 共通化済みユーティリティ

| 関数 | ファイル | 用途 |
|--|--|--|
| `getUserDisplayName(profile, fallback?)` | `lib/user-display.ts` | display_name → username → name → nickname → handle → user_code → nowjp_id の優先順位で表示名取得 |
| `getAvatarInitial(profile, fallback?)` | `lib/user-display.ts` | アバター画像なし時の頭文字 1 文字 |
| `isAnonymousProfile(profile)` | `lib/user-display.ts` | プロフィール完全空判定 |
| `hasImagePost(post)` | `lib/post-media.ts` | 投稿が画像を含むか (image_url / images / attachments / media を defensive にチェック) |
| `hasVideoPost(post)` | `lib/post-media.ts` | 投稿が動画を含むか |

---

## 5. 禁止事項 (これ以降のコード PR で追加禁止)

1. **`profiles!fkey(...)` 等の nested embed select**
   - 理由: RLS で参照先が隠れると親 row 自体が消える PostgREST 挙動
   - 対案: 別 query + `.in('id', ids)` + in-memory Map merge

2. **`'use client'` ファイルでの `export const dynamic / revalidate / fetchCache`**
   - 理由: build error `Invalid revalidate value [object Object]`
   - 対案: middleware.ts で動的注入

3. **独自の表示名 fallback (`profile.display_name ?? '名無し'` 等のインライン記述)**
   - 理由: 各画面でフォールバックが '名無し'/'住民'/'?'/'匿名'/'誰か' とバラバラになり統一感が崩れる
   - 対案: `getUserDisplayName(profile)` を使用

4. **存在しない DB カラムを SELECT する**
   - 理由: PostgREST 42703 エラーでクエリ全体が失敗、fallback で全件 名無し になる
   - 対案: `SELECT * FROM <table> LIMIT 1` で実カラム確認してからコード書く

5. **タブに「参加中 / 使い方 / 安心」をプロフィール直下に追加**
   - 理由: 過去にここから整理済。再発させない
   - 対案: 「使い方」「安心」は `/guide` / `/safety` で設定経由のみ

---

## 6. デバッグ手順 (反映されない時)

### Step 1: コード側の確認
```bash
rg "<旧UI文字列>"             # まだ残っていないか
rg "<新UI文字列>"             # 正しく入っているか
git log --oneline -5         # 最新 commit が反映されているか
git rev-parse HEAD           # local
git rev-parse origin/main    # remote
```

### Step 2: Vercel デプロイ確認
```bash
curl -sLI "https://www.nowmatejapan.com/login" | grep -iE "X-Vercel-Cache|Age|Cache"
curl -sL  "https://www.nowmatejapan.com/login" | grep -oE 'dpl_[a-zA-Z0-9]+' | sort -u
```
- `X-Vercel-Cache: MISS` → 新デプロイ反映、Vercel CDN は新鮮
- `X-Vercel-Cache: HIT` + `Age` 大 → 古いキャッシュ。`vercel deploy --prod` で再デプロイ
- `dpl_` ID が前回と同じ → デプロイ自体が走っていない

### Step 3: GitHub Actions の状況
```
https://github.com/aimakky/yvoice/actions
```
最近の workflow が **failure** なら自動デプロイは動いていない。手動で `npx vercel --prod` を実行。

### Step 4: 端末キャッシュ
- iPhone Safari: アプリスイッチャーで完全終了 → 設定 → Safari → 履歴と Web サイトデータを消去
- PWA としてホームに追加している場合: アイコン削除 → 再追加
- 機内モード ON/OFF で DNS リセット
- プライベートブラウズで確認

### Step 5: 一時的な visible BUILD marker
コードに小さな紫バッジ「BUILD: vX-YYYY-MM-DD」を追加して push、これが見えれば deploy は届いている。確認後に削除。

---

## 7. 反映確認後にやること

- 一時 BUILD marker / v2.0 marker を除去するコミット
- 古い `console.log("DEBUG_*")` を除去
- deprecated コメントが付いた未使用コンポーネントを実際に削除

---

## 8. 既知の懸念 (今後対応)

- [ ] GitHub Actions `Deploy to Vercel` workflow が 274 連敗中。Vercel ダッシュボードで純正 GitHub 連携を有効化するか、`VERCEL_TOKEN` 更新が必要
- [ ] `app/api/invite/route.ts` の `inviter_VILLIA_id` (invites テーブル) は別テーブル列のため未変更。招待機能を本格運用する前に DB スキーマ確認
- [ ] PostCard が 3 か所 (`timeline` / `villages/[id]` / `guilds/[id]`) で重複定義。将来 `components/ui/PostCard.tsx` に統合すべき
- [ ] embed 棚卸し Step 2-4 が未完 (explore / notifications / voice / group / guild / qa / 各詳細)

---

## 9. 完了報告フォーマット

### コード変更時 (CLAUDE.md ルール準拠)

```
1. ChatGPT 相談用プロンプト
2. 次回 Claude Code へコピペする用プロンプト
3. 簡潔で分かりやすい説明プロンプト
```

各プロンプトの内容:
- 変更ファイル一覧
- 改善内容
- 実装内容
- 未実装の内容
- 次に実装予定
- エラー有無 (build / lint / TypeScript / runtime / DB / 環境変数)
- 次のアクション

### バグ修正時の追加項目

- 真因 (推測ではなく証拠付きで)
- 検証コマンド (curl / SQL 等)
- 再発防止策 (このドキュメントへの追記が必要かどうか)

---

## 10. 用語

- **PostgREST embed**: Supabase の `select('*, foo(*)')` 形式の関連取得。RLS と相性が悪く本プロジェクトでは禁止
- **bfcache**: iOS Safari の back-forward cache。`Cache-Control` を無視するため `pageshow` event で対処
- **shadow_banned**: 過去 TL で運用していた client-side フィルタ。`is_shadow_banned=true` ユーザーの投稿を非表示にしていたが「ミヤさん表示バグ」の主因の 1 つだったため撤廃
- **VILLIA_id / nowjp_id**: profiles テーブルのユーザー検索用 ID。過去のリネームでコード側追従漏れがあり、現在は `nowjp_id` に統一
