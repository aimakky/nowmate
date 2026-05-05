import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'

function makeSupabaseClient(accessToken?: string) {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
      global: accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    }
  )
}

// ── POST /api/phone/verify-otp ──────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const authHeader  = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace('Bearer ', '').trim()

    const supabase = makeSupabaseClient(accessToken)

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    const { phone, otp } = await req.json()
    if (!phone || !otp) {
      return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
    }

    // 同じハッシュ化ロジックで比較
    const otpHash = createHash('sha256').update(otp + user.id).digest('hex')

    // RPC呼び出し（SECURITY DEFINERでRLSバイパス）
    const { data, error } = await supabase.rpc('verify_phone_otp_and_trust', {
      p_phone:    phone,
      p_otp_hash: otpHash,
    })

    if (error) {
      console.error('[phone/verify-otp] RPC error:', error)
      // RPC の生メッセージはクライアントに渡さない
      return NextResponse.json({ error: 'verify_failed' }, { status: 500 })
    }

    // 旧実装は data が null のとき result.error 参照で TypeError → 500 を返していた。
    // null は「OTP が見つからない / 期限切れ」のシグナル扱いに正規化。
    const result = (data ?? null) as { success?: boolean; error?: string } | null
    if (!result) {
      return NextResponse.json({ error: 'invalid_otp' }, { status: 400 })
    }

    if (result.error) {
      if (result.error === 'already_verified') {
        return NextResponse.json({ success: true, already: true })
      }
      // 既知のエラーコードはそのまま、それ以外はサーバーログのみ
      const known = ['invalid_otp', 'expired_otp', 'invalid_phone']
      const code = known.includes(result.error) ? result.error : 'verify_failed'
      if (code === 'verify_failed') console.error('[phone/verify-otp] unknown rpc error:', result.error)
      return NextResponse.json({ error: code }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[phone/verify-otp] error:', e)
    return NextResponse.json({ error: 'verify_failed' }, { status: 500 })
  }
}
