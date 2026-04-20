# nowjp — セットアップ完全ガイド

> 所要時間：約30〜45分。Node.jsさえあればデプロイまで完走できます。

---

## 📋 全体の流れ

```
1. Node.js インストール
2. パッケージインストール（npm install）
3. Supabase プロジェクト作成
4. DBテーブル作成（SQLをコピペ）
5. Storage（画像）設定
6. 環境変数設定
7. ローカルで動作確認
8. Vercel にデプロイ
9. Supabase の認証URL設定
```

---

## STEP 1: Node.js インストール

https://nodejs.org/ にアクセスして **LTS版** をダウンロード・インストール。

確認コマンド（コマンドプロンプトで実行）：
```
node -v   → v18以上が表示されればOK
npm -v    → 9以上
```

---

## STEP 2: パッケージインストール

コマンドプロンプトを開いて：
```
cd C:\Users\makky\OneDrive\Desktop\nowjp
npm install
```
数分かかります。エラーなく完了すればOK。

---

## STEP 3: Supabase プロジェクト作成

1. https://supabase.com/ → 「Start your project」でアカウント作成
2. 「New project」をクリック
3. 設定：
   - Name: `nowjp`
   - Database Password: 安全なパスワードを設定（メモしておく）
   - Region: **Northeast Asia (Tokyo)**
4. 「Create new project」→ 1〜2分待つ

---

## STEP 4: データベース作成

### 4-1. テーブル作成（Migration 001）

Supabase ダッシュボード → 左メニュー「SQL Editor」→「New query」

**`supabase/migrations/001_initial.sql`** の中身を全部コピーして貼り付け → 「Run」

✅ 「Success」と表示されればOK

### 4-2. Premium・通知テーブル追加（Migration 002）

同様に「New query」を開いて

**`supabase/migrations/002_premium_notifications.sql`** の中身をコピーして貼り付け → 「Run」

---

## STEP 5: Storage（画像保存）設定

Supabase ダッシュボード → 「Storage」→「New bucket」

| 設定項目 | 値 |
|---|---|
| Bucket name | `avatars` |
| Public bucket | ✅ ON |

作成後、「avatars」バケット → 「Policies」タブ → 「Add Policies」

**① 読み取り (SELECT)**
```
Policy name: Public read
Target roles: anon, authenticated
Policy definition: true
```

**② アップロード (INSERT)**
```
Policy name: Auth upload
Target roles: authenticated
Policy definition: auth.uid() is not null
```

**③ 更新 (UPDATE)**
```
Policy name: Auth update
Target roles: authenticated
Policy definition: auth.uid() is not null
```

---

## STEP 6: 環境変数設定

1. プロジェクトフォルダ内の `.env.local.example` を **コピーして** `.env.local` という名前で保存
2. Supabase ダッシュボード → 「Settings」→「API」
3. 以下をコピーして `.env.local` に貼り付け：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ `.env.local` は絶対に Git にコミットしないでください（`.gitignore` に含まれています）

---

## STEP 7: ローカルで動作確認

```
npm run dev
```

ブラウザで **http://localhost:3000** を開く。

チェックリスト：
- [ ] トップページが表示される
- [ ] 「Get Started」ボタンが動く
- [ ] メール登録→確認メールが届く
- [ ] オンボーディングが完了できる
- [ ] ホームにユーザーが表示される（2人以上登録して確認）

---

## STEP 8: Vercel にデプロイ

### 8-1. GitHub にプッシュ

```
git init
git add .
git commit -m "feat: nowjp MVP initial release"
```

GitHub.com でリポジトリを新規作成して、表示されるコマンドを実行：
```
git remote add origin https://github.com/あなたのID/nowjp.git
git branch -M main
git push -u origin main
```

### 8-2. Vercel でデプロイ

1. https://vercel.com/ → 「Add New Project」
2. GitHubのリポジトリを選択
3. 「Environment Variables」に `.env.local` の2行を入力
4. 「Deploy」をクリック

🎉 数分でURLが発行されます（例: `https://nowjp-xxxx.vercel.app`）

---

## STEP 9: Supabase 認証URL設定（重要！）

これをしないとメール確認後に正しくリダイレクトされません。

Supabase ダッシュボード → 「Authentication」→「URL Configuration」

| 項目 | 値 |
|---|---|
| Site URL | `https://あなたのVercelURL.vercel.app` |
| Redirect URLs | `https://あなたのVercelURL.vercel.app/auth/callback` |

「Save」をクリック。

---

## 🔧 よくあるトラブル

| 症状 | 原因 | 解決策 |
|---|---|---|
| `npm install` でエラー | Node.jsが古い | v18以上に更新 |
| メール確認後にエラー | Redirect URL未設定 | STEP 9を確認 |
| ユーザーが表示されない | RLSポリシーの問題 | SQL Editor で `select * from profiles` が返るか確認 |
| 画像がアップロードできない | Storageポリシー未設定 | STEP 5のINSERTポリシーを確認 |
| ログインできない | .env.localの値が間違い | Supabase APIページで再確認 |
| Vercelでビルドエラー | env変数が未入力 | Vercelのダッシュボード → Environment Variables確認 |

---

## 📁 ファイル構成（完全版）

```
nowjp/
├── app/
│   ├── auth/callback/route.ts    ← メール認証コールバック
│   ├── (app)/
│   │   ├── layout.tsx            ← BottomNav共通
│   │   ├── home/                 ← ユーザー一覧・いいね・マッチ
│   │   ├── search/               ← 詳細検索（年齢・言語フィルタ）
│   │   ├── matches/              ← マッチ一覧
│   │   ├── chat/                 ← チャット一覧
│   │   ├── chat/[matchId]/       ← リアルタイムチャット
│   │   ├── profile/[userId]/     ← 他ユーザープロフィール
│   │   ├── onboarding/           ← 初回プロフィール作成（5ステップ）
│   │   ├── mypage/               ← 自分のプロフィール・統計・Premium
│   │   └── settings/             ← プロフィール編集
│   ├── page.tsx                  ← トップページ（Landing）
│   ├── login/                    ← ログイン
│   ├── signup/                   ← 新規登録
│   ├── terms/                    ← 利用規約
│   ├── privacy/                  ← プライバシーポリシー
│   └── contact/                  ← お問い合わせ
│
├── components/
│   ├── ui/       Button, Avatar, Badge, Input, Toast
│   ├── features/ UserCard, ChatBubble, ReportModal, MatchModal
│   │             ProfileCompletionBanner
│   └── layout/   BottomNav（通知バッジ付き）, Header
│
├── hooks/
│   └── useToast.ts
│
├── lib/
│   ├── constants.ts   国籍・言語・目的の定数
│   ├── utils.ts       ユーティリティ関数
│   └── supabase/      client.ts, server.ts
│
├── supabase/migrations/
│   ├── 001_initial.sql          全テーブル + RLS
│   └── 002_premium_notifications.sql  Premium + 通知
│
├── public/
│   └── manifest.json            PWA対応
│
├── middleware.ts                 認証ガード
└── SETUP.md                     ← このファイル
```

---

## 🚀 次のステップ（MVP後）

### Week 2〜4（すぐにやること）
- [ ] メール通知（マッチ成立・新着メッセージ）→ Supabase Edge Functions + Resend
- [ ] OGP画像（og-image.png）を作成 → Figmaで作って public/ に配置
- [ ] PWAアイコン（icon-192.png, icon-512.png）を作成

### Month 2
- [ ] Premium課金実装 → Stripe連携
- [ ] プッシュ通知 → Firebase FCM
- [ ] 管理画面（通報対応） → Supabase Studio or 専用ページ

### Month 3〜
- [ ] AI翻訳チャット → OpenAI API
- [ ] グループチャット
- [ ] iOS/Androidアプリ → React Native (Expo)

---

## 💡 運用コスト目安（月額）

| サービス | 無料枠 | 有料 |
|---|---|---|
| Supabase | 50,000 MAU, 500MB DB | $25〜/月 |
| Vercel | 100GB帯域 | $20〜/月 |
| 合計 | **$0（〜数百ユーザーまで）** | $45〜/月 |

---

作成: nowjp Engineering Team
更新: 2024年
