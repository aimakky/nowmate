import { defineConfig, devices } from '@playwright/test'

// YVOICE E2E スモークテスト設定。
//
// 設計方針:
//   1. テストはすべて公開ページ + middleware の auth-redirect 動作のみを対象。
//      Supabase Auth 突破 / DB シード / 投稿系 / 通話系は本フェーズでは行わない。
//   2. webServer は CI 環境ではビルド済み production server (`npm run start`)、
//      ローカルでは hot reload 付き dev server (`npm run dev`) を起動。
//      ローカルで既存 dev server があれば再利用 (reuseExistingServer)。
//   3. baseURL は http://localhost:3000 固定。本番 URL は絶対に向けない。
//   4. env 未設定でも middleware が空文字 fallback で起動する作りなので、
//      Playwright 用にダミー env (http://127.0.0.1:54321) を inject。
//      さらに同じポートで mock-supabase-server.js を起動し、すべての
//      Supabase fetch に対して即 401 を返す。これで:
//        - auth.getUser() / from().select() などの server-side query が
//          undici の internal retry に巻き込まれて 7 秒待たされる問題を回避
//        - client-side hydration の fetch も即 401 で完了し loading 状態が解消
//      本番 / staging Supabase には絶対に到達しない (localhost で完結)。
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

  webServer: [
    // mock Supabase server を Next.js より先に起動する。
    // 何でも 401 を返すだけの最小実装。ms オーダーで応答するため
    // supabase-js が ECONNREFUSED で undici retry に巻き込まれない。
    //
    // ⚠ webServer は url ではなく port で readiness を判定する。
    //   url 方式だと Playwright の許可ステータスコード判定が version
    //   によって異なる場合があり、401 を ready とみなさないと無限待ちになる。
    //   port 方式なら TCP listen が確認できた時点で進む。
    {
      command: 'node tests/e2e/mock-supabase-server.js',
      port: 54321,
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    // Next.js 本体。CI ではビルド済み production server (`npm run start`)、
    // ローカルでは hot reload 付き dev server (`npm run dev`) を起動。
    {
      command: process.env.CI ? 'npm run start' : 'npm run dev',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      // Next.js cold start は 30-60s かかるため余裕を持たせる
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        // 既存 .env.local があればそちらが優先される (Next.js が読む)。
        // dummy env は localhost の mock Supabase server を指す。
        // 本番 / staging Supabase には絶対に到達しない。
        NEXT_PUBLIC_SUPABASE_URL:
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'playwright-test-fake-anon-key',
      },
    },
  ],
})
