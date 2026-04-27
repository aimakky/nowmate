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
async function sendSms(to: string, body: string) {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_PHONE_NUMBER

  if (!sid || !token || !from) {
    throw new Error('Twilio環境変数が未設定です (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER)')
  }

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
    const err = await res.json()
    throw new Error(err.message ?? 'SMS送信失敗')
  }
  return res.json()
}

// ── POST /api/phone/send-otp ────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace('Bearer ', '').trim()

    const supabase = makeSupabaseClient(accessToken)

    // ユーザー確認
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { phone } = await req.json()
    if (!phone) {
      return NextResponse.json({ error: '電話番号が必要です' }, { status: 400 })
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
      console.error('OTP insert error:', insertErr)
      return NextResponse.json({ error: 'OTPの保存に失敗しました' }, { status: 500 })
    }

    // SMS送信
    await sendSms(phone, `【VILLIA】認証コード: ${otp}\n有効期限10分。他人に教えないでください。`)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('send-otp error:', e)
    return NextResponse.json({ error: e.message ?? 'SMS送信に失敗しました' }, { status: 500 })
  }
}
