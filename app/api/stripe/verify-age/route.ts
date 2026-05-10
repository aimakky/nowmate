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

  // 既に認証済みなら不要
  const { data: profile } = await supabase
    .from('profiles').select('age_verified').eq('id', user.id).single()
  if (profile?.age_verified) {
    return NextResponse.json({ already_verified: true })
  }

  // 2026-05-10 Critical: NEXT_PUBLIC_BASE_URL 未設定時に `${undefined}/verify-age/...`
  // という壊れた return_url を Stripe Identity に渡す事故を防ぐ。
  const baseUrl = getBaseUrl()

  const session = await stripe.identity.verificationSessions.create({
    type: 'document',
    options: {
      document: {
        allowed_types: ['driving_license', 'id_card', 'passport'],
        require_live_capture: true,
        require_matching_selfie: false,
      },
    },
    metadata: { user_id: user.id },
    return_url: `${baseUrl}/verify-age/complete?session_id={VERIFICATION_SESSION_ID}`,
  })

  return NextResponse.json({ url: session.url, session_id: session.id })
}
