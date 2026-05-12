# YVOICE

**YVOICE — Your Voice Online｜大人のゲーム通話コミュニティ**

20歳以上限定の、ゲーム仲間と「声」でつながる通話SNS。
電話番号認証 + 本人確認 + Trust Tier 制度で、安心して話せる場を守る。

> 出会い系ではなく、ゲーム仲間と遊ぶための通話コミュニティ。

---

## 主要機能

- タイムライン
- ギルド（10ジャンル：FPS / RPG / アクション / スポーツ / スマホゲーム / シミュ / パズル / インディー / レトロ / 雑談）
- ゲーム村（いますぐ集まれる通話部屋）
- 通話ルーム（LiveKit）
- フレンド / DM チャット / 通知
- 募集カード / ゲーム履歴書 / ゲーム名刺 / ゲーム相性
- 安心ガイド / 通報・運営管理

---

## 技術スタック

- **Framework**: Next.js 14 App Router / TypeScript
- **UI**: Tailwind CSS
- **Auth & DB**: Supabase (Auth + Postgres + Realtime + RLS)
- **本人確認**: Stripe Identity
- **電話認証**: Twilio SMS
- **通話**: LiveKit
- **決済**: Stripe
- **監視**: Sentry（導入予定）
- **Hosting**: Vercel

---

## 開発スタートアップ

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開く。

### 必要な環境変数（`.env.local`）

`.env.local.example` を参照。Supabase / Twilio / Stripe / LiveKit の各キーが必要。

---

## スクリプト

- `npm run dev` — 開発サーバ起動
- `npm run build` — 本番ビルド
- `npm run start` — 本番起動
- `npm run lint` — Lint

---

## ディレクトリ構成（概要）

```
app/             — Next.js App Router
  (app)/         — ログイン後の主要画面（timeline / group / guild / notifications / chat 等）
  api/           — API Route Handlers（phone / livekit / 等）
  auth/          — 認証コールバック
components/      — UI コンポーネント
lib/             — Supabase クライアント・サイト設定・ユーティリティ
supabase/        — DB マイグレーション（実行済みは触らない）
types/           — 型定義
```

---

## Claude Code で作業するときの永続ルール

`CLAUDE.md` に作業報告フォーマット・UI 修正の鉄則・触ってはいけない領域が定義されています。
必ず読んでから作業してください。

---

## ブランド情報

- サービス名: **YVOICE**（読み：ワイボイス、略：ワイボ）
- 正式名: Your Voice Online
- 対象: 20歳以上のゲーマー
- ドメイン: yvoiceonline.com（環境変数未設定時は旧ドメイン nowmatejapan.com にフォールバック）

リポジトリ root のフォルダ名・GitHub repo 名・Vercel project 名・Supabase project 名・旧ドメインは、サービス停止リスク回避のため別フェーズで段階移行します。ユーザー可視テキストは YVOICE に統一済み。
