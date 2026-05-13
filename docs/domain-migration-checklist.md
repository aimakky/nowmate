# YVOICE 本番ドメイン移行 チェックリスト

旧 `nowmatejapan.com` → 新 `https://www.yvoiceonline.com` への段階移行を、
**1 つも事故を起こさず** 完了させるための運用手順。

> **2026-05-13 決定**: 正式 URL (canonical) は **`https://www.yvoiceonline.com`** に統一。
> Vercel Domains で apex (`yvoiceonline.com`) は 308 で `www.yvoiceonline.com` に集約済み。
> Stripe webhook / Vercel env / Supabase Site URL / Sentry Allowed Domains はすべて
> **www 付き** を正として登録する (apex も別 entry として並列許可)。

> 関連: 概要と背景は [domain-migration.md](./domain-migration.md) 参照。
> 本ファイルは「マッキーさんが画面ぽちぽちで実行する順序」を最短経路で
> 並べたものです。上から順番に進めてください。

---

## 全体の原則 (毎回確認)

1. **旧 `nowmatejapan.com` は絶対に削除しない**。Vercel Domains に残置し、
   既存 SNS シェア・検索結果・個人ブックマーク・旧メール認証リンク・
   旧 Stripe Webhook の受け口として温存する。
2. **301 redirect は最後にやる**。Stripe webhook の動作確認が終わるまで
   旧 → 新 の自動転送を有効化しない (署名検証が壊れる事故防止)。
3. **Supabase Auth Site URL は最後に切替**。先に **Additional Redirect URLs**
   に新旧両方を入れて、ログイン中ユーザーをゼロ離脱で吸収する。
4. **Stripe Webhook は両稼働**。新 endpoint を Stripe Dashboard で追加し、
   旧 endpoint と並行運用。新 endpoint が確実に 200 を返すと確認できてから
   旧側を停止する。
5. **コードは現状のまま deploy 可能**。`NEXT_PUBLIC_SITE_URL` 未設定でも
   `lib/site.ts` の fallback `https://yvoiceonline.com` で新ドメイン基準の
   URL が生成される。env 明示は安全装置として推奨。

---

## Phase 0 — Deploy 前に必ず満たす条件

下記すべてが ✅ になっていれば、コードを push / deploy してよい。

- [x] `npm run build` 成功 (Next.js 14.2.35 全ルート prerender 完了)
- [x] `npx tsc --noEmit` エラー 0
- [x] コード内 `nowmatejapan.com` 残存はコメントのみ (実害なし)
- [x] URL 生成は SITE_URL / SITE_HOST / getBaseUrl() に集約済み
- [x] Supabase Auth redirect は `location.origin` / request origin ベース
- [x] Sentry コードに `allowedDomains` 等の制限が無いことを確認
- [ ] `npm run lint` — eslint 未初期化のため対話プロンプトで停止。
  本タスクでは **non-blocking** として扱う。eslint 初期化は別 PR で対応。
- [ ] 後述 Phase 1〜2 の外部設定が完了していること

---

## Phase 1 — 外部設定 (deploy 前に完了させる)

### Step 1. Vercel に新ドメインを追加

**画面**: Vercel ダッシュボード → `nowmate` プロジェクト → Settings → Domains

注意: `nowmate-ytxw` (preview 用) ではなく **`nowmate`** が本物の本番。
スクショで Domains 欄に `www.nowmatejapan.com` が含まれていることを確認。

- [ ] `Add Domain` → `yvoiceonline.com` を追加
- [ ] `Add Domain` → `www.yvoiceonline.com` を追加
- [ ] Vercel が指示する DNS 設定値 (A レコードの IP / CNAME の値) をメモ
- [ ] **既存の `nowmatejapan.com` / `www.nowmatejapan.com` は触らない**。
  並列に表示されたまま。
- [ ] Primary Domain は **当面 `nowmatejapan.com` のまま**。Phase 3 で切替。

### Step 2. DNS レコードをレジストラ側で設定

**画面**: yvoiceonline.com を取得した会社 (お名前.com / Cloudflare 等) の DNS 管理画面

- [ ] apex (`@` または空欄): A レコード `76.76.21.21` (Vercel 指示値が正)
- [ ] `www`: CNAME `cname.vercel-dns.com.` (末尾ドット付き)
- [ ] TTL: 3600 (デフォルトでも可)
- [ ] `dig yvoiceonline.com` で A レコードが返る
- [ ] `dig www.yvoiceonline.com CNAME` で `cname.vercel-dns.com` が返る
- [ ] `dnschecker.org` で複数地域から確認 (グローバル伝播チェック)

### Step 3. SSL 発行を待つ

**画面**: Vercel → Settings → Domains の各行

- [ ] `yvoiceonline.com` の行に **Valid Configuration** (緑チェック) が出る
- [ ] `www.yvoiceonline.com` も同様に Valid
- [ ] SSL Active 表示を確認 (通常 5 分〜30 分)

### Step 4. Supabase Auth に新ドメインを追加

**画面**: Supabase → 該当プロジェクト → Authentication → URL Configuration

以下を **Additional Redirect URLs に追加** (既存は **絶対に消さない**):

- [ ] `https://yvoiceonline.com`
- [ ] `https://yvoiceonline.com/**`
- [ ] `https://yvoiceonline.com/auth/callback`
- [ ] `https://www.yvoiceonline.com`
- [ ] `https://www.yvoiceonline.com/**`
- [ ] `https://www.yvoiceonline.com/auth/callback`
- [ ] **Site URL は `https://nowmatejapan.com` のまま放置** (Phase 3 で切替)

> Site URL は 1 つしか持てない設定。メール認証リンクのデフォルト送信先になる
> ため、旧ドメインで開いている既存ユーザーが認証メールを受信しても自然な戻り先
> になるよう、新ドメインで全動作確認が済むまで切替えない。

### Step 5. Stripe Dashboard で新 webhook endpoint を追加

**画面**: Stripe → Developers → Webhooks

- [ ] `Add endpoint` → URL: `https://www.yvoiceonline.com/api/stripe/webhook`
  (apex ではなく **www 付き正式 URL**。Stripe からの signed POST を Vercel
  redirect で hop させない原則)
- [ ] Events to send:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `identity.verification_session.verified`
- [ ] `Add endpoint` で作成
- [ ] 新 endpoint の **Signing secret** (whsec_...) をコピー
- [ ] **旧 endpoint `https://www.nowmatejapan.com/api/stripe/webhook` は削除しない**

> 同じ secret を流用するか、新 secret に切替するかは下の Step 6 で判断。

### Step 6. Vercel Environment Variables を設定

**画面**: Vercel → Settings → Environment Variables

- [ ] `NEXT_PUBLIC_SITE_URL` = `https://www.yvoiceonline.com`
  - 環境: **Production / Preview / Development すべてチェック**
  - apex (`https://yvoiceonline.com`) ではなく **www 付き** を入れる
    (Vercel 側で apex → www に 308 集約しているため、env から www 付きを渡すと
    canonical / OG / sitemap が hop なしの正式 URL になる)
- [ ] `STRIPE_WEBHOOK_SECRET` の扱い (どちらか選択):
  - **Option A (推奨・最速)**: 旧 secret のまま据え置き、新 endpoint も同じ
    secret を使う運用にする。Stripe は endpoint ごとに別 secret を発行するが、
    手動で旧と同じ値を使い続けることはできる。ただし新 endpoint 作成時に
    Stripe が新しい secret を発行するので、これを使わない場合は **旧 secret
    を維持して新 endpoint の Reveal で新 secret に「上書き」しない**。
  - **Option B (より安全)**: 新 endpoint の新 secret に切替。旧 endpoint
    からの POST は新 secret では署名検証 fail になるため、旧 endpoint を
    Stripe 側で Disable してから env を切替える。
  - 移行期は Option A の方が事故が少ない。長期運用は Option B に寄せる。
- [ ] `NEXT_PUBLIC_BASE_URL` は **未設定のままで OK**
  (env-guard.ts は NEXT_PUBLIC_SITE_URL に fallback する)

---

## Phase 2 — Deploy

### Step 7. push → auto-deploy

- [ ] 本ターンまでの commit を main に merge
- [ ] Vercel が auto-deploy で最新 Production を Building → Ready に
- [ ] **GitHub MCP** で commit が main HEAD にあるか確認
- [ ] **Vercel MCP** で最新 Production deployment の state=Ready + commit hash 一致を確認
- [ ] 旧ドメイン `https://www.nowmatejapan.com/` で **これまで通り** 表示
  (env により出力 URL は新ドメイン基準になるが、配信自体は両ドメインで継続)
- [ ] 新ドメイン `https://yvoiceonline.com/` でも同じサイトが表示

---

## Phase 3 — Deploy 後の実機確認

### Step 8. 新ドメインで全機能を実機チェック

iPhone Safari (実機) と Mac Chrome (DevTools) の両方で:

- [ ] `https://yvoiceonline.com/` が開ける (LP 表示)
- [ ] `https://www.yvoiceonline.com/` が apex (or apex が www) にきちんと正規化
- [ ] `/login` でログイン成功 (Supabase email + password 経路)
- [ ] `/login` で OAuth 戻り先が `yvoiceonline.com/auth/callback?next=/timeline` 系
- [ ] `/signup` で新規登録成功
- [ ] メール認証リンクから戻ってくる経路が壊れない (Additional Redirect URLs で許可済み)
- [ ] ログアウトできる
- [ ] `/timeline` が表示される
- [ ] 投稿できる、いいねできる、リポストできる
- [ ] `/mypage` でプロフィール表示、編集できる
- [ ] フレンド導線、フレンドレール表示
- [ ] `/guild` / `/guilds/[id]` 表示
- [ ] `/villages/[id]` 表示 (いますぐ村)
- [ ] `/chat` / `/chat/[matchId]` 表示
- [ ] `/notifications` 表示
- [ ] 通話ルーム `/voice/[roomId]` 起動 (LiveKit 接続)
- [ ] 本人確認バッジが投稿カードに表示される (壊れていない)
- [ ] 下部 BottomNav 全タブが動く
- [ ] `/upgrade` から Stripe Checkout 起動 → success_url が
  `yvoiceonline.com/upgrade/success` で戻る
- [ ] `/verify-age` から Stripe Identity 起動 → return_url が
  `yvoiceonline.com/verify-age/complete` で戻る

### Step 9. SEO / SNS / メタデータ確認

- [ ] `https://yvoiceonline.com/sitemap.xml` を開いて全 URL が `https://yvoiceonline.com/...` で出力されている
- [ ] `https://yvoiceonline.com/robots.txt` の `Sitemap:` 行が新ドメイン
- [ ] LP のページソースで `<link rel="canonical" href="https://yvoiceonline.com">` を確認
- [ ] LP のページソースで `<meta property="og:url" content="https://yvoiceonline.com">` を確認
- [ ] `https://yvoiceonline.com/opengraph-image` を開いて画像内 URL バーが `yvoiceonline.com`
- [ ] X (Twitter) Card Validator: `https://cards-dev.twitter.com/validator` に
  `https://yvoiceonline.com` を入れて OG 画像が出る
- [ ] LP の Organization JSON-LD で `url` が `https://yvoiceonline.com`

### Step 10. Stripe Webhook 新 endpoint 動作確認

- [ ] Stripe Dashboard → 新 endpoint の Recent events を見て **200 OK** が記録されている
- [ ] テストモードで `Send test webhook` → 200 OK で受信
- [ ] 本番モードでテストアカウントの Checkout を実行 → 新 endpoint に
  `checkout.session.completed` が届く → DB の `premium_subscriptions` に反映
- [ ] Stripe Identity も同様にテスト

### Step 11. Sentry 確認

**画面**: Sentry → yvoice project → Settings → Security & Privacy

- [ ] **Allowed Domains** 欄が空 or `*` であれば OK (制限なし)
- [ ] 制限ありの場合: `yvoiceonline.com` / `www.yvoiceonline.com` を追加
  (旧 `nowmatejapan.com` も残す)
- [ ] 新ドメインで意図的にエラーを発生させる (例: DevTools コンソールで
  `throw new Error('domain-migration-smoketest-yvoice')`)
- [ ] Sentry Issues に該当エラーが届く + environment / release が正しい

---

## Phase 4 — 旧ドメインの 301 redirect (Stripe webhook 動作確認後に最後にやる)

### Step 12. Vercel Domains で旧 → 新 リダイレクト

**画面**: Vercel → Settings → Domains

- [ ] Stripe 新 webhook endpoint が **少なくとも 1 回 200 OK で受信した** ことを確認
- [ ] Supabase Auth で新ドメイン経由のログインが安定動作していることを確認
- [ ] `nowmatejapan.com` の行のメニュー → 「Redirect to...」 → `yvoiceonline.com` を選択
- [ ] `www.nowmatejapan.com` も同様に → `yvoiceonline.com` へ redirect
- [ ] redirect type: **Permanent (308 / 301)** を選択
- [ ] `curl -I https://nowmatejapan.com/timeline` で `308` or `301 Location: https://yvoiceonline.com/timeline` を確認

### Step 13. Stripe 旧 webhook endpoint の段階停止

- [ ] 旧 endpoint `https://www.nowmatejapan.com/api/stripe/webhook` は 301 で
  新 endpoint に転送される。ただし **Stripe は signed POST を 301 経由で
  保持しない** ため、旧 endpoint への直接送信は意味を持たなくなる。
- [ ] Stripe Dashboard → 旧 endpoint → **Disable**
  (1 ヶ月後に **Delete** を推奨)

### Step 14. Vercel Primary Domain を新ドメインに切替

**画面**: Vercel → Settings → Domains

- [ ] `yvoiceonline.com` の行で `Set as Primary Domain` を選択
- [ ] これ以降、share URL や Vercel 内部生成 URL の表示も新ドメインベースに

### Step 15. Supabase Auth Site URL を切替

**画面**: Supabase → Authentication → URL Configuration

- [ ] Site URL を `https://yvoiceonline.com` に変更
- [ ] **Additional Redirect URLs の旧 URL は残したまま**
  (まだ旧ドメイン経由でアクセスする人が居るので保険として保持)
- [ ] メール認証テストで新ドメインへの認証リンクが送られることを確認

---

## Phase 5 — SEO 引き継ぎ (リリース後 1〜2 日以内)

### Step 16. Google Search Console

**画面**: Google Search Console

- [ ] 新ドメイン `yvoiceonline.com` を Property として追加
- [ ] 所有権確認 (DNS TXT or HTML タグ)
- [ ] `https://yvoiceonline.com/sitemap.xml` を Search Console に登録
- [ ] 旧ドメイン `nowmatejapan.com` Property の「アドレス変更」ツール
  (Settings → Change of address) → `yvoiceonline.com` への移行を申請
- [ ] 「サイトへの移転リクエストが完了しました」表示まで確認

### Step 17. その他

- [ ] X (Twitter) プロフィール / bio の URL を新ドメインに更新
- [ ] LINE / Discord / その他外部に貼ってある旧ドメインリンクを、可能な範囲で更新
- [ ] OG キャッシュをクリア: Twitter/X cards validator, Facebook sharing debugger
  で旧 URL の OG を強制更新 (新ドメインへの 301 経由で新 OG を取得させる)

---

## トラブルシュート

### 「iPhone で新ドメインが開けない」
- DNS 反映: `dnschecker.org` で複数地域から `76.76.21.21` が返るか確認
- SSL 発行: Vercel Domains で `Valid Configuration` 表示か確認
- iOS Safari bfcache: タブを切替 → 戻る、または下に引っ張ってリロード

### 「ログインできない」
- Supabase Auth Additional Redirect URLs に新ドメインが入っているか
- 旧 URLs を消していないか
- Site URL を先に新ドメインに切替えていないか (旧ドメインで開いてるユーザーが壊れる)
- ブラウザのキャッシュ・cookie をクリアしてリトライ

### 「Stripe 決済戻り先が壊れる」
- Vercel env `NEXT_PUBLIC_SITE_URL` が `https://yvoiceonline.com` で全環境に設定されているか
- Vercel deployment が env 設定後に Redeploy されているか (env 変更後は要再デプロイ)
- 旧 endpoint と新 endpoint の signing secret が一致しているか / Vercel env の secret が正しいか

### 「301 redirect しても古いキャッシュが返る」
- Vercel Edge Cache は no-store 設定済みなので低リスク
- ブラウザの DNS キャッシュをクリア: `chrome://net-internals/#dns`
- 別ブラウザ / 別端末で確認

### 「Sentry に届かない」
- DSN が正しく設定されているか (Vercel env `NEXT_PUBLIC_SENTRY_DSN`)
- Allowed Domains に新ドメインが含まれているか (制限ありの場合)
- environment / release が分かれて表示されていないか (Sentry Issues フィルタ確認)

---

## 完了判定

すべて ✅ になったらドメイン移行完了。

- [ ] Phase 1〜2 完了
- [ ] Phase 3 全項目確認完了
- [ ] Phase 4 完了 (301 redirect + Stripe 旧 endpoint Disable + Site URL 切替)
- [ ] Phase 5 完了 (Google Search Console アドレス変更申請完了)
- [ ] 1 週間連続で Sentry に致命的エラーが発生していない
- [ ] 1 週間連続で Stripe 決済 / Identity が成功している
