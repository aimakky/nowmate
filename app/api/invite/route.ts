import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'

export async function POST(req: Request) {
  try {
    const { inviteeId, inviter自由村Id } = await req.json()
    if (!inviteeId || !inviter自由村Id) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const supabase = createClient()

    // Find inviter
    const { data: inviter } = await supabase
      .from('profiles')
      .select('id, premium_until')
      .eq('nowjp_id', inviter自由村Id)
      .single()

    if (!inviter) return NextResponse.json({ error: 'Inviter not found' }, { status: 404 })

    // Avoid duplicate invites
    const { count } = await supabase
      .from('invites')
      .select('*', { count: 'exact', head: true })
      .eq('invitee_id', inviteeId)

    if ((count ?? 0) > 0) return NextResponse.json({ ok: true, message: 'already_claimed' })

    // Record invite
    await supabase.from('invites').insert({
      inviter_VILLIA_id: inviter自由村Id,
      invitee_id: inviteeId,
      rewarded: true,
    })

    // Grant 7 days premium to both
    const premiumUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await Promise.all([
      supabase.from('profiles')
        .update({ premium_until: premiumUntil, invited_by: inviter自由村Id })
        .eq('id', inviteeId),
      supabase.from('profiles')
        .update({
          premium_until: inviter.premium_until && new Date(inviter.premium_until) > new Date()
            ? new Date(new Date(inviter.premium_until).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : premiumUntil,
        })
        .eq('id', inviter.id),
    ])

    return NextResponse.json({ ok: true, premiumUntil })
  } catch (e: any) {
    // Next.js 14.2.29 では instrumentation.onRequestError が未対応のため、
    // 明示的に Sentry に送る。premium 付与失敗の silent fail を可視化する。
    try { Sentry.captureException(e) } catch {}
    console.error('[invite] error:', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
