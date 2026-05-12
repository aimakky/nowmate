# YVOICE E2E Tests (Playwright)

このディレクトリは Playwright で書かれた YVOICE の E2E スモークテストです。

## 実行方法

```bash
# 依存インストール (初回のみ)
npm install
npx playwright install chromium

# テスト実行 (headless)
npm run test:e2e

# UI モード (テスト選択 + ブラウザ目視)
npm run test:e2e:ui

# ブラウザを開いて見ながら実行
npm run test:e2e:headed

# 直近のレポートを開く
npm run test:e2e:report
```

`npm run test:e2e` を実行すると Playwright が自動で `npm run dev` を起動します
(既に dev server が起動していれば再利用)。

## 環境変数

- `.env.local` に Supabase / LiveKit 等の env が設定されていれば dev server がそのまま使う。
- 設定されていない場合、`playwright.config.ts` がダミー env (`https://playwright-test.invalid`)
  を inject するため、middleware は redirect 動作する。
- **Playwright テストは本番 / staging Supabase に一切接続しません**
  (ダミー URL は実在しないため API 呼び出しがネットワーク層で失敗する)。

## 現状のテスト範囲 (Phase 1: スモークのみ)

| ファイル | 内容 |
|---|---|
| `home.spec.ts` | LP (`/`) が表示され、ブランド名 + ログイン導線が出ること |
| `public-pages.spec.ts` | `/login`, `/signup`, `/safety`, `/terms`, `/privacy`, `/for-business`, `/contact` が 4xx/5xx を返さない |
| `auth-redirect.spec.ts` | 保護ルート 8 本 (`/timeline`, `/mypage`, `/notifications`, `/chat`, `/guilds`, `/villages`, `/voice`, `/settings`) が `/login` へ redirect されること |
| `mobile-smoke.spec.ts` | iPhone 13 viewport で LP に横スクロールが出ない / CTA が見える / `/login` フォームが描画される |

## TODO (Phase 2 以降)

### 認証突破系 (要設計)
- [ ] **テスト専用ユーザーの用意** — staging Supabase に `playwright_test_user@yvoice-test.invalid`
      のようなテスト専用アカウントを 1 つ作る。本番アカウントは絶対に使わない。
- [ ] **storageState 経由のログイン保持** — `tests/e2e/.auth/user.json` に
      `BrowserContext.storageState()` を保存して、テストごとにログインし直さない構成へ。
- [ ] **環境変数** — `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` を
      `.env.test.local` (gitignore 済み) に置いて `playwright.config.ts` で参照。

### 認証後の主要フロー (要マッキー判断)
- [ ] タイムライン投稿 → いいね → リロード後も状態保持
- [ ] マイページ vs 他人マイページの表示差分検証
- [ ] ギルド / ゲーム村 / いますぐ村の各タブが描画される
- [ ] 通知タブの主要カードが描画される
- [ ] DM 画面が表示される (実送信はしない)
- [ ] プロフィール編集画面が表示される
- [ ] 本人確認バッジが正しく表示される

### スマホ表示の細部 (要マッキー判断)
- [ ] 下部タスクバーが iPhone 13 viewport で全タブ表示される
- [ ] 投稿カードのいいねボタンが押せる位置にある (visual regression)
- [ ] スクロール時の sticky bar の挙動 (skeleton ↔ loaded ズレ)

### CI 連携 (要マッキー判断)
- [ ] GitHub Actions に Playwright job を追加 (任意実行 → 軽 / 重要画面のみ → 全件、と段階導入)
- [ ] PR ごとに自動実行する場合は、staging 用 env を GitHub Secrets に設定
- [ ] 失敗時のスクリーンショット / video / trace を artifact 化
- [ ] `playwright-report/` を GitHub Pages に publish するかは要相談

## 安全ポリシー

1. **本番 / staging Supabase の DB を絶対に書き換えない。** テストは read-only
   または専用テスト DB / RLS でガードされた範囲のみを対象とする。
2. **本番 LiveKit / Stripe / Twilio を絶対に呼び出さない。** これらの
   integration test が必要になったら mock サーバー (msw など) を別途検討。
3. **flaky なテストは即修正 or 削除。** 「たまに落ちる」はテスト土台の信頼を破壊する。
4. **テスト実行時間を 5 分以内に保つ。** スモークは 1 分程度を目標。
