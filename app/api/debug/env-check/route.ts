// ⚠️ TEMPORARY DEBUG ENDPOINT
//
// LiveKit env vars が production runtime に届いているかを判定するためだけの一時 API。
// **値そのものは絶対に返さない**。boolean (presence) のみ。
//
// 切り分けが終わり次第このファイルを削除する（同じ commit/PR で）。
// このファイル削除を忘れないこと。
//
// 想定使い方:
//   curl https://www.nowmatejapan.com/api/debug/env-check
//   →
//   {
//     "LIVEKIT_API_KEY": true,
//     "LIVEKIT_API_SECRET": true,
//     "NEXT_PUBLIC_LIVEKIT_URL": false,   ← ここが false なら投入漏れ
//     "env": "production",
//     "deployId": "dpl_xxx"
//   }

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function present(v: string | undefined): boolean {
  // undefined / 空文字 / 空白のみ を未設定として扱う
  return typeof v === 'string' && v.trim().length > 0
}

export async function GET() {
  return NextResponse.json({
    LIVEKIT_API_KEY:         present(process.env.LIVEKIT_API_KEY),
    LIVEKIT_API_SECRET:      present(process.env.LIVEKIT_API_SECRET),
    NEXT_PUBLIC_LIVEKIT_URL: present(process.env.NEXT_PUBLIC_LIVEKIT_URL),
    env:      process.env.VERCEL_ENV       ?? 'local',
    deployId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    nodeEnv:  process.env.NODE_ENV         ?? 'unknown',
  })
}
