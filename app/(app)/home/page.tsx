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
      <div className="min-h-screen bg-birch flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const greeting = getGreeting(hour, profile?.display_name?.split(' ')[0] ?? '')
  const occBadge = getOccupationBadge(profile?.occupation)
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch pb-28">

      {/* ── ヘッダー ── */}
      <div className="px-4 pt-10 pb-5"
        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{greeting.emoji}</span>
          <p className="text-xs text-white/50 font-medium">{greeting.text}</p>
        </div>
        {occBadge && (
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-3 py-1 mt-1">
            <span className="text-sm">{occBadge.emoji}</span>
            <span className="text-xs font-bold text-indigo-200">{occBadge.label}</span>
          </div>
        )}
        {!profile?.occupation && (
          <Link href="/settings"
            className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 mt-1">
            <span className="text-[11px] text-white/60">💼 職業を設定すると専用村に入れます</span>
            <ChevronRight size={10} className="text-white/40" />
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
            className="w-full flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3 active:scale-[0.99] transition-all">
            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse flex-shrink-0" />
            <p className="text-sm font-bold text-brand-700 flex-1 text-left">
              参加中の村に{totalUnread}件の新しい投稿があります
            </p>
            <ChevronRight size={14} className="text-brand-400 flex-shrink-0" />
          </button>
        </div>
      )}

      {/* ── 今日の問い ── */}
      <div className="mx-4 mt-4">
        <div className="bg-white border border-stone-100 rounded-2xl px-4 py-3.5 shadow-sm">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">今日の問い</p>
          <p className="text-sm font-bold text-stone-800 leading-relaxed">「{todayPrompt}」</p>
          {occVillage && (
            <button
              onClick={() => setNewPost(todayPrompt)}
              className="mt-2.5 text-[10px] text-brand-500 font-bold"
            >
              → {occVillage.name}に書いてみる
            </button>
          )}
        </div>
      </div>

      {/* ── 職業村 ── */}
      {occVillage ? (
        <div className="mx-4 mt-4">
          <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
            {/* 村ヘッダー */}
            <button
              onClick={() => router.push(`/villages/${occVillage.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-stone-50 active:bg-stone-50 transition-all"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
                {occVillage.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold text-stone-900">{occVillage.name}</p>
                  {todayCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">
                      今日{todayCount}件
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-stone-400">
                  {occVillage.job_type}限定 · 👥 {occVillage.member_count}人
                </p>
              </div>
              <ChevronRight size={14} className="text-stone-300 flex-shrink-0" />
            </button>

            {/* 投稿入力 */}
            <div className="px-4 py-3 border-b border-stone-50">
              <div className="flex gap-2">
                <textarea
                  value={newPost}
                  onChange={e => setNewPost(e.target.value)}
                  placeholder={`${occVillage.name}に書いてみる…`}
                  rows={2}
                  className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-300 placeholder:text-stone-300 resize-none"
                />
                <button
                  onClick={handlePost}
                  disabled={!newPost.trim() || posting}
                  className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all flex-shrink-0 self-end"
                >
                  {posting
                    ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send size={14} className="text-white" />}
                </button>
              </div>
              {posted && <p className="text-[11px] text-brand-500 font-bold mt-1.5">✓ 投稿しました</p>}
            </div>

            {/* 最新投稿 */}
            {recentPosts.length > 0 ? (
              <div>
                {recentPosts.slice(0, 3).map((post, i) => {
                  const occ = getOccupationBadge(post.profiles?.occupation)
                  return (
                    <button key={post.id}
                      onClick={() => router.push(`/villages/${occVillage.id}`)}
                      className={`w-full text-left px-4 py-3 active:bg-stone-50 transition-all ${i < Math.min(recentPosts.length, 3) - 1 ? 'border-b border-stone-50' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                          {post.profiles?.display_name?.[0] ?? '?'}
                        </div>
                        <span className="text-[10px] font-bold text-stone-600">{post.profiles?.display_name}</span>
                        {occ && (
                          <span className="text-[8px] font-bold px-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {occ.emoji}
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400 ml-auto">{timeAgo(post.created_at)}</span>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed line-clamp-2">{post.content}</p>
                    </button>
                  )
                })}
                <button
                  onClick={() => router.push(`/villages/${occVillage.id}`)}
                  className="w-full py-3 text-xs font-bold text-brand-500 border-t border-stone-50 text-center active:bg-stone-50 transition-all"
                >
                  村を開く →
                </button>
              </div>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-2xl mb-2">🌿</p>
                <p className="text-xs font-bold text-stone-600">まだ投稿がありません</p>
                <p className="text-[11px] text-stone-400 mt-1">最初の投稿をしてみましょう</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 職業村なし → 職業設定を促す */
        <div className="mx-4 mt-4">
          <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-3xl mb-3">💼</p>
            <p className="text-sm font-extrabold text-stone-800 mb-1">職業を設定してください</p>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">
              職業を設定すると、同じ仕事をしている人だけの村に入れます。
            </p>
            <Link href="/settings"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold shadow-md shadow-brand-200 active:scale-95 transition-all">
              💼 職業を設定する →
            </Link>
          </div>
        </div>
      )}

      {/* ── 参加中の他の村 ── */}
      {myVillages.filter((v: any) => !occVillage || v.id !== occVillage.id).length > 0 && (
        <div className="mx-4 mt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-extrabold text-stone-700">参加中の村</p>
            <button onClick={() => router.push('/villages')} className="text-[10px] text-brand-500 font-bold">
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
                    className="w-full flex items-center gap-3 bg-white border border-stone-100 rounded-2xl px-4 py-3 shadow-sm active:scale-[0.99] transition-all text-left"
                  >
                    <span className="text-xl flex-shrink-0">{v.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-800 truncate">{v.name}</p>
                      <p className="text-[10px] text-stone-400">👥 {v.member_count}人</p>
                    </div>
                    {unread > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-stone-300 flex-shrink-0" />
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
            <p className="text-xs font-extrabold text-stone-700">🔥 活発な職業村</p>
            <button onClick={() => router.push('/villages')} className="text-[10px] text-brand-500 font-bold">
              すべて見る →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {allVillages.slice(0, 4).map((v: any) => (
              <button key={v.id}
                onClick={() => router.push(`/villages/${v.id}`)}
                className="flex items-center gap-2.5 bg-white border border-stone-100 rounded-2xl p-3 shadow-sm active:scale-[0.98] transition-all text-left"
              >
                <span className="text-xl flex-shrink-0">{v.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-stone-800 truncate">{v.job_type}村</p>
                  <p className="text-[10px] text-brand-500 font-bold">今週{v.post_count_7d}投稿</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 村を見つける CTA ── */}
      <div className="mx-4 mt-5">
        <button onClick={() => router.push('/villages')}
          className="w-full py-3.5 bg-white border border-stone-200 rounded-2xl text-sm font-bold text-stone-700 flex items-center justify-center gap-2 active:bg-stone-50 transition-all shadow-sm">
          🏕️ すべての村を見る
          <ChevronRight size={14} className="text-stone-400" />
        </button>
      </div>
    </div>
  )
}
