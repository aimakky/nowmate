'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, timeAgo } from '@/lib/utils'
import { ArrowLeft, Heart, ChevronRight, MessageSquare, MoreHorizontal, Flag, Ban } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import TrustBadge from '@/components/ui/TrustBadge'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import { isVerifiedByExistingSchema } from '@/lib/identity-types'
import Link from 'next/link'
import { getCategoryStyle, getTitleName, TITLE_LEVEL_STYLE } from '@/lib/qa'
import ReportModal from '@/components/features/ReportModal'
import { getGenreTitles, getIndustry } from '@/lib/guild'
import { startDM } from '@/lib/dm'

interface VillagePost {
  id: string
  content: string
  category: string
  created_at: string
  village_id: string
  reaction_count: number
  villages: { id: string; name: string; icon: string } | null
}

interface QAAnswerWithQ {
  id: string
  content: string
  created_at: string
  qa_questions: { id: string; title: string; category: string } | null
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [recentPosts, setRecentPosts] = useState<VillagePost[]>([])
  const [postCount, setPostCount] = useState(0)
  const [myId, setMyId] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [toggling, setToggling] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showMenu,   setShowMenu]   = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [blocking,   setBlocking]   = useState(false)
  const [blockDone,  setBlockDone]  = useState(false)
  const [trustTier, setTrustTier] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'answers'>('posts')
  const [answers, setAnswers] = useState<QAAnswerWithQ[]>([])
  const [showAnswersTab, setShowAnswersTab] = useState(true)
  const [qaTitles, setQaTitles] = useState<any[]>([])
  const [genreTitles, setGenreTitles] = useState<{ genre: string; awarded_at: string }[]>([])
  const [dmLoading, setDmLoading] = useState(false)
  const [dmToast, setDmToast] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setMyId(user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    async function load() {
      const supabase = createClient()
      const [{ data: p }, { data: posts }, { count: totalPosts }, { count: followers }, { count: following }, { data: trust }, { data: premSub }, { data: answersData }, { data: titlesData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('village_posts')
          .select('id, content, category, created_at, village_id, reaction_count, villages(id, name, icon)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('village_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('user_trust').select('tier').eq('user_id', userId).maybeSingle(),
        supabase.from('premium_subscriptions').select('id').eq('user_id', userId).eq('status', 'active').gt('expires_at', new Date().toISOString()).maybeSingle(),
        supabase.from('qa_answers')
          .select('id, content, created_at, qa_questions(id, title, category)')
          .eq('user_id', userId)
          .eq('is_anonymous', false)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('qa_titles').select('*').eq('user_id', userId).order('awarded_at', { ascending: false }),
      ])
      setProfile(p)
      setShowAnswersTab(p?.show_answers !== false)
      setQaTitles(titlesData ?? [])
      // ジャンルマスター称号
      const gt = await getGenreTitles(userId as string)
      setGenreTitles(gt)
      const normalized = (posts || []).map((post: any) => ({
        ...post,
        villages: Array.isArray(post.villages) ? post.villages[0] ?? null : post.villages,
      })) as VillagePost[]
      setRecentPosts(normalized)
      setPostCount(totalPosts ?? 0)
      setFollowerCount(followers ?? 0)
      setFollowingCount(following ?? 0)
      if (trust?.tier) setTrustTier(trust.tier)
      setIsPremium(!!premSub)
      const normalizedAnswers = (answersData || []).map((a: any) => ({
        ...a,
        qa_questions: Array.isArray(a.qa_questions) ? a.qa_questions[0] ?? null : a.qa_questions,
      })) as QAAnswerWithQ[]
      setAnswers(normalizedAnswers)
      setLoading(false)
    }
    load()
  }, [userId])

  useEffect(() => {
    if (!myId || !userId) return
    const supabase = createClient()
    supabase.from('user_follows').select('follower_id').eq('follower_id', myId).eq('following_id', userId).maybeSingle()
      .then(({ data }) => setIsFollowing(!!data))
  }, [myId, userId])

  async function toggleFollow() {
    if (!myId || toggling || myId === userId) return
    setToggling(true)
    const supabase = createClient()
    if (isFollowing) {
      await supabase.from('user_follows').delete().eq('follower_id', myId).eq('following_id', userId)
      setIsFollowing(false)
      setFollowerCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('user_follows').insert({ follower_id: myId, following_id: userId })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)
    }
    setToggling(false)
  }

  async function handleBlock() {
    if (!myId || blocking) return
    setBlocking(true)
    const supabase = createClient()
    await supabase.from('blocks').upsert(
      { blocker_id: myId, blocked_id: userId },
      { onConflict: 'blocker_id,blocked_id' }
    )
    setBlocking(false)
    setBlockDone(true)
    setShowMenu(false)
  }

  async function handleDM() {
    if (!myId || dmLoading) return
    setDmLoading(true)
    const result = await startDM(myId, userId as string)
    setDmLoading(false)
    if (result.status === 'age_required') {
      setDmToast('DMを送るには年齢確認が必要です')
      setTimeout(() => setDmToast(null), 3000)
    } else if (result.status === 'ok' || result.status === 'exists') {
      router.push(`/chat/${result.matchId}`)
    } else if (result.status === 'request') {
      setDmToast('リクエストを送りました 📨')
      setTimeout(() => setDmToast(null), 3000)
      if ('matchId' in result) router.push(`/chat/${result.matchId}`)
    } else {
      setDmToast('このユーザーはDMを受け付けていません')
      setTimeout(() => setDmToast(null), 3000)
    }
  }

if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-birch">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!profile) return null

  const flag = getNationalityFlag(profile.nationality || '')
  const isMe = myId === userId

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
          <ArrowLeft size={20} />
        </button>
        <p className="font-extrabold text-stone-900 flex-1 truncate">{profile.display_name}</p>
        {!isMe && myId && (
          <button onClick={() => setShowMenu(true)} className="p-1.5 rounded-full text-stone-400 hover:bg-stone-100 active:bg-stone-200 transition-colors">
            <MoreHorizontal size={20} />
          </button>
        )}
      </div>

      {/* Profile card */}
      <div className="bg-white px-5 pt-5 pb-4 border-b border-stone-100">
        <div className="flex items-start gap-4 mb-4">
          <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" tier={trustTier} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="font-extrabold text-stone-900 text-lg leading-tight">{profile.display_name}</p>
              <span className="text-xl">{flag}</span>
              {isVerifiedByExistingSchema(profile) && <VerifiedBadge verified size="md" />}
            </div>
            {trustTier && (
              <div className="mb-1">
                <TrustBadge tierId={trustTier} size="md" isPremium={isPremium} />
              </div>
            )}
            {profile.bio && <p className="text-sm text-stone-600 leading-relaxed mt-1">{profile.bio}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <p className="font-extrabold text-stone-900 text-lg">{postCount}</p>
            <p className="text-xs text-stone-400">投稿</p>
          </div>
          <div className="text-center">
            <p className="font-extrabold text-stone-900 text-lg">{followerCount}</p>
            <p className="text-xs text-stone-400">フォロワー</p>
          </div>
          <div className="text-center">
            <p className="font-extrabold text-stone-900 text-lg">{followingCount}</p>
            <p className="text-xs text-stone-400">フォロー中</p>
          </div>
        </div>

        {/* ── 称号バッジ ── */}
        {(qaTitles.length > 0 || genreTitles.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {qaTitles.map((t: any) => {
              const cs      = getCategoryStyle(t.category)
              const lvStyle = TITLE_LEVEL_STYLE[t.level]
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{ background: cs.bg, border: `1px solid ${cs.border}`, color: cs.color }}
                >
                  <span>{lvStyle?.badge}</span>
                  <span>{getTitleName(t.category, t.level)}</span>
                </div>
              )
            })}
            {genreTitles.map(gt => {
              const ind = getIndustry(gt.genre)
              return (
                <div
                  key={gt.genre}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{ background: ind.bg, border: `1px solid ${ind.border}`, color: ind.color }}
                >
                  <span>{ind.emoji}</span>
                  <span>{gt.genre}マスター</span>
                </div>
              )
            })}
          </div>
        )}

        {!isMe && (
          <div className="flex gap-2.5">
            <button onClick={toggleFollow} disabled={toggling}
              className={`flex-1 py-2.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${
                isFollowing
                  ? 'bg-stone-100 text-stone-700 border border-stone-200'
                  : 'bg-brand-500 text-white shadow-md shadow-brand-200'
              }`}>
              {toggling ? '...' : isFollowing ? '✓ フォロー中' : 'フォローする'}
            </button>
            <button
              onClick={handleDM}
              disabled={dmLoading}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-sm bg-stone-100 text-stone-700 border border-stone-200 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {dmLoading
                ? <span className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                : <><MessageSquare size={14} /> DM</>
              }
            </button>
          </div>
        )}
        {isMe && (
          <button onClick={() => router.push('/mypage')}
            className="w-full py-2.5 rounded-2xl font-bold text-sm bg-stone-100 text-stone-700 border border-stone-200">
            Edit profile →
          </button>
        )}
      </div>

      {/* ── タブ ── */}
      <div className="flex border-b border-stone-100 bg-white sticky top-[57px] z-10">
        <button
          onClick={() => setActiveTab('posts')}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold relative transition-colors"
          style={{ color: activeTab === 'posts' ? '#1c1917' : '#a8a29e' }}
        >
          ✍️ 投稿
          {activeTab === 'posts' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-stone-900" />
          )}
        </button>
        {showAnswersTab && (
          <button
            onClick={() => setActiveTab('answers')}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold relative transition-colors"
            style={{ color: activeTab === 'answers' ? '#1c1917' : '#a8a29e' }}
          >
            💬 回答
            {answers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold"
                style={{ background: activeTab === 'answers' ? '#1c1917' : '#f5f5f4', color: activeTab === 'answers' ? '#fff' : '#a8a29e' }}>
                {answers.length}
              </span>
            )}
            {activeTab === 'answers' && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-stone-900" />
            )}
          </button>
        )}
      </div>

      {/* ── コンテンツ ── */}
      <div className="px-4 pt-4 pb-28 space-y-3">

        {/* 投稿タブ */}
        {activeTab === 'posts' && (
          <>
            {postCount > 5 && (
              <p className="text-[10px] text-stone-400 text-right">{postCount}件中5件を表示</p>
            )}
            {recentPosts.length === 0 ? (
              <div className="bg-white border border-stone-100 rounded-2xl p-8 text-center">
                <p className="text-3xl mb-2">✍️</p>
                <p className="text-sm font-bold text-stone-500">まだ投稿がありません</p>
              </div>
            ) : (
              recentPosts.map(post => (
                <div key={post.id} className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 pt-3.5 pb-2.5">
                    <p className="text-sm text-stone-800 leading-relaxed">{post.content}</p>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-stone-50">
                    {post.villages ? (
                      <Link href={`/villages/${post.village_id}`}
                        className="flex items-center gap-1.5 active:opacity-70 transition-opacity">
                        <span className="text-sm">{post.villages.icon}</span>
                        <span className="text-[11px] font-bold text-stone-500 truncate max-w-[160px]">
                          {post.villages.name}
                        </span>
                        <ChevronRight size={11} className="text-stone-300 flex-shrink-0" />
                      </Link>
                    ) : <span />}
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-stone-400">{timeAgo(post.created_at)}</span>
                      {post.reaction_count > 0 && (
                        <div className="flex items-center gap-1 text-rose-400">
                          <Heart size={12} fill="#f43f5e" strokeWidth={0} />
                          <span className="text-[11px] font-bold">{post.reaction_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* 回答タブ */}
        {activeTab === 'answers' && showAnswersTab && (
          <>
            {answers.length === 0 ? (
              <div className="bg-white border border-stone-100 rounded-2xl p-8 text-center">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-sm font-bold text-stone-500">まだ実名の回答がありません</p>
                <p className="text-xs text-stone-400 mt-1">実名で回答すると、ここに蓄積されます</p>
              </div>
            ) : (
              answers.map(a => {
                const q = a.qa_questions
                const cs = q ? getCategoryStyle(q.category) : getCategoryStyle('なんでも相談')
                return (
                  <div key={a.id} className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
                    {/* 質問への参照 */}
                    {q && (
                      <Link href={`/qa/${q.id}`}
                        className="flex items-center gap-2.5 px-4 py-2.5 border-b border-stone-50 active:bg-stone-50 transition-colors"
                        style={{ background: cs.bg }}>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: cs.border, color: cs.color }}>
                          {cs.emoji} {q.category}
                        </span>
                        <p className="text-xs font-bold text-stone-700 truncate flex-1">{q.title}</p>
                        <ChevronRight size={11} className="text-stone-300 flex-shrink-0" />
                      </Link>
                    )}
                    {/* 回答本文 */}
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <MessageSquare size={11} className="text-stone-300" />
                        <span className="text-[10px] font-bold text-stone-400">この人の回答</span>
                        <span className="text-[10px] text-stone-300 ml-auto">{timeAgo(a.created_at)}</span>
                      </div>
                      <p className="text-sm text-stone-800 leading-relaxed">{a.content}</p>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}
      </div>

      {/* ── アクションシート（通報・ブロック）── */}
      {showMenu && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMenu(false)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-md mx-auto overflow-hidden pb-safe">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-stone-200" />
            </div>
            <div className="px-4 pb-6">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 px-1">
                {profile.display_name} さんへの操作
              </p>

              {/* 通報 */}
              <button
                onClick={() => { setShowMenu(false); setShowReport(true) }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-orange-50 active:bg-orange-100 transition-colors text-left">
                <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Flag size={16} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-600">通報する</p>
                  <p className="text-xs text-orange-400">不適切なユーザーを報告する</p>
                </div>
              </button>

              {/* ブロック */}
              <button
                onClick={handleBlock}
                disabled={blocking || blockDone}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-red-50 active:bg-red-100 transition-colors text-left mt-1 disabled:opacity-60">
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  {blockDone ? <span className="text-base">✅</span> : <Ban size={16} className="text-red-500" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-red-600">
                    {blockDone ? 'ブロックしました' : 'ブロックする'}
                  </p>
                  <p className="text-xs text-red-400">
                    {blockDone ? 'このユーザーは非表示になります' : 'このユーザーを非表示にする'}
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowMenu(false)}
                className="w-full mt-3 py-3.5 rounded-2xl bg-stone-100 text-sm font-bold text-stone-600 active:bg-stone-200 transition-colors">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 通報モーダル ── */}
      {showReport && (
        <ReportModal
          reportedId={userId as string}
          reportedName={profile.display_name}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* ── DM トースト ── */}
      {dmToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-stone-900/90 text-white text-sm font-bold rounded-2xl shadow-xl backdrop-blur-sm whitespace-nowrap">
          {dmToast}
        </div>
      )}
    </div>
  )
}
