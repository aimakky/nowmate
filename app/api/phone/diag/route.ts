// 診断専用エンドポイント（**TEMPORARY** — 原因特定後に削除）
//
// 何を返すか:
//  1. samee のサーバーから見て Twilio 関連の env が存在するか（boolean のみ・値は出さない）
//  2. Twilio Account API に SID/Token で認証通るか（HTTP status のみ）
//  3. 設定された From 番号が Twilio account に存在するか
//
// 認証: Supabase の logged-in user のみアクセス可。未ログインだと 401。
//
// 使い方（user 自身のセッションで）:
//   1. nowmatejapan.com にログイン
//   2. ブラウザの DevTools → Console で:
//        fetch('/api/phone/diag').then(r => r.json()).then(console.log)
//   3. 返ってきた JSON を見て原因特定
//
// 削除タイミング: Twilio が動き始めて電話認証が成功した時点で安全に消せる。
// LiveKit の env-check 診断（commit aa167ab）と同じパターン。

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  // ── 認証チェック（誰でも見られるエンドポイントにしない） ──
  const authHeader = req.headers.get('Authorization') ?? ''
  const accessToken = authHeader.replace('Bearer ', '').trim()
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
      global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // ── 1) env の有無（値は絶対に返さない・boolean のみ） ──
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_PHONE_NUMBER
  const env_present = {
    TWILIO_ACCOUNT_SID:           !!sid,
    TWILIO_AUTH_TOKEN:            !!token,
    TWILIO_PHONE_NUMBER:          !!from,
    NEXT_PUBLIC_SUPABASE_URL:     !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  // すべて揃っていない時点で 200 で返す（原因が一目で分かる）
  if (!sid || !token || !from) {
    return NextResponse.json({
      diagnosis: 'ENV_NOT_CONFIGURED',
      env_present,
      next_step: 'Vercel Settings → Environment Variables で Production / Preview / Development の 3 環境すべてに上記 false の env を投入し、Use existing build cache のチェックを外して Redeploy してください。',
    })
  }

  // ── 2) Twilio Account API への認証確認 ──
  // GET /Accounts/{SID}.json は creds が正しければ 200 を返す。
  // 401 → SID か Token が間違っている。
  // 404 → SID 自体が存在しない（アカウント削除など）。
  let twilio_account: { ok: boolean; status: number; sample_error: string | null } = {
    ok: false, status: 0, sample_error: null,
  }
  try {
    const accRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
      {
        method: 'GET',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        },
      },
    )
    twilio_account.ok     = accRes.ok
    twilio_account.status = accRes.status
    if (!accRes.ok) {
      const errBody = await accRes.json().catch(() => null) as any
      // Twilio のエラー message は安全に返せる（個人情報なし・パスワードなし）
      twilio_account.sample_error = errBody?.message ?? null
    }
  } catch (e) {
    twilio_account.sample_error = e instanceof Error ? e.message : String(e)
  }

  if (!twilio_account.ok) {
    return NextResponse.json({
      diagnosis: 'TWILIO_AUTH_FAILED',
      env_present,
      twilio_account,
      next_step: twilio_account.status === 401
        ? 'TWILIO_ACCOUNT_SID または TWILIO_AUTH_TOKEN が間違っています。Twilio Console → Account Info で値を再確認してください。'
        : `Twilio Account API が ${twilio_account.status} を返しました。Twilio Console でアカウント状態を確認してください。`,
    })
  }

  // ── 3) From 番号が Twilio account の incoming phone numbers に登録されているか ──
  let from_number_check: { ok: boolean; status: number; reason: string | null } = {
    ok: false, status: 0, reason: null,
  }
  try {
    // PhoneNumbers.json?PhoneNumber={from} で検索
    const phoneRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(from)}`,
      {
        method: 'GET',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        },
      },
    )
    from_number_check.status = phoneRes.status
    if (phoneRes.ok) {
      const body = await phoneRes.json().catch(() => null) as any
      const list = body?.incoming_phone_numbers ?? []
      from_number_check.ok = Array.isArray(list) && list.length > 0
      if (!from_number_check.ok) {
        from_number_check.reason = `Twilio account に From 番号 ${from} が登録されていません。Twilio Console で番号を購入し、TWILIO_PHONE_NUMBER に設定してください。`
      }
    } else {
      from_number_check.reason = `Twilio が ${phoneRes.status} を返しました。`
    }
  } catch (e) {
    from_number_check.reason = e instanceof Error ? e.message : String(e)
  }

  if (!from_number_check.ok) {
    return NextResponse.json({
      diagnosis: 'TWILIO_FROM_NUMBER_INVALID',
      env_present,
      twilio_account,
      from_number_check,
      next_step: from_number_check.reason,
    })
  }

  // ── すべて OK ──
  return NextResponse.json({
    diagnosis: 'OK',
    env_present,
    twilio_account: { ok: true, status: 200 },
    from_number_check: { ok: true },
    note: 'env と Twilio 認証は通っています。それでも SMS 送信が失敗する場合は、Twilio 側の Geo Permissions（Japan への送信許可）または trial account 制限（未認証番号は送信不可）を Twilio Console で確認してください。',
  })
}
