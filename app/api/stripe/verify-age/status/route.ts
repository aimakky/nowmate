import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' as const })
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await stripe.identity.verificationSessions.retrieve(sessionId, {
    expand: ['verified_outputs'],
  })

  // セッションが別ユーザーのものでないことを確認
  if (session.metadata?.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (session.status === 'verified') {
    const outputs = session.verified_outputs as any
    const dob = outputs?.dob
    let age = 0
    if (dob?.year) {
      const today = new Date()
      age = today.getFullYear() - dob.year
      const notYetBirthday =
        today.getMonth() + 1 < dob.month ||
        (today.getMonth() + 1 === dob.month && today.getDate() < dob.day)
      if (notYetBirthday) age -= 1
    }

    if (age >= 20) {
      // DB を更新（age_verification_status も同期）
      await supabase.from('profiles').update({
        age_verified: true,
        age_verified_at: new Date().toISOString(),
        age_verification_status: 'age_verified',
        age_verification_provider: 'stripe_identity',
        age,
      }).eq('id', user.id)
      return NextResponse.json({ status: 'verified', age })
    } else {
      // 未成年 → rejected に更新
      await supabase.from('profiles').update({
        age_verified: false,
        age_verification_status: 'rejected',
        age_verification_provider: 'stripe_identity',
      }).eq('id', user.id)
      return NextResponse.json({ status: 'underage', age })
    }
  }

  // requires_input / processing 等 → pending に更新
  if (session.status === 'requires_input' || session.status === 'processing') {
    await supabase.from('profiles').update({
      age_verification_status: 'pending',
      age_verification_provider: 'stripe_identity',
    }).eq('id', user.id)
  }

  return NextResponse.json({ status: session.status })
}
