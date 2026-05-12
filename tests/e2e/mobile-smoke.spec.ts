import { expect, test } from '@playwright/test'

// スマホ viewport (iPhone 13) でレイアウトが致命的に壊れていないことを確認。
//
// 過去事例: 「スマホ幅でタブやカードの高さがズレる」「スマホで横スクロール
// が出る」等を自動検知する土台。
//
// このテストはどの project でも動くが、特に mobile-chrome-iphone13 project
// で実行されたときに意味のある assert を行う。

test.describe('mobile viewport (iPhone 13)', () => {
  test('LP に横スクロールが発生していない', async ({ page }) => {
    await page.goto('/')
    const viewport = page.viewportSize()
    // viewport 幅と document の scrollWidth を比較。
    // 1px のサブピクセル誤差は許容するため +1 余裕を持たせる。
    const overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        innerWidth:  window.innerWidth,
      }
    })
    expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(
      (viewport?.width ?? overflow.clientWidth) + 1
    )
  })

  test('LP の主要 CTA (ログイン or はじめる) が画面内に表示される', async ({ page }) => {
    await page.goto('/')
    // /login へのリンク、または /signup へのリンクのどちらかが viewport 内に
    // 1 つ以上 visible であることを確認。
    const cta = page
      .locator('a[href="/login"], a[href^="/login?"], a[href="/signup"], a[href^="/signup?"]')
      .first()
    await expect(cta).toBeVisible()
  })

  test('/login 画面のフォーム要素が表示される', async ({ page }) => {
    await page.goto('/login')
    // login フォームの email/password input が描画されること。
    // (auth check 中は描画が遅れる場合があるので timeout を広めに取る)
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible({ timeout: 10_000 })
  })
})
