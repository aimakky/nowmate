import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 2026-05-10 リリース前ブランド統一: 旧 samee / nowmate / 自由村 (expat 向け
// Japan setup guide) のメッセージを YVOICE (大人向けゲーム通話コミュニティ) に
// 全面刷新。
const WELCOME_MESSAGES = [
  {
    emoji: '🎮',
    content: 'YVOICE へようこそ! 自分の声でゲーム仲間とつながる、20歳以上限定のコミュニティです。下のタブから「ゲーム村」を覗いてみよう。',
  },
  {
    emoji: '🛡️',
    content: '安心して遊べるように、本人確認・電話番号認証・Trust Tier 制度で民度を守っています。プロフィールを整えると、合うゲーム仲間に出会いやすくなります。',
  },
  {
    emoji: '🎙️',
    content: '通話ルームを開いて募集したり、TL に「いまから遊べる人」と投稿したり。最初の一歩は気軽な挨拶からで OK。良い夜を!',
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
