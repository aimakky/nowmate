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

// 旧: tweets / images / joined_villages / hosted_villages / features / guide の 6 タブ。
// 整理後: 投稿 / 参加中 / プロフィール / 安心 の 4 タブ。
//  - images は 投稿 に統合（タブとしては削除、画像投稿データは残置）
//  - hosted_villages（自分が作ったギルド・村）は 参加中 タブ内に「オーナー」subsection として表示
//  - following / followers は統計カードクリックで切り替わる「擬似タブ」として追加。
//    上部のタブバー (4 タブ) には出さず、統計カード自体を active 表示の起点にする。
type ProfileTab = 'tweets' | 'joined_villages' | 'features' | 'guide' | 'following' | 'followers'

type FollowUser = {
  id: string
  display_name: string | null
  avatar_url: string | null
  VILLIA_id: string | null
}

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

  // フォロー中 / フォロワー一覧（lazy load）。null = 未取得、[] = 0件、配列 = 取得済
  const [followingList,  setFollowingList]  = useState<FollowUser[] | null>(null)
  const [followersList,  setFollowersList]  = useState<FollowUser[] | null>(null)
  const [followListLoading, setFollowListLoading] = useState(false)

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
        // PostgREST embed (profiles!fkey, tweet_reactions!fkey, tweet_replies!fkey)
        // を撤廃。embed 解決失敗で親 row が消える脆弱性回避。
        // 関連データは Promise.all 後に別 query 並列取得 + Map merge。
        supabase
          .from('tweets')
          .select('*')
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

      // tweets を embed 撤廃版で取得した後の enrichment。
      // profiles / tweet_reactions / tweet_replies / user_trust を別 query で
      // 並列取得し in-memory Map で merge する。fetchTweets と同パターン。
      const rawMyTweets = (tr?.data ?? []) as any[]
      if (rawMyTweets.length > 0) {
        const tIds = rawMyTweets.map((t: any) => t.id)
        const [profEnrich, reactEnrich, replyEnrich, trustEnrich] = await Promise.all([
          supabase.from('profiles')
            .select('id, display_name, nationality, avatar_url, age_verified, age_verification_status')
            .eq('id', user.id).maybeSingle(),
          supabase.from('tweet_reactions').select('tweet_id, user_id, reaction').in('tweet_id', tIds),
          supabase.from('tweet_replies').select('id, tweet_id').in('tweet_id', tIds),
          supabase.from('user_trust').select('tier').eq('user_id', user.id).maybeSingle(),
        ])
        const myProf = (profEnrich as any).data ?? null
        const reactByT = new Map<string, any[]>()
        for (const r of ((reactEnrich as any).data ?? [])) {
          if (!reactByT.has(r.tweet_id)) reactByT.set(r.tweet_id, [])
          reactByT.get(r.tweet_id)!.push({ user_id: r.user_id, reaction: r.reaction })
        }
        const replyByT = new Map<string, any[]>()
        for (const r of ((replyEnrich as any).data ?? [])) {
          if (!replyByT.has(r.tweet_id)) replyByT.set(r.tweet_id, [])
          replyByT.get(r.tweet_id)!.push({ id: r.id })
        }
        const tier = (trustEnrich as any).data?.tier as string | undefined
        for (const t of rawMyTweets) {
          t.profiles = myProf
          t.tweet_reactions = reactByT.get(t.id) ?? []
          t.tweet_replies = replyByT.get(t.id) ?? []
          t.user_trust = tier ? { tier } : null
        }
      }
      setTweets(rawMyTweets as TweetData[])

      setLoading(false)
    }
    load()
  }, [router])

  async function loadTweets(uid: string, supabaseClient?: any) {
    const client = supabaseClient ?? createClient()
    setTweetLoading(true)
    // PostgREST embed を撤廃 (embed 解決失敗で親 row が消える脆弱性回避)。
    // profiles / tweet_reactions / tweet_replies / user_trust は別 query 並列取得。
    const { data, error } = await client
      .from('tweets')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) console.error('loadTweets error:', error)

    const rows = (data ?? []) as any[]
    if (rows.length > 0) {
      const tIds = rows.map((t: any) => t.id)
      const [profRes, reactRes, replyRes, trustRes] = await Promise.all([
        client.from('profiles')
          .select('id, display_name, nationality, avatar_url')
          .eq('id', uid).maybeSingle(),
        client.from('tweet_reactions').select('tweet_id, user_id, reaction').in('tweet_id', tIds),
        client.from('tweet_replies').select('id, tweet_id').in('tweet_id', tIds),
        client.from('user_trust').select('tier').eq('user_id', uid).maybeSingle(),
      ])
      const myProf = (profRes as any).data ?? null
      const reactByT = new Map<string, any[]>()
      for (const r of ((reactRes as any).data ?? [])) {
        if (!reactByT.has(r.tweet_id)) reactByT.set(r.tweet_id, [])
        reactByT.get(r.tweet_id)!.push({ user_id: r.user_id, reaction: r.reaction })
      }
      const replyByT = new Map<string, any[]>()
      for (const r of ((replyRes as any).data ?? [])) {
        if (!replyByT.has(r.tweet_id)) replyByT.set(r.tweet_id, [])
        replyByT.get(r.tweet_id)!.push({ id: r.id })
      }
      const tier = (trustRes as any).data?.tier as string | undefined
      for (const r of rows) {
        r.profiles = myProf
        r.tweet_reactions = reactByT.get(r.id) ?? []
        r.tweet_replies = replyByT.get(r.id) ?? []
        r.user_trust = tier ? { tier } : null
      }
    }
    setTweets(rows as TweetData[])
    setTweetLoading(false)
  }

  // フォロー中 / フォロワーの一覧を遅延取得。
  // user_follows の relation: follower_id がフォローする側、following_id がされる側。
  //   フォロー中 = 自分が follower_id になっているレコードの相手 (following_id) を集める
  //   フォロワー = 自分が following_id になっているレコードの相手 (follower_id) を集める
  //
  // 過去の不具合: 統計カードに「フォロー中 1」と表示されているのに一覧では
  // 「まだフォロー中のユーザーはいません」となるケースがあった。原因は
  // user_follows から ids は取れているが、profiles.in() の結果が空 (RLS や
  // データ不整合) でも無条件に空状態にしていたため。今は ids が 1 件以上
  // あれば、profile 取得に失敗してもプレースホルダーで必ず表示するので、
  // 「数値 = 一覧」が崩れない。
  async function loadFollowList(uid: string, kind: 'following' | 'followers') {
    setFollowListLoading(true)
    const supabase = createClient()
    const { data: rows, error } = kind === 'following'
      ? await supabase.from('user_follows').select('following_id').eq('follower_id', uid)
      : await supabase.from('user_follows').select('follower_id').eq('following_id', uid)

    if (error) {
      console.error('[mypage] loadFollowList user_follows error:', error)
      if (kind === 'following') setFollowingList([])
      else setFollowersList([])
      setFollowListLoading(false)
      return
    }

    const ids = (rows ?? [])
      .map((r: any) => kind === 'following' ? r.following_id : r.follower_id)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0)

    if (ids.length === 0) {
      if (kind === 'following') setFollowingList([])
      else setFollowersList([])
      setFollowListLoading(false)
      return
    }

    const { data: profs, error: pErr } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, VILLIA_id')
      .in('id', ids)
    if (pErr) console.error('[mypage] follow profiles fetch error:', pErr, { ids })

    // profiles が部分的にしか取れなくても、ids ベースで必ず一覧化する。
    // 取れなかった分はプレースホルダー (display_name: '名無し') で表示し、
    // 件数表示と一覧の整合を保つ。
    const profMap = new Map<string, FollowUser>(
      (profs ?? []).map((p: any) => [p.id as string, p as FollowUser])
    )
    const list: FollowUser[] = ids.map(id => profMap.get(id) ?? {
      id,
      display_name: '名無し',
      avatar_url: null,
      VILLIA_id: null,
    })

    if (kind === 'following') setFollowingList(list)
    else setFollowersList(list)
    setFollowListLoading(false)
  }

  // タブ切替時、未取得ならその場でロード
  useEffect(() => {
    if (!userId) return
    if (activeTab === 'following' && followingList === null && !followListLoading) {
      loadFollowList(userId, 'following')
    } else if (activeTab === 'followers' && followersList === null && !followListLoading) {
      loadFollowList(userId, 'followers')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userId])

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
          {profile.bio ? (
            <Link href="/settings" className="block mt-1.5 active:opacity-70 transition-opacity">
              <p className="text-sm leading-relaxed inline" style={{ color: 'rgba(240,238,255,0.6)' }}>
                {profile.bio}
              </p>
              <Pencil size={10} className="inline ml-1.5 align-baseline" style={{ color: 'rgba(240,238,255,0.3)' }} />
            </Link>
          ) : (
            <Link href="/settings" className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium active:opacity-70 transition-opacity"
              style={{ color: 'rgba(157,92,255,0.7)' }}>
              <Pencil size={11} />
              <span>自己紹介を書く（例：一緒に遊べる仲間を探しています）</span>
            </Link>
          )}
          {trust && (
            <div className="mt-2">
              <TrustBadge tierId={trust.tier} size="sm" showLabel={true} />
            </div>
          )}
        </div>
      </div>

      {/* ── 統計カード（クリックで擬似タブ切替）──
          フォロー中 / フォロワー / 投稿 を押すと activeTab が切り替わる。
          投稿は通常の 'tweets' タブと同じ。フォロー系は ProfileTab 拡張 ('following' / 'followers')。 */}
      <div className="relative z-10 mx-4 mb-3 rounded-2xl overflow-hidden"
        style={{ background: 'rgba(234,242,255,0.04)', border: '1px solid rgba(234,242,255,0.14)', boxShadow: '0 0 24px rgba(234,242,255,0.06)' }}>
        <div className="flex">
          {([
            { tab: 'following', count: followingCount, label: 'フォロー中' },
            { tab: 'followers', count: followersCount, label: 'フォロワー' },
            { tab: 'tweets',    count: tweets.length,  label: '投稿' },
          ] as { tab: ProfileTab; count: number; label: string }[]).map((stat, i) => {
            const on = activeTab === stat.tab
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveTab(stat.tab)}
                aria-pressed={on}
                className="flex-1 flex flex-col items-center py-4 relative active:opacity-70 transition-opacity"
                style={{
                  background: on ? 'rgba(234,242,255,0.06)' : 'transparent',
                }}
              >
                {i > 0 && (
                  <div className="absolute left-0 top-3 bottom-3 w-px"
                    style={{ background: 'rgba(184,199,217,0.18)' }} />
                )}
                <span className="font-extrabold text-xl" style={{ color: on ? '#EAF2FF' : '#EAF2FF' }}>{stat.count}</span>
                <span className="text-xs mt-0.5" style={{ color: on ? '#EAF2FF' : 'rgba(184,199,217,0.6)' }}>{stat.label}</span>
                {on && (
                  <span
                    className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #EAF2FF, #B8C7D9)', boxShadow: '0 0 8px rgba(234,242,255,0.5)' }}
                  />
                )}
              </button>
            )
          })}
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
            { id: 'joined_villages', label: '参加中' },
            { id: 'features',        label: '使い方' },
            { id: 'guide',           label: '安心' },
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
      {/* 末尾の余白：BottomNav (64px) + safe-area + AIガイド/FAB のクリアランス */}
      <div className="relative z-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 9rem)' }}>

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

        {/* 画像タブは 投稿 に統合したため削除済み。imagePosts データは将来 投稿 タブで利用予定 */}

        {/* 参加中タブ — 参加中のギルド・村に加え、自分が作った（ホスト）ものも 1 画面に集約 */}
        {activeTab === 'joined_villages' && (() => {
          const gameCats = new Set(INDUSTRIES.map(i => i.id))
          const myVillages = joinedVillages.filter((v: any) => !gameCats.has(v.category))
          const myGuilds   = joinedVillages.filter((v: any) =>  gameCats.has(v.category))
          const ownedAll   = hostedVillages
          const hasAnything = joinedVillages.length > 0 || ownedAll.length > 0
          return (
            <div>
              {!hasAnything ? (
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
                  {/* 👑 オーナー subsection（旧「ホスト」タブをここに統合） */}
                  {ownedAll.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center gap-2"
                        style={{ background: 'rgba(255,201,40,0.06)' }}>
                        <Crown size={11} style={{ color: '#FFC928' }} />
                        <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: '#FFC928' }}>
                          オーナー（自分が作った場所）
                        </p>
                      </div>
                      {ownedAll.map((v: any) => {
                        const genreInfo = INDUSTRIES.find(i => i.id === v.category)
                        return (
                          <Link key={`owned-${v.id}`} href={`/villages/${v.id}`}
                            className="flex items-center gap-3 px-4 py-3.5 active:opacity-80 transition-colors"
                            style={{ borderBottom: '1px solid rgba(234,242,255,0.05)' }}>
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                              style={{
                                background: genreInfo ? genreInfo.gradient : 'linear-gradient(135deg,#FFC928,#FF9500)',
                                boxShadow: '0 0 12px rgba(255,201,40,0.25)',
                              }}>{v.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-sm font-bold truncate" style={{ color: '#F0EEFF' }}>{v.name}</p>
                                <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                  style={{ background: 'rgba(255,201,40,0.15)', color: '#FFC928', border: '1px solid rgba(255,201,40,0.3)' }}>
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


        {/* できること（機能ガイド）タブ */}
        {activeTab === 'features' && <FeaturesTab />}

        {/* 安心ガイドタブ */}
        {activeTab === 'guide' && <GuideTab />}

        {/* フォロー中 / フォロワー擬似タブ（統計カードクリックで開く） */}
        {(activeTab === 'following' || activeTab === 'followers') && (() => {
          const list = activeTab === 'following' ? followingList : followersList
          const emptyText = activeTab === 'following'
            ? 'まだフォロー中のユーザーはいません'
            : 'まだフォロワーはいません'
          const emptySub = activeTab === 'following'
            ? '気になる人を見つけたらフォローしてみよう'
            : '投稿や通話で交流するとフォロワーが増えます'

          // ロード中（一覧未取得 or fetch中）
          if (list === null || followListLoading) {
            return (
              <div className="space-y-0">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="px-4 py-3.5 animate-pulse flex items-center gap-3"
                    style={{ borderBottom: '1px solid rgba(234,242,255,0.05)' }}>
                    <div className="w-10 h-10 rounded-full flex-shrink-0"
                      style={{ background: 'rgba(234,242,255,0.06)' }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 rounded w-1/3" style={{ background: 'rgba(234,242,255,0.09)' }} />
                      <div className="h-3 rounded w-1/4" style={{ background: 'rgba(234,242,255,0.05)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )
          }

          // 0件
          if (list.length === 0) {
            return (
              <div className="flex flex-col items-center py-20 text-center px-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'rgba(234,242,255,0.06)', border: '1px solid rgba(234,242,255,0.12)' }}
                >
                  <Users size={28} style={{ color: 'rgba(234,242,255,0.3)' }} />
                </div>
                <p className="font-bold text-sm" style={{ color: 'rgba(240,238,255,0.55)' }}>{emptyText}</p>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(240,238,255,0.3)' }}>{emptySub}</p>
                {activeTab === 'following' && (
                  <Link
                    href="/users"
                    className="mt-5 px-5 py-2.5 rounded-full text-sm font-bold text-white active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg, #EAF2FF 0%, #B8C7D9 100%)', boxShadow: '0 4px 20px rgba(234,242,255,0.24)' }}
                  >
                    ユーザーを探す
                  </Link>
                )}
              </div>
            )
          }

          // 一覧
          return (
            <div>
              {list.map(u => (
                <Link
                  key={u.id}
                  href={`/profile/${u.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 active:opacity-80 transition-colors"
                  style={{ borderBottom: '1px solid rgba(234,242,255,0.05)' }}
                >
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(234,242,255,0.07)', border: '1px solid rgba(234,242,255,0.18)' }}
                  >
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-base">🙂</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: '#F0EEFF' }}>
                      {u.display_name || '名無し'}
                    </p>
                    {u.VILLIA_id && (
                      <p className="text-[11px] font-mono truncate" style={{ color: 'rgba(240,238,255,0.3)' }}>
                        #{u.VILLIA_id}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={14} style={{ color: 'rgba(240,238,255,0.3)' }} className="flex-shrink-0" />
                </Link>
              ))}
            </div>
          )
        })()}

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
                    { id: 'resident', min: 100,  label: '村人',       color: '#B8C7D9' },
                    { id: 'regular',  min: 300,  label: '常連',       color: '#7CFF82' },
                    { id: 'trusted',  min: 600,  label: '信頼の村人', color: '#EAF2FF' },
                    { id: 'pillar',   min: 1000, label: '柱',         color: '#FF4D90' },
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


