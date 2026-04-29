import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

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
    if (!userId) return NextResponse.json({ ok: true })

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
    if (userId) {
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
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.user_id
    if (!userId) return NextResponse.json({ ok: true })

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
