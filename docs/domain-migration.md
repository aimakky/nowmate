# 新ドメイン yvoiceonline.com 移行手順

新ドメイン `yvoiceonline.com` を取得済み。
旧ドメイン `nowmatejapan.com` は **絶対に削除せず**、まず両方が同じサイトを返す
**並行運用**から始める。Vercel / Supabase などの外部サービス設定は段階的に進める。

このドキュメントは**マッキーさんが手で実施する手順**をまとめたもの。
コード側の準備は commit `<<this commit>>` で完了済み (lib/site.ts ベース)。

---

## 全体フロー

```
[Step 1] Vercel に yvoiceonline.com を追加 (サイト本体は両ドメインで同じ)
   ↓
[Step 2] ドメイン管理会社で DNS レコードを設定
   ↓
[Step 3] Vercel で SSL 発行を待つ (~数分)
   ↓
[Step 4] 両ドメインで同じサイトが見えることを確認
   ↓
[Step 5] Supabase Auth に新ドメインの URL を「追加」(削除はしない)
   ↓
[Step 6] (任意) Stripe Identity の return URL を確認 / 追加
   ↓
[Step 7] (任意) ログイン・新規登録・メール認証・電話認証を新ドメインで動作確認
   ↓
[Step 8] Vercel に環境変数 NEXT_PUBLIC_SITE_URL=https://yvoiceonline.com を追加
   ↓
[Step 9] 再デプロイ → canonical / sitemap / OG が新ドメイン基準に
   ↓
[Step 10] (将来、新ドメインが安定運用してから) 旧ドメインから 301 redirect 検討
```

各ステップを順番に。**前のステップが完了するまで次へ進まないこと**。

---

## Step 1. Vercel に yvoiceonline.com を追加

### 操作場所
Vercel ダッシュボード → 該当プロジェクト → Settings → Domains

### 手順
1. `Add Domain` ボタンを押す
2. `yvoiceonline.com` を入力 → Add
3. 続けて `www.yvoiceonline.com` も Add (apex + www の両方を持つのが推奨)
4. Vercel が「DNS の設定が必要」と表示するので、表示された値をメモ
   - apex (yvoiceonline.com) には A レコードで `76.76.21.21` を設定
   - www (www.yvoiceonline.com) には CNAME で `cname.vercel-dns.com` を設定
   (Vercel 側の指示が最新の正)

### 注意
- **既存の nowmatejapan.com は触らない**。Domains 一覧に並んだまま。
- Primary Domain は当面 nowmatejapan.com のまま。Step 9 まで切替えない。

---

## Step 2. ドメイン管理会社で DNS 設定

### 操作場所
yvoiceonline.com を取得した会社 (お名前.com / Cloudflare / Google Domains 等) の DNS 管理画面

### 手順

**A レコード (apex / yvoiceonline.com)**
- Type: `A`
- Host / Name: `@` または `yvoiceonline.com` (空欄でも可)
- Value: `76.76.21.21` (Vercel が指示した値)
- TTL: `3600` (デフォルトでも可)

**CNAME (www)**
- Type: `CNAME`
- Host / Name: `www`
- Value: `cname.vercel-dns.com.` (末尾ドット付き)
- TTL: `3600`

### 反映時間
通常 5 分〜数時間。最大 48 時間。

### 確認方法
ターミナルや https://dnschecker.org/ で:
- `dig yvoiceonline.com` → `76.76.21.21` が返る
- `dig www.yvoiceonline.com CNAME` → `cname.vercel-dns.com` が返る

---

## Step 3. Vercel で SSL 発行を待つ

DNS が反映されると Vercel が自動で Let's Encrypt SSL を発行。Domains 一覧で
`Valid` `SSL Active` のような表示になれば OK (緑のチェック)。

数分〜30 分程度。長い時は DNS が伝播していない可能性。Step 2 の dnschecker
で確認。

---

## Step 4. 両ドメインで同じサイトが見えることを確認

ブラウザで以下を順番に開く:
- https://nowmatejapan.com → これまで通り表示
- https://www.yvoiceonline.com → 同じサイトが表示
- https://yvoiceonline.com → 同じサイトが表示

このタイミングで両方が動いていれば、コード移行の **下準備は完了**。
ユーザーは引き続き旧ドメインを使えるし、新ドメインを知っている人は新ドメインで
アクセスできる。

---

## Step 5. Supabase Auth に新ドメインを追加 (削除はしない)

### 操作場所
Supabase ダッシュボード → 該当プロジェクト → Authentication → URL Configuration

### 既存設定を残したまま、以下を追加

**Site URL**
- 現状: `https://nowmatejapan.com` のはず
- 操作: 当面そのまま。**変更しない**。Step 8 完了後に新ドメインへ切替検討
  (Site URL は 1 つしか持てないので、最後の最後に切替える)

**Redirect URLs (Additional Redirect URLs に追加)**
以下 4 つを既存リストに「追加」する。既存の nowmatejapan.com の URL は **絶対に消さない**。

```
https://yvoiceonline.com
https://yvoiceonline.com/auth/callback
https://www.yvoiceonline.com
https://www.yvoiceonline.com/auth/callback
```

### 影響
- ログイン後の OAuth 戻り先 / メール認証リンクの戻り先が、新ドメインでも許可される
- 既存の nowmatejapan.com からのログインも引き続き機能
- 「Site URL を切り替える」と新ドメインがメール認証リンクのデフォルト送信先になる
  ため、Step 8 まで切替えない (= 旧ドメインを開いている既存ユーザーの導線を
  壊さないため)

---

## Step 6. (任意) Stripe Identity の return URL 確認

### 操作場所
Stripe ダッシュボード → 該当プロジェクト → Identity → Settings (もしくは
Verification セッション作成時に指定する return_url)

### 確認内容
- コード側で `verificationSession` 作成時に渡している `return_url` が、現状
  `nowmatejapan.com` ベースになっているはず
- 当面はそのままで動く (旧ドメインを開いているユーザーにとって自然な戻り先)
- Step 8 で `NEXT_PUBLIC_SITE_URL` を切り替えると、コード側で SITE_URL 経由に
  していれば自動で yvoiceonline.com に追従する
- Webhook URL は旧ドメインに紐付いている。**今は触らない**。
  新ドメインに完全移行する判断 (将来) のときに検討

### 今すぐ何かする必要は **無い**
- ただし、新ドメインで Identity 検証を試したい場合は手動で `return_url` を
  yvoiceonline 側にした URL でテスト可能

---

## Step 7. (任意) Twilio / LiveKit の確認

### Twilio (SMS)
- SMS 送信側はドメイン依存なし。今のままで OK
- もし inbound webhook (受信) を使っている場合は webhook URL に旧ドメインが
  入っている可能性 → Twilio Console → Phone Numbers → 当該番号 → Messaging
  webhook を確認
- 該当なしなら何もしない

### LiveKit
- token 発行は API 経由で、ドメイン依存なし
- LiveKit Cloud Console の Project URL (wss://...livekit.cloud) はドメイン
  非依存
- 何もしない

---

## Step 8. Vercel に NEXT_PUBLIC_SITE_URL を追加

ここまで来て、新ドメインで login / signup / 通話 / 投稿 などが動くと確認できたら、
最後のステップ。

### 操作場所
Vercel → 該当プロジェクト → Settings → Environment Variables

### 追加する環境変数
- Key: `NEXT_PUBLIC_SITE_URL`
- Value: `https://yvoiceonline.com`
- Environments: `Production` / `Preview` / `Development` 全部にチェック

### 効果
- 次回ビルド以降、以下が自動で yvoiceonline.com 基準になる
  - `<link rel="canonical">` (metadataBase 経由)
  - OG tag の `og:url`
  - `/sitemap.xml` の各 URL
  - `/robots.txt` の sitemap 行
  - LP の Organization / WebSite JSON-LD
  - ArticleJsonLd (publisher.url)
  - opengraph-image の URL バー表示
  - timeline のシェアテキスト
  - /invite の招待リンク (SSR fallback)

### 反映方法
1. Vercel の Deployments → 最新の Production を Redeploy (もしくは git push で
   新しい commit を載せる)
2. 反映後、`https://nowmatejapan.com` を開いてページソースを表示し、
   `<link rel="canonical">` の URL が `yvoiceonline.com` を指していれば成功

---

## Step 9. SEO の認識切替

Google Search Console で:
1. 新ドメイン `yvoiceonline.com` を Property として追加
2. 旧ドメイン `nowmatejapan.com` Property の「アドレス変更」ツールで
   yvoiceonline.com への移行を申請 (canonical が新ドメインを指していれば
   Google 側で自動的に集約される)
3. 新ドメインの sitemap.xml を Search Console に登録

---

## Step 10. (将来、十分な日数が経ってから) 301 リダイレクト

新ドメインが安定運用 (例: 30 日以上正常) を確認できた後の任意ステップ。
Vercel の Domains 設定で `nowmatejapan.com` を `yvoiceonline.com` への
permanent redirect に設定する。

**現時点では絶対にやらない**。旧ドメインを開いた既存ユーザーがログインなどで
失敗する可能性があるため、Supabase / Stripe など全外部サービスで新ドメインが
完全に動くことを確認してから。

---

## トラブル時の対応

### Step 2 で DNS が反映されない
- TTL を短くして再投入 (1 時間以下に)
- 別の DNS チェッカー (https://dnschecker.org/) で複数地域から確認
- 24 時間以上経過しても駄目ならドメイン会社に問い合わせ

### Step 5 後にログインできない
- Redirect URLs に追加した URL の typo を確認 (https/http、末尾スラッシュ)
- 旧ドメインの設定を消していないか確認 (絶対残す)
- Supabase の変更は即時反映だが、ブラウザのセッションをクリアしてリトライ

### Step 8 後に canonical が古いまま
- Vercel で再デプロイされたか確認 (Deployments タブの最新が「Ready」か)
- ブラウザのキャッシュをクリア
- 環境変数のスコープ (Production にチェックが入っているか) を確認

---

## コード側で完了済みの準備 (今 commit)

以下は既にコード側で対応済み。マッキーさんが追加で何かする必要なし。

- `lib/site.ts` 新設 — `NEXT_PUBLIC_SITE_URL` 環境変数を一元管理
- 以下のファイルから旧ドメインのハードコードを排除し SITE_URL 経由に統一:
  - `app/layout.tsx` (metadataBase / openGraph url)
  - `app/page.tsx` (Organization / WebSite JSON-LD)
  - `app/sitemap.ts` (base URL)
  - `app/robots.ts` (sitemap URL)
  - `components/seo/ArticleJsonLd.tsx` (author / publisher / logo)
  - `app/opengraph-image.tsx` (URL バー表示)
  - `app/(app)/timeline/page.tsx` (シェアテキスト → window.location.host 利用)
  - `app/invite/page.tsx` (壊れた fallback `https://get自由村.com` を排除)
- `NEXT_PUBLIC_SITE_URL` 未設定時は `https://nowmatejapan.com` にフォールバック
  するため、現状の挙動は完全に維持されている

---

## まとめ — マッキーさんが今すぐやるべきことは何？

**今すぐ**: 何もしない (コードは push 済み、旧ドメインで普通に動いている)。

**今日中にやれる準備**:
1. Vercel ダッシュボードを開いて Step 1 を実施 (yvoiceonline.com を追加)
2. ドメイン会社の DNS 管理画面で Step 2 を実施 (A + CNAME)
3. 数時間〜半日待って Step 3 (SSL 発行) と Step 4 (動作確認)

**翌日以降にやれる準備**:
4. Step 5 (Supabase に Redirect URL 追加)
5. Step 7 (Twilio / LiveKit 確認 — おそらく何もしない)
6. Step 8 (Vercel に NEXT_PUBLIC_SITE_URL 追加して再デプロイ)
7. Step 9 (Google Search Console)

**1 ヶ月以上経ってから**:
8. Step 10 (301 redirect)
