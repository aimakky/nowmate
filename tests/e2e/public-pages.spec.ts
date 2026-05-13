import { expect, test } from '@playwright/test'

// 認証不要の公開ページが致命的エラーなく表示されることを確認するスモーク。
// これらのページが 5xx / Application error / 真っ白画面に変わると即座に検知する。

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/safety',
  '/terms',
  '/privacy',
  '/contact',
] as const

for (const path of PUBLIC_PATHS) {
  test(`${path} が 4xx/5xx を返さない`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response, `no response from ${path}`).not.toBeNull()
    expect(response!.status(), `unexpected status for ${path}`).toBeLessThan(400)
  })

  test(`${path} に Next.js error overlay が出ていない`, async ({ page }) => {
    await page.goto(path)
    // Next.js 14 の dev error overlay は data-nextjs-dialog-overlay 等の
    // 専用属性を持つ。production build では別の error.tsx に飛ぶ。
    // どちらでも「Application error」の典型文字列が出ていないことを確認。
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/Application error: a (client|server)-side exception/i)
    expect(body).not.toMatch(/500 Internal Server Error/i)
  })
}
