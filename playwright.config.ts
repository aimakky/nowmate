import { defineConfig, devices } from '@playwright/test'

// YVOICE E2E スモークテスト設定。
//
// 設計方針:
//   1. テストはすべて公開ページ + middleware の auth-redirect 動作のみを対象。
//      Supabase Auth 突破 / DB シード / 投稿系 / 通話系は本フェーズでは行わない。
//   2. webServer は `npm run dev` を起動。既存の dev server があれば再利用。
//   3. baseURL は http://localhost:3000 固定。本番 URL は絶対に向けない。
//   4. env 未設定でも middleware が空文字 fallback で起動する作りなので、
//      Playwright 用にダミー env を inject して redirect 系テストを安定化させる。
//      ダミー値は実在しないドメインなので Supabase API には接続できず、
//      auth.getUser() は null を返し、middleware が /login へ redirect する。
//   5. iPhone 13 viewport を 1 project として常時実行 (YVOICE はスマホ前提)。

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // YVOICE は私的な大人向けコミュニティ。実画面でも DM 等の機微情報が
    // 写ることがあるため、テストでは minimal locale + ja に統一。
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // YVOICE はスマホ前提なので必ず 1 project は iPhone 相当を回す。
      name: 'mobile-chrome-iphone13',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // Next.js cold start は 30-60s かかるため余裕を持たせる
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      // 既存 .env.local があればそちらが優先される (Next.js が読む)。
      // 何もない環境でも middleware が空文字 fallback 経由で redirect を
      // 出すための最低限のダミー env を inject。
      // ⚠ 実在しないドメインを意図して指定。Supabase API には到達しないため
      //    本番 DB / staging DB のいずれにも一切影響しない。
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://playwright-test.invalid',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'playwright-test-fake-anon-key',
    },
  },
})
