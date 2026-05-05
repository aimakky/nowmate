'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrustCard } from '@/components/ui/TrustBadge'
import TrustBadge from '@/components/ui/TrustBadge'
// PhoneVerifyModal は TrustVerificationCard 内部で管理される
import { getUserTrust, fetchTierProgress, type TierProgress } from '@/lib/trust'
import { Settings, LogOut, ChevronRight, Crown, Users, Copy, Check, Pencil, X, Eye, EyeOff, User } from 'lucide-react'
import { VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'
import { INDUSTRIES } from '@/lib/guild'
import TweetCard, { type TweetData } from '@/components/ui/TweetCard'
import DMPrivacySettings from '@/components/features/DMPrivacySettings'
import GuideTab from '@/components/rules/GuideTab'
import FeaturesTab from '@/components/features-guide/FeaturesTab'
import TrustVerificationCard from '@/components/features/TrustVerificationCard'

type ProfileTab = 'tweets' | 'images' | 'joined_villages' | 'hosted_villages' | 'features' | 'guide'

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
      await onPosted()
      onClose()
    }
  }

  const remaining = MAX - text.length
  const pct = text.length / MAX
  const circleR = 9
  const circleC = 2 * Math.PI * circleR

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative rounded-t-3xl w-full max-w-md mx-auto overflow-hidden"
        style={{ background: '#0a0a18', border: '1px solid rgba(234,242,255,0.12)', borderBottom: 'none' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ドラッグハンドル */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(234,242,255,0.18)' }} />
        </div>

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-2.5">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full active:opacity-60 transition-opacity"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <X size={18} style={{ color: 'rgba(240,238,255,0.55)' }} />
          </button>
          <button
            onClick={handlePost}
            disabled={!text.trim() || sending || sent || text.length > MAX}
            className="px-5 py-1.5 rounded-full text-sm font-extrabold text-white disabled:opacity-40 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #EAF2FF 0%, #B8C7D9 100%)', boxShadow: '0 4px 20px rgba(234,242,255,0.24)' }}
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
            ) : sent ? '✓ 投稿済み' : '投稿する'}
          </button>
        </div>

        {/* 入力エリア */}
        <div className="flex gap-3 px-5 pt-1 pb-4">
          <div className="flex-shrink-0">
            <div
              className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #EAF2FF, #FF4D90)' }}
            >
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
              className="w-full text-[17px] leading-relaxed resize-none focus:outline-none bg-transparent"
              style={{ color: '#F0EEFF' }}
            />
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(234,242,255,0.09)' }}>
          <p className="text-[11px]" style={{ color: 'rgba(240,238,255,0.3)' }}>タイムラインに公開されます</p>
          <div className="flex items-center gap-2.5">
            <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
              <circle cx="12" cy="12" r={circleR} fill="none" stroke="rgba(234,242,255,0.12)" strokeWidth="2.5" />
              <circle cx="12" cy="12" r={circleR} fill="none"
                stroke={pct > 0.9 ? '#FF4D90' : '#EAF2FF'}
                strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={circleC}
                strokeDashoffset={circleC * (1 - pct)}
                style={{ transition: 'stroke-dashoffset 0.1s' }}
              />
            </svg>
            <span className="text-xs font-bold" style={{ color: remaining < 20 ? '#FF4D90' : 'rgba(240,238,255,0.3)' }}>
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
  // 電話認証モーダルの状態は TrustVerificationCard が内部で持つため不要
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
      supabase.rpc('update_last_seen', { p_user_id: user.id })

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

    // 投稿者本人 1 名分の Trust Tier をマージ（TweetCard のバッジ表示用）
    const rows = (data ?? []) as any[]
    if (rows.length > 0) {
      const { data: trustRow } = await client
        .from('user_trust')
        .select('tier')
        .eq('user_id', uid)
        .maybeSingle()
      const tier = (trustRow as any)?.tier as string | undefined
      for (const r of rows) {
        r.user_trust = tier ? { tier } : null
      }
    }
    setTweets(rows as TweetData[])
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
      <div className="flex items-center justify-center h-screen" style={{ background: '#0d0b1f' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#EAF2FF', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const industryInfo = profile.industry
    ? INDUSTRIES.find((i: any) => i.id === profile.industry)
    : null

  const bannerGradient = industryInfo
    ? industryInfo.gradient
    : 'linear-gradient(135deg, #0a0a18 0%, #0d0d1e 50%, #080818 100%)'

  return (
    <div className="max-w-md mx-auto min-h-screen relative overflow-x-hidden" style={{ background: '#0d0b1f' }}>

      {/* シルバーグロー（右上） */}
      <div className="absolute top-0 right-0 w-80 h-80 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle at 80% 15%, rgba(234,242,255,0.18) 0%, rgba(184,199,217,0.1) 40%, transparent 70%)' }} />

      {/* ── ヘッダー行 ── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-0">
        {/* 左：ユーザーを探す（人アイコンタップで /users へ） */}
        <Link
          href="/users"
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ border: '1.5px solid rgba(234,242,255,0.35)', background: 'rgba(234,242,255,0.06)' }}
          title="ユーザーを探す"
        >
          <User size={18} style={{ color: '#EAF2FF' }} />
        </Link>
        {/* 右：設定アイコン（六角形） */}
        <Link
          href="/settings"
          className="w-10 h-10 flex items-center justify-center active:scale-90 transition-all"
          style={{
            border: '1.5px solid rgba(234,242,255,0.35)',
            background: 'rgba(234,242,255,0.06)',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }}
        >
          <Settings size={16} style={{ color: '#EAF2FF' }} />
        </Link>
      </div>

      {/* ── プロフィール行（アバター左 + 名前右） ── */}
      <div className="relative z-10 flex items-center gap-5 px-5 pt-6 pb-5">
        {/* アバター */}
        <div className="relative flex-shrink-0">
          <div
            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              border: '2px solid rgba(234,242,255,0.45)',
              boxShadow: trust?.tier === 'pillar'
                ? '0 0 30px rgba(255,77,144,0.6), 0 0 60px rgba(255,77,144,0.2)'
                : '0 0 24px rgba(234,242,255,0.28), 0 0 48px rgba(184,199,217,0.12)',
              background: 'rgba(234,242,255,0.07)',
            }}
          >
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-4xl">🙂</span>
            }
          </div>
          {trust?.tier === 'pillar' && (
            <span className="absolute -top-1 -right-1 text-base leading-none">✨</span>
          )}
          {profile.is_online && (
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2"
              style={{ background: '#7CFF82', borderColor: '#0d0b1f' }} />
          )}
        </div>

        {/* 名前・ID・bio */}
        <div className="flex-1 min-w-0">
          <h2 className="font-extrabold text-2xl leading-tight truncate" style={{ color: '#F0EEFF' }}>
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
              <span className="text-xs font-mono" style={{ color: 'rgba(240,238,255,0.3)' }}>#{profile.VILLIA_id}</span>
              {idCopied
                ? <Check size={11} style={{ color: '#7CFF82' }} />
                : <Copy size={11} style={{ color: 'rgba(240,238,255,0.3)' }} />
              }
            </button>
          )}
          {profile.bio && (
            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'rgba(240,238,255,0.6)' }}>{profile.bio}</p>
          )}
          {trust && (
            <div className="mt-2">
              <TrustBadge tierId={trust.tier} size="sm" showLabel={true} />
            </div>
          )}
        </div>
      </div>

      {/* ── 統計カード ── */}
      <div className="relative z-10 mx-4 mb-3 rounded-2xl overflow-hidden"
        style={{ background: 'rgba(234,242,255,0.04)', border: '1px solid rgba(234,242,255,0.14)', boxShadow: '0 0 24px rgba(234,242,255,0.06)' }}>
        <div className="flex">
          {[
            { count: followingCount, label: 'フォロー中' },
            { count: followersCount, label: 'フォロワー' },
            { count: tweets.length,  label: '投稿' },
          ].map((stat, i) => (
            <div key={i} className="flex-1 flex flex-col items-center py-4 relative">
              {i > 0 && (
                <div className="absolute left-0 top-3 bottom-3 w-px"
                  style={{ background: 'rgba(184,199,217,0.18)' }} />
              )}
              <span className="font-extrabold text-xl" style={{ color: '#EAF2FF' }}>{stat.count}</span>
              <span className="text-xs mt-0.5" style={{ color: 'rgba(184,199,217,0.6)' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 職業・入会日 */}
      {(industryInfo || profile.created_at) && (
        <div className="relative z-10 flex flex-wrap items-center gap-2 px-4 mb-3">
          {industryInfo && (
            <div className="flex items-center gap-1.5">
              {showIndustry ? (
                <span
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: `${industryInfo.color}20`, color: industryInfo.color, border: `1px solid ${industryInfo.color}40` }}
                >
                  {industryInfo.emoji} {industryInfo.id}
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.3)', border: '1px solid rgba(234,242,255,0.09)' }}
                >
                  {industryInfo.emoji} 非公開
                </span>
              )}
              <button
                onClick={toggleIndustryVisibility}
                disabled={savingIndustry}
                className="w-6 h-6 flex items-center justify-center rounded-full transition-colors disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                title={showIndustry ? '職業を非表示にする' : '職業を公開する'}
              >
                {showIndustry
                  ? <Eye size={13} style={{ color: 'rgba(240,238,255,0.4)' }} />
                  : <EyeOff size={13} style={{ color: 'rgba(240,238,255,0.4)' }} />
                }
              </button>
            </div>
          )}
          {profile.created_at && (
            <span className="text-xs" style={{ color: 'rgba(240,238,255,0.3)' }}>
              🗓️ {new Date(profile.created_at).getFullYear()}年{new Date(profile.created_at).getMonth() + 1}月から
            </span>
          )}
        </div>
      )}

      {/* ── タブ ── */}
      <div className="relative z-10 mx-4 mb-1 rounded-2xl overflow-hidden sticky top-2"
        style={{ background: 'rgba(234,242,255,0.04)', border: '1px solid rgba(184,199,217,0.14)', boxShadow: '0 0 16px rgba(234,242,255,0.05)' }}>
        <div className="flex">
          {([
            { id: 'tweets',          label: '投稿' },
            { id: 'images',          label: '画像' },
            { id: 'joined_villages', label: '参加中' },
            { id: 'hosted_villages', label: 'ホスト' },
            { id: 'features',        label: 'できること' },
            { id: 'guide',           label: '安心ガイド' },
          ] as { id: ProfileTab; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-3.5 text-xs font-bold transition-colors relative"
              style={{ color: activeTab === tab.id ? '#EAF2FF' : 'rgba(184,199,217,0.4)' }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #EAF2FF, #B8C7D9)', boxShadow: '0 0 8px rgba(234,242,255,0.5)' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── タブコンテンツ ── */}
      <div className="pb-32 relative z-10">

        {/* 投稿タブ */}
        {activeTab === 'tweets' && (
          <div>
            {tweetLoading ? (
              <div className="space-y-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="px-4 py-4 animate-pulse" style={{ borderBottom: '1px solid rgba(234,242,255,0.05)' }}>
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: 'rgba(234,242,255,0.06)' }} />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 rounded w-1/4" style={{ background: 'rgba(234,242,255,0.09)' }} />
                        <div className="h-3.5 rounded w-full" style={{ background: 'rgba(234,242,255,0.05)' }} />
                        <div className="h-3.5 rounded w-3/4" style={{ background: 'rgba(234,242,255,0.05)' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : tweets.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center px-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'rgba(234,242,255,0.06)', border: '1px solid rgba(234,242,255,0.12)' }}
                >
                  <Pencil size={28} style={{ color: 'rgba(234,242,255,0.3)' }} />
                </div>
                <p className="font-bold text-sm" style={{ color: 'rgba(240,238,255,0.55)' }}>まだ投稿がありません</p>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(240,238,255,0.3)' }}>思ったことをつぶやいてみよう</p>
                <button
                  onClick={() => setShowCompose(true)}
                  className="mt-5 px-5 py-2.5 rounded-full text-sm font-bold text-white active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg, #EAF2FF 0%, #B8C7D9 100%)', boxShadow: '0 4px 20px rgba(234,242,255,0.24)' }}
                >
                  最初の投稿をする
                </button>
              </div>
            ) : (
              <div style={{ background: 'transparent' }}>
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
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'rgba(234,242,255,0.06)', border: '1px solid rgba(234,242,255,0.12)' }}
                >
                  <span className="text-3xl">🖼️</span>
                </div>
                <p className="font-bold text-sm" style={{ color: 'rgba(240,238,255,0.55)' }}>まだ画像投稿がありません</p>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(240,238,255,0.3)' }}>ギルドに画像付きで投稿しよう</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5" style={{ background: 'rgba(234,242,255,0.06)' }}>
                {imagePosts.map((post: any) => (
                  <div
                    key={post.id}
                    className="aspect-square overflow-hidden active:opacity-80 transition-opacity"
                    style={{ background: 'rgba(234,242,255,0.05)' }}
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

        {/* 参加中タブ */}
        {activeTab === 'joined_villages' && (() => {
          const gameCats = new Set(INDUSTRIES.map(i => i.id))
          const myVillages = joinedVillages.filter((v: any) => !gameCats.has(v.category))
          const myGuilds   = joinedVillages.filter((v: any) =>  gameCats.has(v.category))
          return (
            <div>
              {joinedVillages.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <span className="text-4xl mb-3">🏘️</span>
                  <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>まだギルド・ゲーム村に参加していません</p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => router.push('/guilds')}
                      className="px-4 py-2.5 text-white text-xs font-bold rounded-2xl active:scale-95 transition-all"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(234,242,255,0.12)' }}
                    >🛡️ ギルドを探す</button>
                    <button onClick={() => router.push('/guild')}
                      className="px-4 py-2.5 text-white text-xs font-bold rounded-2xl active:scale-95 transition-all"
                      style={{ background: 'linear-gradient(135deg, #EAF2FF 0%, #B8C7D9 100%)', boxShadow: '0 4px 16px rgba(234,242,255,0.24)' }}
                    >🎮 ゲーム村へ</button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* 🏕️ 村セクション */}
                  {myVillages.length > 0 && (
                    <>
                      <div className="px-4 py-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'rgba(240,238,255,0.3)' }}>🏕️ 村</p>
                      </div>
                      {myVillages.map((v: any) => {
                        const vs = VILLAGE_TYPE_STYLES[v.type] ?? VILLAGE_TYPE_STYLES['雑談']
                        return (
                          <Link key={v.id} href={`/villages/${v.id}`}
                            className="flex items-center gap-3 px-4 py-3.5 active:opacity-80 transition-colors"
                            style={{ borderBottom: '1px solid rgba(234,242,255,0.05)' }}>
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                              style={{ background: vs.gradient, boxShadow: '0 0 12px rgba(234,242,255,0.18)' }}>{v.icon}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate" style={{ color: '#F0EEFF' }}>{v.name}</p>
                              <p className="text-[11px]" style={{ color: '#B8C7D9' }}>
                                <Users size={9} className="inline mr-0.5" />{v.member_count}人 · 今週{v.post_count_7d}件
                              </p>
                            </div>
                            <ChevronRight size={14} style={{ color: 'rgba(240,238,255,0.3)' }} className="flex-shrink-0" />
                          </Link>
                        )
                      })}
                    </>
                  )}
                  {/* 🎮 ギルドセクション */}
                  {myGuilds.length > 0 && (
                    <>
                      <div className="px-4 py-2" style={{ background: 'rgba(234,242,255,0.04)' }}>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: '#EAF2FF' }}>🎮 ギルド</p>
                      </div>
                      {myGuilds.map((v: any) => {
                        const genreInfo = INDUSTRIES.find(i => i.id === v.category)
                        return (
                          <Link key={v.id} href={`/villages/${v.id}`}
                            className="flex items-center gap-3 px-4 py-3.5 active:opacity-80 transition-colors"
                            style={{ borderBottom: '1px solid rgba(234,242,255,0.05)' }}>
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                              style={{ background: genreInfo ? genreInfo.gradient : 'linear-gradient(135deg, #EAF2FF, #B8C7D9)', boxShadow: '0 0 12px rgba(234,242,255,0.18)' }}>{v.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-sm font-bold truncate" style={{ color: '#F0EEFF' }}>{v.name}</p>
                                {genreInfo && (
                                  <span
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                    style={{ background: `${genreInfo.color}20`, color: genreInfo.color, border: `1px solid ${genreInfo.color}40` }}
                                  >
                                    {genreInfo.emoji}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px]" style={{ color: '#B8C7D9' }}>
                                <Users size={9} className="inline mr-0.5" />{v.member_count}人 · 今週{v.post_count_7d}件
                              </p>
                            </div>
                            <ChevronRight size={14} style={{ color: 'rgba(240,238,255,0.3)' }} className="flex-shrink-0" />
                          </Link>
                        )
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* 作った村タブ */}
        {activeTab === 'hosted_villages' && (() => {
          const gameCats = new Set(INDUSTRIES.map(i => i.id))
          const ownedVillages = hostedVillages.filter((v: any) => !gameCats.has(v.category))
          const ownedGuilds   = hostedVillages.filter((v: any) =>  gameCats.has(v.category))
          return (
            <div>
              {hostedVillages.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <Crown size={36} style={{ color: 'rgba(234,242,255,0.18)' }} className="mb-3" />
                  <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>まだギルド・ゲーム村を作っていません</p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => router.push('/guilds/create')}
                      className="px-4 py-2.5 text-white text-xs font-bold rounded-2xl active:scale-95 transition-all"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(234,242,255,0.12)' }}
                    >🛡️ ギルドを作る</button>
                    <button onClick={() => router.push('/guild/create')}
                      className="px-4 py-2.5 text-white text-xs font-bold rounded-2xl active:scale-95 transition-all"
                      style={{ background: 'linear-gradient(135deg, #EAF2FF 0%, #B8C7D9 100%)', boxShadow: '0 4px 16px rgba(234,242,255,0.24)' }}
                    >🎮 ゲーム村を作る</button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* 🏕️ オーナー村セクション */}
                  {ownedVillages.length > 0 && (
                    <>
                      <div className="px-4 py-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'rgba(240,238,255,0.3)' }}>🏕️ オーナー村</p>
                      </div>
                      {ownedVillages.map((v: any) => {
                        const vs = VILLAGE_TYPE_STYLES[v.type] ?? VILLAGE_TYPE_STYLES['雑談']
                        return (
                          <Link key={v.id} href={`/villages/${v.id}`}
                            className="flex items-center gap-3 px-4 py-3.5 active:opacity-80 transition-colors"
                            style={{ borderBottom: '1px solid rgba(234,242,255,0.05)' }}>
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                              style={{ background: vs.gradient, boxShadow: '0 0 12px rgba(234,242,255,0.18)' }}>{v.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-sm font-bold truncate" style={{ color: '#F0EEFF' }}>{v.name}</p>
                                <span
                                  className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                  style={{ background: 'rgba(255,196,0,0.1)', color: '#FFD700', border: '1px solid rgba(255,196,0,0.3)' }}
                                >
                                  <Crown size={8} /> 村長
                                </span>
                              </div>
                              <p className="text-[11px]" style={{ color: '#B8C7D9' }}>
                                <Users size={9} className="inline mr-0.5" />{v.member_count}人 · 今週{v.post_count_7d}件
                              </p>
                            </div>
                            <ChevronRight size={14} style={{ color: 'rgba(240,238,255,0.3)' }} className="flex-shrink-0" />
                          </Link>
                        )
                      })}
                    </>
                  )}
                  {/* 🎮 オーナーギルドセクション */}
                  {ownedGuilds.length > 0 && (
                    <>
                      <div className="px-4 py-2" style={{ background: 'rgba(234,242,255,0.04)' }}>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: '#EAF2FF' }}>🎮 オーナーギルド</p>
                      </div>
                      {ownedGuilds.map((v: any) => {
                        const genreInfo = INDUSTRIES.find(i => i.id === v.category)
                        return (
                          <Link key={v.id} href={`/villages/${v.id}`}
                            className="flex items-center gap-3 px-4 py-3.5 active:opacity-80 transition-colors"
                            style={{ borderBottom: '1px solid rgba(234,242,255,0.05)' }}>
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                              style={{ background: genreInfo ? genreInfo.gradient : 'linear-gradient(135deg, #EAF2FF, #B8C7D9)', boxShadow: '0 0 12px rgba(234,242,255,0.18)' }}>{v.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-sm font-bold truncate" style={{ color: '#F0EEFF' }}>{v.name}</p>
                                <span
                                  className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                  style={{ background: 'rgba(234,242,255,0.09)', color: '#EAF2FF', border: '1px solid rgba(234,242,255,0.18)' }}
                                >
                                  <Crown size={8} /> 団長
                                </span>
                              </div>
                              <p className="text-[11px]" style={{ color: '#B8C7D9' }}>
                                <Users size={9} className="inline mr-0.5" />{v.member_count}人 · 今週{v.post_count_7d}件
                              </p>
                            </div>
                            <ChevronRight size={14} style={{ color: 'rgba(240,238,255,0.3)' }} className="flex-shrink-0" />
                          </Link>
                        )
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* できること（機能ガイド）タブ */}
        {activeTab === 'features' && <FeaturesTab />}

        {/* 安心ガイドタブ */}
        {activeTab === 'guide' && <GuideTab />}

        {/* ── 下部コンテンツ（全タブ共通） ── */}
        <div className="px-4 pt-4 space-y-3">

          {/* ── 安心認証カード（電話番号 / 本人確認 / 年齢確認の状態を集約） ── */}
          {profile && userId && (
            <TrustVerificationCard
              userId={userId}
              phoneVerified={!!trust?.phone_verified}
              ageVerificationStatus={(profile as any).age_verification_status ?? 'unverified'}
              onChanged={async () => {
                // 認証完了後に trust と profile を即時再取得（楽観更新ではなく真値を取り直す）
                const supabase = createClient()
                const t = await getUserTrust(userId)
                if (t) setTrust(t)
                const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single()
                if (p) setProfile(p)
              }}
            />
          )}

          {/* ── DM プライバシー設定 ── */}
          {profile && userId && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(234,242,255,0.12)' }}
            >
              <div className="px-4 pt-4 pb-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest mb-1" style={{ color: 'rgba(240,238,255,0.3)' }}>DM受信設定</p>
                <p className="text-xs mb-3" style={{ color: 'rgba(240,238,255,0.4)' }}>誰からのDMを受け取るか設定できます</p>
                <DMPrivacySettings
                  userId={userId}
                  initialValue={(profile as any).dm_privacy ?? 'all'}
                />
              </div>
            </div>
          )}

          {/* ── 信頼スコアカード ── */}
          {trust && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(234,242,255,0.12)' }}
            >
              <div className="px-4 pt-4 pb-3">
                <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color: 'rgba(240,238,255,0.3)' }}>信頼スコア</p>
                <div className="flex items-end gap-3">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-extrabold leading-none" style={{
                        background: trust.score >= 1000
                          ? 'linear-gradient(135deg, #FFD700, #FF8C00)'
                          : trust.score >= 600
                          ? 'linear-gradient(135deg, #7CFF82, #00E676)'
                          : trust.score >= 300
                          ? 'linear-gradient(135deg, #49E1FF, #00B4CC)'
                          : 'linear-gradient(135deg, #EAF2FF, #B8C7D9)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}>
                        {trust.score.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: 'rgba(240,238,255,0.4)' }}>pt</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.55)' }}>
                      {trust.total_helped > 0 ? `${trust.total_helped}人の役に立った` : 'まず電話認証してみよう'}
                    </p>
                  </div>
                  <div className="flex-1 flex justify-end pb-1">
                    <div className="text-3xl">
                      {trust.tier === 'pillar' ? '✨' : trust.tier === 'trusted' ? '🌳' : trust.tier === 'regular' ? '🌿' : trust.tier === 'resident' ? '🏡' : '🪴'}
                    </div>
                  </div>
                </div>

                {/* スコアバー */}
                {tierProgress && (() => {
                  // ラベルは lib/trust.ts の TRUST_TIERS と整合（短縮表示は許容）
                  const tiers = [
                    { id: 'resident', min: 100,  label: '住人',     color: '#B8C7D9' },
                    { id: 'regular',  min: 300,  label: '常連',     color: '#7CFF82' },
                    { id: 'trusted',  min: 600,  label: '信頼住人', color: '#EAF2FF' },
                    { id: 'pillar',   min: 1000, label: '中心',     color: '#FF4D90' },
                  ]
                  const next = tiers.find(t => trust.score < t.min)
                  if (!next) return (
                    <div className="mt-3 text-center py-2">
                      <p className="text-xs font-bold" style={{ color: '#FF4D90' }}>✨ 最高ティア達成！</p>
                    </div>
                  )
                  const prev = tiers[tiers.findIndex(t => t.id === next.id) - 1]
                  const base = prev?.min ?? 0
                  const pct  = Math.round(((trust.score - base) / (next.min - base)) * 100)
                  return (
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-semibold" style={{ color: 'rgba(240,238,255,0.4)' }}>次のティアまで</span>
                        <span className="text-[10px] font-bold" style={{ color: next.color }}>
                          あと {(next.min - trust.score).toLocaleString()}pt → {next.label}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(234,242,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${next.color}80, ${next.color})` }} />
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* ポイント獲得方法ヒント */}
              <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(234,242,255,0.06)' }}>
                <div className="flex items-center gap-3 text-[10px]" style={{ color: 'rgba(240,238,255,0.4)' }}>
                  <span>📝 投稿 +2pt</span>
                  <span>🤝 相談解決 +25pt</span>
                  <span>🔥 7日連続 +10pt</span>
                </div>
              </div>
            </div>
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

          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(234,242,255,0.12)' }}
          >
            {[
              { href: '/settings', icon: '⚙️',  label: 'プロフィールを編集' },
              { href: '/invite',   icon: '🤝',  label: '友達を招待する' },
              { href: '/terms',    icon: '📄',  label: '利用規約' },
              { href: '/privacy',  icon: '🔒',  label: 'プライバシーポリシー' },
              { href: '/contact',  icon: '✉️',  label: 'お問い合わせ' },
            ].map((item, idx, arr) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-4 py-3.5 active:opacity-80 transition-colors"
                style={{ borderBottom: idx < arr.length - 1 ? '1px solid rgba(234,242,255,0.05)' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base w-6 text-center">{item.icon}</span>
                  <span className="text-sm font-medium" style={{ color: 'rgba(240,238,255,0.7)' }}>{item.label}</span>
                </div>
                <ChevronRight size={14} style={{ color: 'rgba(240,238,255,0.3)' }} />
              </Link>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
            style={{ background: 'rgba(255,77,144,0.08)', border: '1px solid rgba(255,77,144,0.25)', color: '#FF4D90' }}
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
          background: 'rgba(234,242,255,0.08)',
          border: '1.5px solid rgba(234,242,255,0.45)',
          boxShadow: '0 8px 24px rgba(234,242,255,0.18), 0 0 30px rgba(184,199,217,0.12)',
        }}
      >
        <Pencil size={22} style={{ color: '#EAF2FF' }} strokeWidth={2} />
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

      {/* PhoneVerifyModal は TrustVerificationCard 内で管理されるため、ここでは不要 */}
    </div>
  )
}


