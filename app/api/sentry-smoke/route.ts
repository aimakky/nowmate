// **TEMPORARY** Sentry smoke test endpoint.
// 削除タイミング: Sentry MCP で Issue 受信を確認した直後の cleanup commit。
//
// 仕組み:
//   - POST /api/sentry-smoke + header `x-smoke-token: <SMOKE_TOKEN>` で
//     意図的に Error を throw する。
//   - throw された Error は instrumentation.ts の onRequestError (= @sentry/nextjs)
//     経由で Sentry に送信される。Sentry 側で Issue 化されることを実取得で確認する。
//
// 命名:
//   - Next.js App Router の規約: `_` プレフィックスのフォルダは private folder と
//     してルーティング対象外になるため、underscore 無しの素のパス名を採用。
//
// 安全性:
//   - POST only (browser 直叩き不可)
//   - x-smoke-token が不一致 / 無し → 404 (route の存在を秘匿)
//   - GET → 405
//   - 検証後すぐに同 branch で削除 commit する一時 endpoint。
//
// 一般ユーザーへのリスク:
//   - 偶発トリガ不可 (POST + 64 hex token 必須)
//   - DB 書き込みなし
//   - 副作用は「Sentry に Issue が 1 件追加される」のみ

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SMOKE_TOKEN = '6105a7634e88ebaf3081be0a6c5fcc8facc35c57dbd778f352afcf28059b9d04'

export async function POST(req: Request) {
  const token = req.headers.get('x-smoke-token') ?? ''
  if (token !== SMOKE_TOKEN) {
    return new NextResponse('Not Found', { status: 404 })
  }
  const stamp = Date.now()
  throw new Error(`sentry-smoke-test-${stamp}`)
}

export async function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 })
}
