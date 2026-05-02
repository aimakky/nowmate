// LiveKit access token issuance
//
// 設計:
//  - サーバー側 (Node runtime) のみ。LIVEKIT_API_KEY / LIVEKIT_API_SECRET はクライアントへ漏らさない
//  - Supabase 認証必須（@supabase/ssr の cookie ベース）
//  - voice_rooms テーブルに該当ルームが存在し status != 'closed' であることを確認
//  - canPublish=true は常に許可（クライアント側で is_listener により mic enable 制御）
//    → 昇格時に再 token しなくて済む
//  - identity = supabase user_id（重複/なりすまし不可）

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { AccessToken } from 'livekit-server-sdk'

export const runtime = 'nodejs'

interface TokenBody {
  roomId?: string
}

export async function POST(request: NextRequest) {
  // 1) 環境変数チェック
  const apiKey    = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const lkUrl     = process.env.NEXT_PUBLIC_LIVEKIT_URL
  if (!apiKey || !apiSecret || !lkUrl) {
    return NextResponse.json(
      { error: 'LiveKit not configured (LIVEKIT_API_KEY / LIVEKIT_API_SECRET / NEXT_PUBLIC_LIVEKIT_URL).' },
      { status: 500 },
    )
  }

  // 2) Body
  let body: TokenBody = {}
  try { body = (await request.json()) as TokenBody } catch { /* noop */ }
  const roomId = body.roomId
  if (!roomId || typeof roomId !== 'string') {
    return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
  }

  // 3) Supabase 認証
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() { /* read-only on token issuance */ },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // 4) ルームの存在 + closed 状態チェック
  const { data: room, error: roomErr } = await supabase
    .from('voice_rooms')
    .select('id, status')
    .eq('id', roomId)
    .maybeSingle()
  if (roomErr) {
    return NextResponse.json({ error: 'db error' }, { status: 500 })
  }
  if (!room) {
    return NextResponse.json({ error: 'room not found' }, { status: 404 })
  }
  if (room.status === 'closed') {
    return NextResponse.json({ error: 'room is closed' }, { status: 410 })
  }

  // 5) display_name を identity-name に使用（任意フィールド）
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()
  const displayName = (profile?.display_name as string | undefined) ?? `User-${user.id.slice(0, 6)}`

  // 6) AccessToken 生成
  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: displayName,
    ttl: 60 * 60, // 1h
  })
  at.addGrant({
    room:           `samee-voice-${roomId}`,
    roomJoin:       true,
    canPublish:     true,   // listener でも mic enable は client 側で制御するため一律 true
    canSubscribe:   true,
    canPublishData: true,   // 将来のデータチャンネル拡張用
  })

  const token = await at.toJwt()
  return NextResponse.json({ token, url: lkUrl, roomName: `samee-voice-${roomId}` })
}
