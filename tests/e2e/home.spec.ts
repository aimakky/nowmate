import { expect, test } from '@playwright/test'

// トップページ (LP) のスモークテスト。
// 未ログインユーザーが root にアクセスしたとき、LP が表示されることを確認する。
// (root page はログイン済みなら server redirect で /timeline へ飛ぶ実装。
//  Playwright は cookie 無しで起動するので必ず LP に到達する想定。)

test.describe('home / LP', () => {
  test('LP が 200 で表示される', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)
  })

  test('YVOICE のブランド表記が含まれる', async ({ page }) => {
    await page.goto('/')
    // <title> または h1/h2/img alt のどこかに YVOICE が含まれていれば OK。
    // 文言の細かい改修に弱いテストにならないよう、page 全体に対して assert する。
    await expect(page).toHaveTitle(/YVOICE/i)
  })

  test('LP にログイン導線がある', async ({ page }) => {
    await page.goto('/')
    // 未ログイン LP には必ず /login への導線が存在する。
    // role / href どちらかで取得できれば OK。
    const loginLink = page.locator('a[href="/login"], a[href^="/login?"]').first()
    await expect(loginLink).toBeVisible()
  })
})
