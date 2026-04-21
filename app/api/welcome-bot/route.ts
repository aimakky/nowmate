import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const WELCOME_MESSAGES = [
  {
    emoji: '👋',
    content: "Welcome to Samee! I'm your Japan setup guide. Your first mission: register 住民票 at your local city hall within 14 days of arrival. Need help? Head to the Survive tab →",
  },
  {
    emoji: '🏦',
    content: "Pro tip: Japan Post Bank (ゆうちょ銀行) is the easiest bank to open as a newcomer — no Japanese required. Check your Survive checklist for the full guide.",
  },
  {
    emoji: '🤝',
    content: "You're not alone here. Browse people in your area on the Home tab — filter by arrival stage to find others who just landed like you. Your first match might be one Like away.",
  },
]

export async function POST(req: Request) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const supabase = createClient()

  // Don't send twice
  const { count } = await supabase
    .from('system_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) > 0) return NextResponse.json({ ok: true, message: 'already_sent' })

  await supabase.from('system_messages').insert(
    WELCOME_MESSAGES.map(m => ({ user_id: userId, ...m }))
  )

  return NextResponse.json({ ok: true })
}
