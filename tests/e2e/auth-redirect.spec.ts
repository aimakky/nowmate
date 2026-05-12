import { expect, test } from '@playwright/test'

// 未ログインで保護ルートを開いたら必ず /login へ redirect されることを確認。
//
// 過去事例: 「ログイン後に毎回ログイン画面へ戻される」「保護ルートが
// うっかり全公開になっていた」等を自動検知する土台。
//
// middleware.ts の protectedPaths に登録されているルートのうち、特に
// 利用頻度が高い 8 本を代表として確認する。全件を網羅するとテスト時間
// が増えるので、代表で十分。

const PROTECTED_PATHS = [
  '/timeline',
  '/mypage',
  '/notifications',
  '/chat',
  '/guilds',
  '/villages',
  '/voice',
  '/settings',
] as const

for (const path of PROTECTED_PATHS) {
  test(`${path} は未ログインで /login へ redirect される`, async ({ page }) => {
    await page.goto(path)
    // server-side redirect でも client-side でも、最終 URL が /login で
    // 始まっていれば OK。クエリパラメータ (?redirect_to=...) はあってもなくても可。
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })
}
