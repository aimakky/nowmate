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
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { phone, otp } = await req.json()
    if (!phone || !otp) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 })
    }

    // 同じハッシュ化ロジックで比較
    const otpHash = createHash('sha256').update(otp + user.id).digest('hex')

    // RPC呼び出し（SECURITY DEFINERでRLSバイパス）
    const { data, error } = await supabase.rpc('verify_phone_otp_and_trust', {
      p_phone:    phone,
      p_otp_hash: otpHash,
    })

    if (error) {
      console.error('verify RPC error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = data as { success?: boolean; error?: string }

    if (result.error) {
      if (result.error === 'already_verified') {
        return NextResponse.json({ success: true, already: true })
      }
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('verify-otp error:', e)
    return NextResponse.json({ error: e.message ?? '認証に失敗しました' }, { status: 500 })
  }
}
