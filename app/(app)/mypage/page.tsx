'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrustCard } from '@/components/ui/TrustBadge'
import TrustBadge from '@/components/ui/TrustBadge'
import PhoneVerifyModal from '@/components/features/PhoneVerifyModal'
import { getUserTrust, fetchTierProgress, type TierProgress } from '@/lib/trust'
import { Settings, LogOut, ChevronRight, Crown, Users, Copy, Check, Pencil, X, Eye, EyeOff } from 'lucide-react'
import { VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'
import { INDUSTRIES } from '@/lib/guild'
import TweetCard, { type TweetData } from '@/components/ui/TweetCard'

type ProfileTab = 'tweets' | 'images' | 'joined_villages' | 'hosted_villages'

// ── ツイートコンポーズシート ────────────────────────────────────
function TweetComposeSheet({
  userId,
  avatarUrl,
  displayName,
  onClose,
  onPosted,
}: {
  userId: string
  avatarUrl: string | null
  displayName: string
  onClose: () => void
  onPosted: () => Promise<void>
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const MAX = 280

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handlePost() {
    if (!text.trim() || sending || text.length > MAX) return
    setSending(true)
    const supabase = createClient()
    const { error } = await supabase.from('tweets').insert({
      user_id: userId,
      content: text.trim(),
    })
    setSending(false)
    if (!error) {
      setSent(true)
      await onPosted()   // リロード完了を待つ
      onClose()
    }
  }

  const remaining = MAX - text.length
  const pct = text.length / MAX
  const circleR = 9
  const circleC = 2 * Math.PI * circleR

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-t-3xl w-full max-w-md mx-auto overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ドラッグハンドル */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-200" />
        </div>

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-2.5">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full active:bg-stone-100 transition-colors"
          >
            <X size={18} className="text-stone-500" />
          </button>
          <button
            onClick={handlePost}
            disabled={!text.trim() || sending || sent || text.length > MAX}
            className="px-5 py-1.5 rounded-full text-sm font-extrabold text-white disabled:opacity-40 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#1c1917,#3c3836)' }}
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
            ) : sent ? '✓ 投稿済み' : '投稿する'}
          </button>
        </div>

        {/* 入力エリア */}
        <div className="flex gap-3 px-5 pt-1 pb-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : <span>{displayName[0]}</span>
              }
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="いまどうしてる？"
              rows={5}
              autoFocus
              className="w-full text-[17px] leading-relaxed resize-none focus:outline-none text-stone-900 placeholder-stone-300 bg-transparent"
            />
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-stone-100">
          <p className="text-[11px] text-stone-400">自由村全体に公開されます</p>
          <div className="flex items-center gap-2.5">
            {/* 残り文字数リング */}
            <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
              <circle cx="12" cy="12" r={circleR} fill="none" stroke="#e7e5e4" strokeWidth="2.5" />
              <circle cx="12" cy="12" r={circleR} fill="none"
                stroke={pct > 0.9 ? '#f97316' : '#1c1917'}
                strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={circleC}
                strokeDashoffset={circleC * (1 - pct)}
                style={{ transition: 'stroke-dashoffset 0.1s' }}
              />
            </svg>
            <span className={`text-xs font-bold ${remaining < 20 ? 'text-orange-500' : 'text-stone-300'}`}>
              {remaining}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── メインページ ────────────────────────────────────────────────
export default function MyPage() {
  const router = useRouter()

  const [profile,        setProfile]        = useState<any>(null)
  const [trust,          setTrust]          = useState<any>(null)
  const [tierProgress,   setTierProgress]   = useState<TierProgress | null>(null)
  const [villageCount,   setVillageCount]   = useState(0)
  const [postCount,      setPostCount]      = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingIds,   setFollowingIds]   = useState<Set<string>>(new Set())
  const [hostedVillages, setHostedVillages] = useState<any[]>([])
  const [joinedVillages, setJoinedVillages] = useState<any[]>([])
  const [imagePosts,     setImagePosts]     = useState<any[]>([])
  const [tweets,         setTweets]         = useState<TweetData[]>([])
  const [tweetLoading,   setTweetLoading]   = useState(false)
  const [userId,         setUserId]         = useState<string | null>(null)
  const [activeTab,      setActiveTab]      = useState<ProfileTab>('tweets')
  const [loading,        setLoading]        = useState(true)
  const [showPhoneVerify,setShowPhoneVerify]= useState(false)
  const [showCompose,    setShowCompose]    = useState(false)
  const [idCopied,       setIdCopied]       = useState(false)
  const [showIndustry,   setShowIndustry]   = useState(true)
  const [savingIndustry, setSavingIndustry] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [
        { data: p },
        trustData,
        tierProgressData,
        { count: vc },
        { count: pc },
        hostedRes,
        joinedRes,
        followsRes,
        followersRes,
        imageRes,
        tweetRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        getUserTrust(user.id),
        fetchTierProgress(user.id),
        supabase.from('village_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('village_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('village_members')
          .select('villages(id, name, icon, type, member_count, post_count_7d)')
          .eq('user_id', user.id).eq('role', 'host'),
        supabase.from('village_members')
          .select('villages(id, name, icon, type, member_count, post_count_7d)')
          .eq('user_id', user.id).eq('role', 'member')
          .order('joined_at', { ascending: false }).limit(12),
        supabase.from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id),
        supabase.from('user_follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('following_id', user.id),
        supabase.from('guild_posts')
          .select('id, image_url, content, created_at')
          .eq('user_id', user.id)
          .not('image_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('tweets')
          .select('*, profiles!tweets_user_id_fkey(display_name, nationality, avatar_url), tweet_reactions!tweet_reactions_tweet_id_fkey(user_id, reaction), tweet_replies!tweet_replies_tweet_id_fkey(id)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      if (!p) { router.push('/onboarding'); return }
      setProfile(p)
      setShowIndustry(p.show_industry !== false)
      setTrust(trustData)
      setTierProgress(tierProgressData)
      setVillageCount(vc ?? 0)
      setPostCount(pc ?? 0)
      setHostedVillages(((hostedRes as any)?.data ?? []).map((r: any) => r.villages).filter(Boolean))
      setJoinedVillages(((joinedRes as any)?.data ?? []).map((r: any) => r.villages).filter(Boolean))

      const followingRaw: any[] = (followsRes as any)?.data ?? []
      const followingIdArr: string[] = followingRaw.map((r: any) => r.following_id)
      setFollowingIds(new Set(followingIdArr))
      setFollowingCount(followingIdArr.length)

      setFollowersCount((followersRes as any)?.count ?? 0)
      setImagePosts((imageRes as any)?.data ?? [])
      const tr = tweetRes as any
      if (tr?.error) console.error('tweets fetch error:', tr.error)
      setTweets((tr?.data ?? []) as TweetData[])

      setLoading(false)
    }
    load()
  }, [router])

  async function loadTweets(uid: string, supabaseClient?: any) {
    const client = supabaseClient ?? createClient()
    setTweetLoading(true)
    const { data, error } = await client
      .from('tweets')
      .select('*, profiles!tweets_user_id_fkey(display_name, nationality, avatar_url), tweet_reactions!tweet_reactions_tweet_id_fkey(user_id, reaction), tweet_replies!tweet_replies_tweet_id_fkey(id)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) console.error('loadTweets error:', error)
    setTweets((data ?? []) as TweetData[])
    setTweetLoading(false)
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/')
  }

  async function toggleIndustryVisibility() {
    if (savingIndustry || !userId) return
    const next = !showIndustry
    setShowIndustry(next)
    setSavingIndustry(true)
    await createClient().from('profiles').update({ show_industry: next }).eq('id', userId)
    setSavingIndustry(false)
  }

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const industryInfo = profile.industry
    ? INDUSTRIES.find((i: any) => i.id === profile.industry)
    : null

  const bannerGradient = industryInfo
    ? industryInfo.gradient
    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'

  return (
    <div className="max-w-md mx-auto min-h-screen bg-stone-50">

      {/* ── バナー + アバター ── */}
      <div className="relative">
        <div className="h-32 w-full" style={{ background: bannerGradient }} />

        {/* 設定ボタン */}
        <Link
          href="/settings"
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <Settings size={16} className="text-white" />
        </Link>

        {/* アバター */}
        <div className="absolute left-4" style={{ bottom: -36 }}>
          <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden bg-stone-100 flex items-center justify-center shadow-md">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-3xl">🙂</span>
            }
          </div>
          {profile.is_online && (
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
          )}
        </div>

        {/* 信頼ティアバッジ */}
        <div className="absolute right-4" style={{ bottom: -28 }}>
          {trust && <TrustBadge tierId={trust.tier} size="sm" showLabel={true} />}
        </div>
      </div>

      {/* ── プロフ情報 ── */}
      <div className="pt-14 px-4 pb-3 bg-white border-b border-stone-100">
        <h2 className="font-extrabold text-stone-900 text-xl leading-tight truncate">
          {profile.display_name}
        </h2>
        {profile.VILLIA_id && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(profile.VILLIA_id!)
              setIdCopied(true)
              setTimeout(() => setIdCopied(false), 2000)
            }}
            className="flex items-center gap-1 mt-0.5 active:opacity-60 transition-opacity"
          >
            <span className="text-xs text-stone-400 font-mono">#{profile.VILLIA_id}</span>
            {idCopied
              ? <Check size={11} className="text-green-500" />
              : <Copy size={11} className="text-stone-300" />
            }
          </button>
        )}

        {profile.bio && (
          <p className="text-sm text-stone-700 mt-2 leading-relaxed">{profile.bio}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          {industryInfo && (
            <div className="flex items-center gap-1.5">
              {showIndustry ? (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: `${industryInfo.color}15`, color: industryInfo.color }}>
                  {industryInfo.emoji} {industryInfo.id}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-400">
                  {industryInfo.emoji} 非公開
                </span>
              )}
              <button
                onClick={toggleIndustryVisibility}
                disabled={savingIndustry}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-stone-100 active:bg-stone-200 transition-colors disabled:opacity-40"
                title={showIndustry ? '職業を非表示にする' : '職業を公開する'}
              >
                {showIndustry
                  ? <Eye size={13} className="text-stone-400" />
                  : <EyeOff size={13} className="text-stone-400" />
                }
              </button>
            </div>
          )}
          {profile.created_at && (
            <span className="text-xs text-stone-400">
              🗓️ {new Date(profile.created_at).getFullYear()}年{new Date(profile.created_at).getMonth() + 1}月から
            </span>
          )}
        </div>

        {/* フォロー / フォロワー / 投稿 */}
        <div className="flex gap-5 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-stone-900 text-sm">{followingCount}</span>
            <span className="text-xs text-stone-500">フォロー中</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-stone-900 text-sm">{followersCount}</span>
            <span className="text-xs text-stone-500">フォロワー</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-stone-900 text-sm">{tweets.length}</span>
            <span className="text-xs text-stone-500">投稿</span>
          </div>
        </div>
      </div>

      {/* ── タブ ── */}
      <div className="flex bg-white border-b border-stone-100 sticky top-0 z-10">
        {([
          { id: 'tweets',          label: '投稿' },
          { id: 'images',          label: '画像' },
          { id: 'joined_villages', label: 'フォロー村' },
          { id: 'hosted_villages', label: 'オーナー村' },
        ] as { id: ProfileTab; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-3 text-xs font-bold transition-colors relative"
            style={{ color: activeTab === tab.id ? '#0c0a09' : '#a8a29e' }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-stone-900" />
            )}
          </button>
        ))}
      </div>

      {/* ── タブコンテンツ ── */}
      <div className="pb-32">

        {/* 投稿タブ */}
        {activeTab === 'tweets' && (
          <div>
            {tweetLoading ? (
              <div className="space-y-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white border-b border-stone-50 px-4 py-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-stone-100 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-stone-100 rounded w-1/4" />
                        <div className="h-3.5 bg-stone-100 rounded w-full" />
                        <div className="h-3.5 bg-stone-100 rounded w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : tweets.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center px-6">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
                  <Pencil size={28} className="text-stone-300" />
                </div>
                <p className="font-bold text-stone-600 text-sm">まだ投稿がありません</p>
                <p className="text-xs text-stone-400 mt-1.5">思ったことをつぶやいてみよう</p>
                <button
                  onClick={() => setShowCompose(true)}
                  className="mt-5 px-5 py-2.5 rounded-full text-sm font-bold text-white active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg,#1c1917,#3c3836)' }}
                >
                  最初の投稿をする
                </button>
              </div>
            ) : (
              <div className="bg-white divide-y divide-stone-50">
                {tweets.map(t => (
                  <TweetCard
                    key={t.id}
                    tweet={t}
                    myId={userId}
                    onUpdate={() => userId && loadTweets(userId)}
                    showBorder={false}
                    canInteract={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 画像タブ */}
        {activeTab === 'images' && (
          <div>
            {imagePosts.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center px-6">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
                  <span className="text-3xl">🖼️</span>
                </div>
                <p className="font-bold text-stone-600 text-sm">まだ画像投稿がありません</p>
                <p className="text-xs text-stone-400 mt-1.5">仕事村に画像付きで投稿しよう</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 bg-stone-100">
                {imagePosts.map((post: any) => (
                  <div
                    key={post.id}
                    className="aspect-square overflow-hidden bg-stone-200 active:opacity-80 transition-opacity"
                    onClick={() => router.push(`/guild/${post.id}`)}
                  >
                    <img
                      src={post.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* フォロー村タブ */}
        {activeTab === 'joined_villages' && (
          <div>
            {joinedVillages.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <span className="text-4xl mb-3">🏘️</span>
                <p className="text-sm font-bold text-stone-600">まだ村に参加していません</p>
                <button
                  onClick={() => router.push('/villages')}
                  className="mt-4 px-5 py-2.5 bg-brand-500 text-white text-xs font-bold rounded-2xl active:scale-95 transition-all"
                >
                  村を探す
                </button>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 bg-white">
                {joinedVillages.map((v: any) => {
                  const vs = VILLAGE_TYPE_STYLES[v.type] ?? VILLAGE_TYPE_STYLES['雑談']
                  return (
                    <Link key={v.id} href={`/villages/${v.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-stone-50 transition-colors">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
                        style={{ background: vs.gradient }}>
                        {v.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate">{v.name}</p>
                        <p className="text-[11px] text-stone-400">
                          <Users size={9} className="inline mr-0.5" />{v.member_count}人 · 今週{v.post_count_7d}件
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-stone-300 flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* オーナー村タブ */}
        {activeTab === 'hosted_villages' && (
          <div>
            {hostedVillages.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Crown size={36} className="text-stone-200 mb-3" />
                <p className="text-sm font-bold text-stone-600">まだ村を作っていません</p>
                <button
                  onClick={() => router.push('/villages/create')}
                  className="mt-4 px-5 py-2.5 bg-brand-500 text-white text-xs font-bold rounded-2xl active:scale-95 transition-all"
                >
                  村を作る
                </button>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 bg-white">
                {hostedVillages.map((v: any) => {
                  const vs = VILLAGE_TYPE_STYLES[v.type] ?? VILLAGE_TYPE_STYLES['雑談']
                  return (
                    <Link key={v.id} href={`/villages/${v.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-stone-50 transition-colors">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
                        style={{ background: vs.gradient }}>
                        {v.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-sm font-bold text-stone-900 truncate">{v.name}</p>
                          <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex-shrink-0">
                            <Crown size={8} /> 村長
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400">
                          <Users size={9} className="inline mr-0.5" />{v.member_count}人 · 今週{v.post_count_7d}件
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-stone-300 flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 下部コンテンツ（全タブ共通） ── */}
        <div className="px-4 pt-4 space-y-3">
          {trust && !trust.phone_verified && (
            <button
              onClick={() => setShowPhoneVerify(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left active:scale-[0.99] transition-all bg-white border border-brand-100"
            >
              <span className="text-2xl">📱</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-brand-700">電話番号を認証する</p>
                <p className="text-xs text-brand-400 mt-0.5">投稿・通話が解放されます · +30pt</p>
              </div>
              <ChevronRight size={16} className="text-brand-300" />
            </button>
          )}

          {trust && (
            <TrustCard
              trust={{
                score:          trust.score,
                tier:           trust.tier,
                total_helped:   trust.total_helped,
                phone_verified: trust.phone_verified,
              }}
              progress={tierProgress}
              isPremium={!!profile?.is_premium}
            />
          )}

          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden divide-y divide-stone-50 shadow-sm">
            {[
              { href: '/settings', icon: '⚙️',  label: 'プロフィールを編集' },
              { href: '/invite',   icon: '🤝',  label: '友達を招待する' },
              { href: '/terms',    icon: '📄',  label: '利用規約' },
              { href: '/privacy',  icon: '🔒',  label: 'プライバシーポリシー' },
              { href: '/contact',  icon: '✉️',  label: 'お問い合わせ' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-4 py-3.5 active:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base w-6 text-center">{item.icon}</span>
                  <span className="text-sm text-stone-700 font-medium">{item.label}</span>
                </div>
                <ChevronRight size={14} className="text-stone-300" />
              </Link>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-2xl border border-red-100 bg-red-50 text-red-500 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
          >
            <LogOut size={15} /> ログアウト
          </button>
        </div>
      </div>

      {/* ── ツイートFAB ── */}
      <button
        onClick={() => setShowCompose(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all z-30"
        style={{
          background: 'linear-gradient(135deg,#1c1917 0%,#3c3836 100%)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}
      >
        <Pencil size={22} className="text-white" strokeWidth={2} />
      </button>

      {/* ── コンポーズシート ── */}
      {showCompose && userId && (
        <TweetComposeSheet
          userId={userId}
          avatarUrl={profile.avatar_url}
          displayName={profile.display_name}
          onClose={() => setShowCompose(false)}
          onPosted={async () => {
            if (userId) await loadTweets(userId)
            setActiveTab('tweets')
          }}
        />
      )}

      {/* ── モーダル ── */}
      {showPhoneVerify && (
        <PhoneVerifyModal
          onClose={() => setShowPhoneVerify(false)}
          onVerified={async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              const t = await getUserTrust(user.id)
              setTrust(t)
            }
          }}
        />
      )}
    </div>
  )
}
