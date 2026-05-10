import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/env-guard'

//
// Stripe webhook
//
// 2026-05-10 リリース前 Critical 修正: user_id 検証を強化。
// 元実装は metadata.user_id をそのまま信用して profiles.update() /
// premium_subscriptions.upsert() していた。Stripe 署名検証は通っているので
// 外部攻撃者が偽装することは困難だが、運用ミス (テストデータの session を
// 本番 webhook に流す等) で「他人の profile を上書きする」事故が起きる余地
// があった。
//
// 対策:
//   1. metadata.user_id の format が UUID であることを検証 (isUuid)
//   2. 該当 user が profiles テーブルに実在するか SELECT で確認
//      (profiles は auth.users と 1:1 で同期される運用前提)
//   3. 検証失敗時は 200 OK + log に留める (Stripe 側のリトライを抑制)
//

async function verifyUserExists(supabase: ReturnType<typeof createClient>, userId: string | undefined | null): Promise<boolean> {
  if (!isUuid(userId)) {
    console.error('[stripe/webhook] invalid user_id format:', userId)
    return false
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('[stripe/webhook] profiles lookup error:', error)
    return false
  }
  if (!data) {
    console.error('[stripe/webhook] user_id not found in profiles:', userId)
    return false
  }
  return true
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' as const })
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    // user_id 検証 (UUID format + profiles 実在)
    if (!(await verifyUserExists(supabase, userId))) {
      return NextResponse.json({ ok: true, skipped: 'invalid_user_id' })
    }

    const sub = await stripe.subscriptions.retrieve(session.subscription as string)
    const expiresAt = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()

    await supabase.from('premium_subscriptions').upsert({
      user_id: userId,
      plan: 'monthly',
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
    }, { onConflict: 'user_id' })
  }

  // ── 年齢認証 (Stripe Identity) ──────────────────────────────────
  if (event.type === 'identity.verification_session.verified') {
    const session = event.data.object as Stripe.Identity.VerificationSession
    const userId = session.metadata?.user_id
    if (!(await verifyUserExists(supabase, userId))) {
      return NextResponse.json({ ok: true, skipped: 'invalid_user_id' })
    }
    // verified_outputs.dob から年齢を計算
    const fullSession = await stripe.identity.verificationSessions.retrieve(session.id, {
      expand: ['verified_outputs'],
    })
    const outputs = fullSession.verified_outputs as any
    const dob = outputs?.dob
    if (dob?.year) {
      const today = new Date()
      let age = today.getFullYear() - dob.year
      const notYetBirthday =
        today.getMonth() + 1 < dob.month ||
        (today.getMonth() + 1 === dob.month && today.getDate() < dob.day)
      if (notYetBirthday) age -= 1

      if (age >= 20) {
        await supabase.from('profiles').update({
          age_verified: true,
          age_verified_at: new Date().toISOString(),
          age_verification_status: 'age_verified',
          age_verification_provider: 'stripe_identity',
          age,
        }).eq('id', userId)
      }
    }
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.user_id
    if (!(await verifyUserExists(supabase, userId))) {
      return NextResponse.json({ ok: true, skipped: 'invalid_user_id' })
    }

    if (sub.status === 'canceled' || sub.status === 'unpaid') {
      await supabase.from('premium_subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
    } else if (sub.status === 'active') {
      const expiresAt = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()
      await supabase.from('premium_subscriptions')
        .update({ status: 'active', expires_at: expiresAt })
        .eq('user_id', userId)
    }
  }

  return NextResponse.json({ ok: true })
}
