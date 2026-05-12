// Playwright E2E 用の最小限の mock Supabase server。
//
// 目的:
//   - dummy env (http://127.0.0.1:54321) を指した supabase-js クライアントが
//     ECONNREFUSED で undici 内部 retry に入り、各ページレンダーで 7 秒待たされる
//     のを防ぐ。
//   - すべてのリクエストに即 401 を返すことで、auth.getUser() / from().select() が
//     ミリ秒単位で「セッション無し」エラーを取得し、app は「ログアウト状態の
//     アプリ」として高速に動作する。
//
// 安全性:
//   - 127.0.0.1 でしか listen しないので外部からは到達不能。
//   - 本物のデータは一切返さない (常に 401 とエラー JSON のみ)。
//   - PORT=54321 は Supabase local dev のデフォルトで、本番にも CI 永続環境にも
//     影響しない (各 job ごとに ephemeral)。

const http = require('node:http')

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 54321)
const HOST = process.env.MOCK_SUPABASE_HOST || '127.0.0.1'

const server = http.createServer((req, res) => {
  // すべてのエンドポイントで 401 を返す。
  // supabase-js / postgrest-js / gotrue-js のいずれも 401 を見ると
  // 「セッションなし / 認証されていない」として静かに扱う。
  res.statusCode = 401
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(
    JSON.stringify({
      code: 401,
      error: 'unauthorized',
      message: 'mock-supabase: no session (Playwright E2E)',
    }),
  )
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // 既に立ち上がっている (reuseExistingServer 経由) なら exit 0 でスキップ
    console.error(`[mock-supabase] port ${PORT} already in use; exiting`)
    process.exit(0)
  }
  console.error('[mock-supabase] server error:', err)
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  console.log(`[mock-supabase] listening on http://${HOST}:${PORT}`)
})

// SIGTERM で正常終了 (Playwright が webServer を kill する時)
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    server.close(() => process.exit(0))
  })
}
