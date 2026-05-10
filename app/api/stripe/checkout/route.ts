import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/env-guard'

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' as const })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json() as { plan: 'monthly' | 'yearly' }

  const priceId = plan === 'yearly'
    ? process.env.STRIPE_PRICE_YEARLY
    : process.env.STRIPE_PRICE_MONTHLY

  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 503 })
  }

  // 2026-05-10 Critical: NEXT_PUBLIC_BASE_URL 未設定時に `${undefined}/upgrade/success`
  // という壊れた URL を Stripe に渡してしまう事故を防ぐ。getBaseUrl() は
  // NEXT_PUBLIC_BASE_URL → NEXT_PUBLIC_SITE_URL → 旧ドメインの順で fallback。
  const baseUrl = getBaseUrl()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/upgrade`,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
  })

  return NextResponse.json({ url: session.url })
}
