import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createHash, randomInt } from 'crypto'

// ── Supabaseクライアント（ユーザーJWT付き） ─────────────────────────────
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

// ── Twilio SMS送信 ──────────────────────────────────────────────────────
// 環境変数チェックはルートハンドラ側で行う（クライアントへ env 名を漏らさないため）
async function sendSms(sid: string, token: string, from: string, to: string, body: string) {
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    }
  )

  if (!res.ok) {
    // Twilio のエラー本文はサーバーログだけに残し、クライアントには汎用メッセージ
    const err = await res.json().catch(() => ({}))
    console.error('[phone/send-otp] twilio error', err)
    throw new Error('sms_send_failed')
  }
  return res.json()
}

// ── POST /api/phone/send-otp ────────────────────────────────────────────
export async function POST(req: Request) {
  // 1) Twilio env チェック — 未設定なら 503 not_configured（LiveKit と同じパターン）。
  //    内部の変数名（TWILIO_ACCOUNT_SID 等）はクライアントに絶対漏らさない。
  //    どの env が欠けているかはサーバーログのみに残す。
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_PHONE_NUMBER
  if (!sid || !token || !from) {
    const missing = [
      !sid   && 'TWILIO_ACCOUNT_SID',
      !token && 'TWILIO_AUTH_TOKEN',
      !from  && 'TWILIO_PHONE_NUMBER',
    ].filter(Boolean)
    console.error('[phone/send-otp] env missing:', missing)
    return NextResponse.json({ error: 'sms_not_configured' }, { status: 503 })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace('Bearer ', '').trim()

    const supabase = makeSupabaseClient(accessToken)

    // ユーザー確認
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    const { phone } = await req.json()
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
    }

    // 6桁OTP生成
    const otp     = String(randomInt(100000, 999999))
    const otpHash = createHash('sha256').update(otp + user.id).digest('hex')

    // 古いOTPを削除
    await supabase.from('phone_otps')
      .delete()
      .eq('user_id', user.id)

    // 新OTP保存（10分有効）
    const { error: insertErr } = await supabase.from('phone_otps').insert({
      user_id:    user.id,
      phone,
      otp_hash:   otpHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    if (insertErr) {
      console.error('[phone/send-otp] OTP insert error:', insertErr)
      return NextResponse.json({ error: 'otp_save_failed' }, { status: 500 })
    }

    // SMS送信（旧ブランド「自由村」→ samee → YVOICE）
    await sendSms(sid, token, from, phone, `【YVOICE】認証コード: ${otp}\n有効期限10分。他人に教えないでください。`)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[phone/send-otp] error:', e)
    // 内部メッセージはクライアントに渡さない（汎用コードのみ）
    return NextResponse.json({ error: 'sms_send_failed' }, { status: 500 })
  }
}
