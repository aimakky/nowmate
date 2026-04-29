'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import { getOccupationBadge } from '@/lib/occupation'
import { Send, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import DailyCheckIn from '@/components/features/DailyCheckIn'

// 時間帯別あいさつ
function getGreeting(hour: number, name: string): { text: string; emoji: string } {
  if (hour >= 5 && hour < 12)  return { text: `おはようございます、${name}さん`, emoji: '☀️' }
  if (hour >= 12 && hour < 18) return { text: `こんにちは、${name}さん`, emoji: '🌤️' }
  if (hour >= 18 && hour < 23) return { text: `仕事終わりお疲れさまです、${name}さん`, emoji: '🌙' }
  return { text: `夜遅くまでお疲れさまです、${name}さん`, emoji: '🌃' }
}

// 今日の問い（曜日別）
const DAILY_PROMPTS = [
  '今日一番しんどかったことは何ですか？',
  '最近仕事で「あ、これは報われた」と思った瞬間はありますか？',
  '職場で誰にも言えていないことはありますか？',
  '今の仕事を続けている理由を、一言で言えますか？',
  '今週、仕事以外で充電できた時間はありましたか？',
  '後輩や同期に言いたいけど言えないことはありますか？',
  '5年後の自分、想像できますか？',
]

export default function HomePage() {
  const router = useRouter()
  const [profile,        setProfile]        = useState<any>(null)
  const [occVillage,     setOccVillage]      = useState<any>(null)
  const [recentPosts,    setRecentPosts]     = useState<any[]>([])
  const [todayCount,     setTodayCount]      = useState(0)
  const [allVillages,    setAllVillages]     = useState<any[]>([])
  const [newPost,        setNewPost]         = useState('')
  const [posting,        setPosting]         = useState(false)
  const [posted,         setPosted]          = useState(false)
  const [loading,        setLoading]         = useState(true)
  const [hour,           setHour]            = useState(new Date().getHours())
  const [myVillages,     setMyVillages]      = useState<any[]>([])
  const [unreadCounts,   setUnreadCounts]    = useState<Record<string, number>>({})

  const todayPrompt = DAILY_PROMPTS[new Date().getDay()]

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setHour(new Date().getHours())

      // プロフィール取得
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      if (!prof) { setLoading(false); return }

      // 参加中の村を取得
      const { data: memberships } = await supabase
        .from('village_members')
        .select('village_id, villages(*, job_locked, job_type)')
        .eq('user_id', user.id)
      const joinedVillages = (memberships || []).map((m: any) => m.villages).filter(Boolean)
      setMyVillages(joinedVillages)

      // 職業村を探す
      const jobV = joinedVillages.find((v: any) => v.job_locked && v.job_type === prof.occupation)
        || joinedVillages.find((v: any) => v.job_locked)
      setOccVillage(jobV || null)

      // 職業村の最新投稿
      if (jobV) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [{ data: posts }, { count }] = await Promise.all([
          supabase.from('village_posts')
            .select('*, profiles(display_name, avatar_url, occupation)')
            .eq('village_id', jobV.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('village_posts')
            .select('*', { count: 'exact', head: true })
            .eq('village_id', jobV.id)
            .gte('created_at', today.toISOString()),
        ])
        setRecentPosts(posts || [])
        setTodayCount(count ?? 0)
      }

      // 参加中の各村の未読件数（過去24時間の新着）
      if (joinedVillages.length > 0) {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const lastVisit = localStorage.getItem('lastVisit_villages') || since24h
        const counts: Record<string, number> = {}
        await Promise.all(joinedVillages.map(async (v: any) => {
          const { count } = await supabase
            .from('village_posts')
            .select('*', { count: 'exact', head: true })
            .eq('village_id', v.id)
            .gte('created_at', lastVisit)
            .neq('user_id', user.id)
          counts[v.id] = count ?? 0
        }))
        setUnreadCounts(counts)
      }

      // 他のアクティブな職業村
      const { data: activeVillages } = await supabase
        .from('villages')
        .select('*, job_locked, job_type')
        .eq('is_public', true)
        .eq('job_locked', true)
        .order('post_count_7d', { ascending: false })
        .limit(6)
      setAllVillages((activeVillages || []).filter((v: any) => !jobV || v.id !== jobV.id))

      setLoading(false)
    }
    init()
    // 最終訪問時刻を記録
    localStorage.setItem('lastVisit_villages', new Date().toISOString())
  }, [router])

  async function handlePost() {
    if (!newPost.trim() || posting || !occVillage || !profile) return
    setPosting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('village_posts').insert({
      village_id: occVillage.id,
      user_id: user.id,
      content: newPost.trim(),
      category: '雑談',
    })
    setNewPost('')
    setPosted(true)
    setTodayCount(c => c + 1)
    setPosting(false)
    setTimeout(() => setPosted(false), 3000)

    // 投稿後に最新を再取得
    const { data: posts } = await supabase
      .from('village_posts')
      .select('*, profiles(display_name, avatar_url, occupation)')
      .eq('village_id', occVillage.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setRecentPosts(posts || [])
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080812' }}>
        <span className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#9D5CFF', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const greeting = getGreeting(hour, profile?.display_name?.split(' ')[0] ?? '')
  const occBadge = getOccupationBadge(profile?.occupation)
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-md mx-auto min-h-screen pb-28" style={{ background: '#080812' }}>

      {/* ── ヘッダー ── */}
      <div
        className="px-4 pt-10 pb-5"
        style={{
          background: 'linear-gradient(160deg, #0d0820 0%, #120a2e 60%, #0a1040 100%)',
          borderBottom: '1px solid rgba(157,92,255,0.15)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{greeting.emoji}</span>
          <p className="text-xs font-medium" style={{ color: 'rgba(240,238,255,0.5)' }}>{greeting.text}</p>
        </div>
        {occBadge && (
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mt-1"
            style={{ background: 'rgba(157,92,255,0.15)', border: '1px solid rgba(157,92,255,0.3)' }}
          >
            <span className="text-sm">{occBadge.emoji}</span>
            <span className="text-xs font-bold" style={{ color: '#9D5CFF' }}>{occBadge.label}</span>
          </div>
        )}
        {!profile?.occupation && (
          <Link href="/settings"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mt-1"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(157,92,255,0.2)' }}>
            <span className="text-[11px]" style={{ color: 'rgba(240,238,255,0.6)' }}>💼 職業を設定すると専用村に入れます</span>
            <ChevronRight size={10} style={{ color: 'rgba(240,238,255,0.4)' }} />
          </Link>
        )}
      </div>

      {/* ── デイリーチェックイン ── */}
      {profile?.id && (
        <div className="px-4 mt-3">
          <DailyCheckIn userId={profile.id} />
        </div>
      )}

      {/* ── 新着バナー ── */}
      {totalUnread > 0 && (
        <div className="mx-4 mt-4">
          <button onClick={() => router.push('/villages')}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 active:scale-[0.99] transition-all"
            style={{
              background: 'rgba(157,92,255,0.1)',
              border: '1px solid rgba(157,92,255,0.3)',
              boxShadow: '0 0 20px rgba(157,92,255,0.1)',
            }}>
            <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: '#9D5CFF' }} />
            <p className="text-sm font-bold flex-1 text-left" style={{ color: '#9D5CFF' }}>
              参加中の村に{totalUnread}件の新しい投稿があります
            </p>
            <ChevronRight size={14} style={{ color: 'rgba(157,92,255,0.6)' }} className="flex-shrink-0" />
          </button>
        </div>
      )}

      {/* ── 今日の問い ── */}
      <div className="mx-4 mt-4">
        <div
          className="rounded-2xl px-4 py-3.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.2)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(240,238,255,0.3)' }}>今日の問い</p>
          <p className="text-sm font-bold leading-relaxed" style={{ color: '#F0EEFF' }}>「{todayPrompt}」</p>
          {occVillage && (
            <button
              onClick={() => setNewPost(todayPrompt)}
              className="mt-2.5 text-[10px] font-bold"
              style={{ color: '#9D5CFF' }}
            >
              → {occVillage.name}に書いてみる
            </button>
          )}
        </div>
      </div>

      {/* ── 職業村 ── */}
      {occVillage ? (
        <div className="mx-4 mt-4">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.2)' }}
          >
            {/* 村ヘッダー */}
            <button
              onClick={() => router.push(`/villages/${occVillage.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-80 transition-all"
              style={{ borderBottom: '1px solid rgba(157,92,255,0.1)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: 'linear-gradient(135deg, #9D5CFF 0%, #7B3FE4 100%)', boxShadow: '0 0 16px rgba(157,92,255,0.4)' }}
              >
                {occVillage.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold" style={{ color: '#F0EEFF' }}>{occVillage.name}</p>
                  {todayCount > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(157,92,255,0.15)', color: '#9D5CFF', border: '1px solid rgba(157,92,255,0.3)' }}
                    >
                      今日{todayCount}件
                    </span>
                  )}
                </div>
                <p className="text-[10px]" style={{ color: 'rgba(240,238,255,0.4)' }}>
                  {occVillage.job_type}限定 · 👥 {occVillage.member_count}人
                </p>
              </div>
              <ChevronRight size={14} style={{ color: 'rgba(240,238,255,0.3)' }} className="flex-shrink-0" />
            </button>

            {/* 投稿入力 */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(157,92,255,0.1)' }}>
              <div className="flex gap-2">
                <textarea
                  value={newPost}
                  onChange={e => setNewPost(e.target.value)}
                  placeholder={`${occVillage.name}に書いてみる…`}
                  rows={2}
                  className="flex-1 text-sm rounded-xl px-3 py-2 focus:outline-none resize-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(157,92,255,0.2)',
                    color: '#F0EEFF',
                  }}
                />
                <button
                  onClick={handlePost}
                  disabled={!newPost.trim() || posting}
                  className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all flex-shrink-0 self-end"
                  style={{ background: 'linear-gradient(135deg, #9D5CFF 0%, #7B3FE4 100%)', boxShadow: '0 4px 20px rgba(157,92,255,0.4)' }}
                >
                  {posting
                    ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send size={14} className="text-white" />}
                </button>
              </div>
              {posted && <p className="text-[11px] font-bold mt-1.5" style={{ color: '#7CFF82' }}>✓ 投稿しました</p>}
            </div>

            {/* 最新投稿 */}
            {recentPosts.length > 0 ? (
              <div>
                {recentPosts.slice(0, 3).map((post, i) => {
                  const occ = getOccupationBadge(post.profiles?.occupation)
                  return (
                    <button key={post.id}
                      onClick={() => router.push(`/villages/${occVillage.id}`)}
                      className="w-full text-left px-4 py-3 active:opacity-80 transition-all"
                      style={{ borderBottom: i < Math.min(recentPosts.length, 3) - 1 ? '1px solid rgba(157,92,255,0.08)' : 'none' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #9D5CFF 0%, #FF4D90 100%)' }}
                        >
                          {post.profiles?.display_name?.[0] ?? '?'}
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: 'rgba(240,238,255,0.7)' }}>{post.profiles?.display_name}</span>
                        {occ && (
                          <span
                            className="text-[8px] font-bold px-1 rounded-full"
                            style={{ background: 'rgba(157,92,255,0.15)', color: '#9D5CFF', border: '1px solid rgba(157,92,255,0.2)' }}
                          >
                            {occ.emoji}
                          </span>
                        )}
                        <span className="text-[10px] ml-auto" style={{ color: 'rgba(240,238,255,0.3)' }}>{timeAgo(post.created_at)}</span>
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(240,238,255,0.7)' }}>{post.content}</p>
                    </button>
                  )
                })}
                <button
                  onClick={() => router.push(`/villages/${occVillage.id}`)}
                  className="w-full py-3 text-xs font-bold text-center active:opacity-80 transition-all"
                  style={{ color: '#9D5CFF', borderTop: '1px solid rgba(157,92,255,0.1)' }}
                >
                  村を開く →
                </button>
              </div>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-2xl mb-2">🌿</p>
                <p className="text-xs font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>まだ投稿がありません</p>
                <p className="text-[11px] mt-1" style={{ color: 'rgba(240,238,255,0.3)' }}>最初の投稿をしてみましょう</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 職業村なし → 職業設定を促す */
        <div className="mx-4 mt-4">
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.2)' }}
          >
            <p className="text-3xl mb-3">💼</p>
            <p className="text-sm font-extrabold mb-1" style={{ color: '#F0EEFF' }}>職業を設定してください</p>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'rgba(240,238,255,0.55)' }}>
              職業を設定すると、同じ仕事をしている人だけの村に入れます。
            </p>
            <Link href="/settings"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #9D5CFF 0%, #7B3FE4 100%)', boxShadow: '0 4px 20px rgba(157,92,255,0.4)' }}>
              💼 職業を設定する →
            </Link>
          </div>
        </div>
      )}

      {/* ── 参加中の他の村 ── */}
      {myVillages.filter((v: any) => !occVillage || v.id !== occVillage.id).length > 0 && (
        <div className="mx-4 mt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-extrabold" style={{ color: 'rgba(240,238,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>参加中の村</p>
            <button onClick={() => router.push('/villages')} className="text-[10px] font-bold" style={{ color: '#9D5CFF' }}>
              すべて見る →
            </button>
          </div>
          <div className="space-y-2">
            {myVillages
              .filter((v: any) => !occVillage || v.id !== occVillage.id)
              .slice(0, 4)
              .map((v: any) => {
                const unread = unreadCounts[v.id] ?? 0
                return (
                  <button key={v.id}
                    onClick={() => router.push(`/villages/${v.id}`)}
                    className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 active:scale-[0.99] transition-all text-left"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.2)' }}
                  >
                    <span className="text-xl flex-shrink-0">{v.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#F0EEFF' }}>{v.name}</p>
                      <p className="text-[10px]" style={{ color: '#49E1FF' }}>👥 {v.member_count}人</p>
                    </div>
                    {unread > 0 && (
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white"
                        style={{ background: 'linear-gradient(135deg, #9D5CFF 0%, #7B3FE4 100%)', boxShadow: '0 0 8px rgba(157,92,255,0.5)' }}
                      >
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                    <ChevronRight size={14} style={{ color: 'rgba(240,238,255,0.3)' }} className="flex-shrink-0" />
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* ── 他の職業村（アクティブ） ── */}
      {allVillages.length > 0 && (
        <div className="mx-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-extrabold" style={{ color: 'rgba(240,238,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🔥 活発な職業村</p>
            <button onClick={() => router.push('/villages')} className="text-[10px] font-bold" style={{ color: '#9D5CFF' }}>
              すべて見る →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {allVillages.slice(0, 4).map((v: any) => (
              <button key={v.id}
                onClick={() => router.push(`/villages/${v.id}`)}
                className="flex items-center gap-2.5 rounded-2xl p-3 active:scale-[0.98] transition-all text-left"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.2)' }}
              >
                <span className="text-xl flex-shrink-0">{v.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold truncate" style={{ color: '#F0EEFF' }}>{v.job_type}村</p>
                  <p className="text-[10px] font-bold" style={{ color: '#FF4D90' }}>今週{v.post_count_7d}投稿</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 村を見つける CTA ── */}
      <div className="mx-4 mt-5">
        <button onClick={() => router.push('/villages')}
          className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:opacity-80 transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.2)', color: 'rgba(240,238,255,0.7)' }}>
          🏕️ すべての村を見る
          <ChevronRight size={14} style={{ color: 'rgba(240,238,255,0.4)' }} />
        </button>
      </div>
    </div>
  )
}
