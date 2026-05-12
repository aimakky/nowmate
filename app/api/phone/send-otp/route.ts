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

    // ── Rate limit (2026-05-10 リリース前 Critical 修正) ──
    // SMS 課金爆発と DoS 防止のため、OTP 送信に 2 段階の rate limit を入れる:
    //   1. resend cooldown: 同一 user で 60 秒以内の再送禁止
    //   2. daily cap: 同一 user の過去 24 時間で最大 5 回まで
    // 実装: phone_otps の created_at を SELECT して JS で判定 (新規 column 不要)。
    // 既存 row が delete される前に判定するので、削除タイミングの順序を変えた。
    const NOW = Date.now()
    const COOLDOWN_MS = 60 * 1000
    const DAY_MS      = 24 * 60 * 60 * 1000
    const DAILY_CAP   = 5

    const { data: recentOtps, error: recentErr } = await supabase
      .from('phone_otps')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(NOW - DAY_MS).toISOString())
      .order('created_at', { ascending: false })
    if (recentErr) {
      console.error('[phone/send-otp] rate-limit lookup error:', recentErr)
      // RLS / 一時障害でクエリ失敗時は安全側 (送信拒否) ではなく素通しを選ぶ
      // (= 正規ユーザーが認証できなくなる方がリリース直後の事故影響が大きい)
    } else if (recentOtps && recentOtps.length > 0) {
      // 1) resend cooldown
      const last = new Date(recentOtps[0].created_at).getTime()
      if (NOW - last < COOLDOWN_MS) {
        const remainSec = Math.ceil((COOLDOWN_MS - (NOW - last)) / 1000)
        return NextResponse.json(
          { error: 'rate_limited', cooldown_seconds: remainSec },
          { status: 429 },
        )
      }
      // 2) daily cap
      if (recentOtps.length >= DAILY_CAP) {
        return NextResponse.json(
          { error: 'daily_limit_exceeded' },
          { status: 429 },
        )
      }
    }

    // 6桁OTP生成
    const otp     = String(randomInt(100000, 999999))
    const otpHash = createHash('sha256').update(otp + user.id).digest('hex')

    // 古い OTP を「即時 expire」(2026-05-10 修正): 旧実装は .delete() で履歴
    // ごと消していたため、上の rate limit 判定 (created_at で過去 24h を数える)
    // が動作しなかった。expires_at を「すでに切れた状態」に update することで:
    //   - verify_phone_otp_and_trust RPC は expires_at > now() でフィルタする
    //     ため、古い OTP は自動的に無効
    //   - phone_otps の created_at 行は残るので rate limit が正しく機能
    // 1 時間以上前の expires_at に変更すれば実質 invalidated と等価。
    await supabase.from('phone_otps')
      .update({ expires_at: new Date(NOW - 60 * 1000).toISOString() })
      .eq('user_id', user.id)
      .gt('expires_at', new Date(NOW).toISOString())  // 既に expire 済みは触らない

    // 新OTP保存（10分有効）
    const { error: insertErr } = await supabase.from('phone_otps').insert({
      user_id:    user.id,
      phone,
      otp_hash:   otpHash,
      expires_at: new Date(NOW + 10 * 60 * 1000).toISOString(),
    })
    if (insertErr) {
      console.error('[phone/send-otp] OTP insert error:', insertErr)
      return NextResponse.json({ error: 'otp_save_failed' }, { status: 500 })
    }

    // SMS送信（YVOICE ブランド名でユーザーに届く）
    await sendSms(sid, token, from, phone, `【YVOICE】認証コード: ${otp}\n有効期限10分。他人に教えないでください。`)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[phone/send-otp] error:', e)
    // 内部メッセージはクライアントに渡さない（汎用コードのみ）
    return NextResponse.json({ error: 'sms_send_failed' }, { status: 500 })
  }
}
