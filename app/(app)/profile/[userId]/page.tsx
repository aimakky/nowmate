'use client'

// Vercel Edge cache 対策は middleware.ts で全レスポンスに no-store を
// 注入する方式に統一。'use client' ページでは route segment config が
// build error を起こすため使わない。

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag } from '@/lib/utils'
import { ChevronRight, MessageSquare, MoreHorizontal, Flag, Ban } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import TrustBadge from '@/components/ui/TrustBadge'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import { isVerifiedByExistingSchema } from '@/lib/identity-types'
import Link from 'next/link'
import { getCategoryStyle, getTitleName, TITLE_LEVEL_STYLE } from '@/lib/qa'
import ReportModal from '@/components/features/ReportModal'
import { getGenreTitles, getIndustry } from '@/lib/guild'
import { startDM } from '@/lib/dm'
import TweetCard, { type TweetData } from '@/components/ui/TweetCard'
import PostActions from '@/components/ui/PostActions'
import PostCardShell from '@/components/ui/PostCardShell'
import PostCardHeader from '@/components/ui/PostCardHeader'
import { getUserDisplayName } from '@/lib/user-display'

// 村投稿 (village_posts) を投稿タブで TweetCard 同等のリッチ UI で描画する型。
// 2026-05-07: マッキーさん指示「投稿一覧は全て通常投稿UIで統一」を受け、
// 旧シンプルカード表示から TweetCard 風表示に刷新したため新設。
type ProfileVillagePost = {
  id: string
  content: string
  created_at: string
  village_id: string | null
  reaction_count: number
  village: { id: string; name: string; icon: string } | null
}

// プロフィール「投稿」タブで使う村投稿のリッチカード描画。
// 2026-05-08 (5 回目) マッキーさん指示「ミヤを含む全ユーザーマイページで
// timeline / 自分マイページと完全統一」を受け、wrapper / アバター / アクション行
// をすべて MyVillagePostInline + PostCard と完全同一に揃える。
//
// 視覚構造 (timeline PostCard / mypage MyVillagePostInline と完全同一):
// - 外側 wrapper: rounded-2xl + 紫グロー border + box shadow
// - 内側 padding: px-4 pt-3.5 pb-3
// - Avatar: 40x40 緑グラデ + 緑リング (Avatar コンポーネントから差し替え)
// - Action 行: 共通 PostActions コンポーネント (Heart / Comment / Share)
//
// 動作面 (クリック時に villages/[villageId] へ遷移して本来のリアクション動線に
// 乗せる) は profile 固有のため維持。村投稿は schema が tweets と異なり
// tweet_reactions / tweet_replies の DB 操作はしない。
function ProfileVillagePostInline({
  post, profile, trustTier, profileUserId, liked, onToggleLike,
}: {
  post: ProfileVillagePost
  profile: any
  trustTier: string | null
  profileUserId: string
  /** 自分がこの投稿にいいね済みか (UserProfilePage の likedIds から計算) */
  liked: boolean
  /** ハートボタン押下時に呼ぶ村投稿 like トグル関数 (画面遷移しない) */
  onToggleLike: (postId: string) => void
}) {
  const router = useRouter()
  const isVerified = isVerifiedByExistingSchema(profile)
  const flag = getNationalityFlag(profile?.nationality || '')
  const villageHref = post.village_id ? `/villages/${post.village_id}` : '/timeline'
  const profileHref = `/profile/${profileUserId}`

  function shareToX() {
    const village = post.village ? `${post.village.icon}${post.village.name}` : 'YVOICE'
    const host = (typeof window !== 'undefined' ? window.location.host : '') || 'nowmatejapan.com'
    const text = `${post.content}\n\n— ${village}より\n#YVOICE #ゲームコミュニティ\n${host}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <PostCardShell>
      {/* ヘッダー = 共通 PostCardHeader コンポーネント
          2026-05-08 (9 回目): TweetCard と内部レイアウトを完全統一するため、
          アバター + 名前 + バッジ + 国旗 + 時刻 + 三点メニューを PostCardHeader
          (components/ui/PostCardHeader.tsx) に集約。動作面 (三点メニュー =
          村遷移) は profile 固有のため onMenuClick で委譲。 */}
      <PostCardHeader
        profileHref={profileHref}
        displayName={getUserDisplayName(profile)}
        avatarUrl={profile?.avatar_url}
        avatarVariant="green"
        isVerified={isVerified}
        trustTier={trustTier}
        flag={flag}
        timestamp={post.created_at}
        onMenuClick={() => router.push(villageHref)}
        menuLabel="村を開く"
      />

      {/* 本文 */}
      <p
        className="text-sm leading-relaxed whitespace-pre-wrap"
        style={{ color: 'rgba(240,238,255,0.85)' }}
      >
        {post.content}
      </p>

      {/* アクション = 共通 PostActions コンポーネント。
          2026-05-08 マッキーさん指示「ハート押下時に画面遷移しない、いいね処理だけ
          実行する」を受けて、Heart の onHeart は親 (UserProfilePage) から渡される
          onToggleLike を呼ぶようにし、画面遷移しない仕様に変更。
          liked 状態も親 likedIds から受け取る。
          Comment は村ページでコメントするため村詳細遷移を維持。
          Share は X 共有起動 (画面遷移なし)。 */}
      <PostActions
        liked={liked}
        reactionCount={post.reaction_count}
        onHeart={() => onToggleLike(post.id)}
        onComment={() => router.push(villageHref)}
        onShare={shareToX}
      />

        {/* 村リンク (どの村への投稿かが分かるように小さく表示) */}
        {post.village && (
          <Link
            href={`/villages/${post.village_id}`}
            className="inline-flex items-center gap-1.5 mt-2 active:opacity-70 transition-opacity"
          >
            <span className="text-sm">{post.village.icon}</span>
            <span
              className="text-[11px] font-bold truncate max-w-[160px]"
              style={{ color: 'rgba(184,199,217,0.7)' }}
            >
              {post.village.name}
            </span>
            <ChevronRight size={11} style={{ color: 'rgba(184,199,217,0.3)' }} className="flex-shrink-0" />
          </Link>
        )}
    </PostCardShell>
  )
}

// QAAnswerWithQ 型は回答タブ削除に伴い未使用。qa_answers の DB データ
// 自体は残置 (将来の復活余地)。UI から外すだけ。

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  // 投稿一覧を tweets と village_posts で別 state に保持し、render 時に
  // 時系列でマージして表示する。マイページと同じ構造に揃え、UI も TweetCard
  // (tweets) / ProfileVillagePostInline (村投稿) でリッチに統一。
  const [richTweets, setRichTweets] = useState<TweetData[]>([])
  const [profileVillagePosts, setProfileVillagePosts] = useState<ProfileVillagePost[]>([])
  // 自分がいいねした village_posts の id 集合。timeline / mypage と同じ
  // village_reactions テーブルを正として、ハート押下で upsert/delete し
  // 画面遷移は起こさない (マッキーさん指示 2026-05-08)。
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
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
  // 旧: 'posts' | 'answers' の 2 タブ。回答タブは優先度が低いためユーザー
  // 可視タブから外し、代わりに 'videos' (動画投稿) と 'images' (画像投稿) を
  // 追加。回答データそのものは未削除 (DB に残置) で、将来の復活余地あり。
  const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'images'>('posts')
  // 画像投稿: guild_posts.image_url IS NOT NULL のレコード。マイページの
  // imageRes と同じデータ源 (guild_posts は画像付き投稿の DB 保管庫)。
  const [imagePosts, setImagePosts] = useState<Array<{ id: string; image_url: string; content: string | null; created_at: string }>>([])
  const [qaTitles, setQaTitles] = useState<any[]>([])
  const [genreTitles, setGenreTitles] = useState<{ genre: string; awarded_at: string }[]>([])
  const [dmLoading, setDmLoading] = useState(false)
  const [dmToast, setDmToast] = useState<string | null>(null)
  // 「下方向にスクロール中だけ N 件の投稿バーを表示」(2026-05-07 仕様変更):
  //   - 下スクロール → showPostCount = true
  //   - 上スクロール → 即 false
  //   - 停止後 500ms → false
  //   - 初期表示 → false
  // ±2px の閾値で iOS Safari のバウンド / 微動を無視する。
  const [showPostCount, setShowPostCount] = useState(false)
  const lastScrollYRef = useRef(0)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onScroll() {
      const currentY = window.scrollY
      const delta = currentY - lastScrollYRef.current
      if (delta > 2) {
        setShowPostCount(true)
      } else if (delta < -2) {
        setShowPostCount(false)
      }
      lastScrollYRef.current = currentY
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => {
        setShowPostCount(false)
      }, 500)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setMyId(user.id)
    })
  }, [])

  // 自分自身のユーザー ID で /profile/[userId] にアクセスした場合は
  // 黒背景マイページに自動リダイレクト。
  // 「自分用は黒背景マイページに統一、白背景プロフィールは他人用のみ」
  // という方針 (CLAUDE 指示) に従う。
  useEffect(() => {
    if (myId && userId && myId === userId) {
      router.replace('/mypage')
    }
  }, [myId, userId, router])

  useEffect(() => {
    if (!userId) return
    async function load() {
      const supabase = createClient()
      // 過去の不具合: village_posts の select で `villages(id, name, icon)` の
      // embed が ambiguity error で失敗し、count は取れるが一覧が空配列で
      // 返るケースがあった (画面に「6件中5件を表示」と出るのに投稿カードが
      // 0 件)。今は embed を使わず、村情報は village_id を集めて別 query で
      // 取得して merge する。これにより relation のあいまいさが原因の取得
      // 失敗が起きない。
      // また、マイページの「投稿」タブが tweets ベースなのに対し、他人
      // プロフィールでは village_posts のみだったため、つぶやき主体の人だと
      // 投稿数が一致しない / 一覧が出ない問題があった。tweets も併せて
      // 取得して統合表示する。
      // 旧: 投稿一覧を limit(5) で取得 → slice(0, 5) で merge 後 5 件に制限。
      // ユーザー指示で「全件表示」に変更したため両 query から limit を撤廃。
      // 投稿数が多くなったら別途 paging を検討するが、まずは全件出すこと
      // 優先 (件数とカード表示の整合性が最重要)。
      // 回答 (qa_answers) は UI から外したため fetch も削除。
      const [
        { data: p },
        villagePostsRes,
        { count: villagePostsCount },
        tweetsRes,
        { count: tweetsCount },
        imagePostsRes,
        { count: followers },
        { count: following },
        { data: trust },
        { data: premSub },
        { data: titlesData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('village_posts')
          .select('id, content, category, created_at, village_id, reaction_count')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase.from('village_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('tweets')
          .select('id, content, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase.from('tweets').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        // 画像投稿: guild_posts に image_url が NULL でないレコード
        supabase.from('guild_posts')
          .select('id, image_url, content, created_at')
          .eq('user_id', userId)
          .not('image_url', 'is', null)
          .order('created_at', { ascending: false }),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('user_trust').select('tier').eq('user_id', userId).maybeSingle(),
        supabase.from('premium_subscriptions').select('id').eq('user_id', userId).eq('status', 'active').gt('expires_at', new Date().toISOString()).maybeSingle(),
        supabase.from('qa_titles').select('*').eq('user_id', userId).order('awarded_at', { ascending: false }),
      ])

      if ((villagePostsRes as any)?.error) {
        console.error('[profile/userId] village_posts fetch error:', (villagePostsRes as any).error)
      }
      if ((tweetsRes as any)?.error) {
        console.error('[profile/userId] tweets fetch error:', (tweetsRes as any).error)
      }

      // 村情報は別 query でまとめて取得して merge
      const villagePostsRaw = ((villagePostsRes as any)?.data ?? []) as any[]
      const villageIds = Array.from(new Set(
        villagePostsRaw.map(p => p.village_id).filter((v: any): v is string => typeof v === 'string' && v.length > 0)
      ))
      let villageMap = new Map<string, { id: string; name: string; icon: string }>()
      if (villageIds.length > 0) {
        const { data: villageRows, error: vErr } = await supabase
          .from('villages')
          .select('id, name, icon')
          .in('id', villageIds)
        if (vErr) console.error('[profile/userId] villages fetch error:', vErr, { villageIds })
        for (const v of (villageRows ?? []) as any[]) {
          villageMap.set(v.id, v)
        }
      }

      const profileVillage: ProfileVillagePost[] = villagePostsRaw.map((p: any) => ({
        id: p.id,
        content: p.content,
        created_at: p.created_at,
        village_id: p.village_id ?? null,
        reaction_count: p.reaction_count ?? 0,
        village: p.village_id ? villageMap.get(p.village_id) ?? null : null,
      }))

      // tweets を TweetCard で表示するため enrichment を取得 (マイページと同パターン)。
      // 投稿者プロフィール = ページ owner の profile (= 上で取得済み p)
      // user_trust もページ owner のものを使う (= 上で取得済み trust)
      // tweet_reactions / tweet_replies は tweet ID で別 query 並列取得し Map merge
      const rawTweets = ((tweetsRes as any)?.data ?? []) as any[]
      let enrichedTweets: TweetData[] = []
      if (rawTweets.length > 0) {
        const tIds = rawTweets.map((t: any) => t.id)
        const [reactEnrich, replyEnrich] = await Promise.all([
          supabase.from('tweet_reactions').select('tweet_id, user_id, reaction').in('tweet_id', tIds),
          supabase.from('tweet_replies').select('id, tweet_id').in('tweet_id', tIds),
        ])
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
        enrichedTweets = rawTweets.map((t: any) => ({
          id: t.id,
          content: t.content,
          created_at: t.created_at,
          user_id: userId as string,
          reply_count: replyByT.get(t.id)?.length ?? 0,
          repost_count: 0,
          repost_of: null,
          profiles: p,
          tweet_reactions: reactByT.get(t.id) ?? [],
          tweet_replies: replyByT.get(t.id) ?? [],
          user_trust: trust?.tier ? { tier: trust.tier } : null,
        }))
      }

      if ((imagePostsRes as any)?.error) {
        console.error('[profile/userId] image_posts fetch error:', (imagePostsRes as any).error)
      }

      setProfile(p)
      setQaTitles(titlesData ?? [])
      // ジャンルマスター称号
      const gt = await getGenreTitles(userId as string)
      setGenreTitles(gt)
      setRichTweets(enrichedTweets)
      setProfileVillagePosts(profileVillage)
      setImagePosts(((imagePostsRes as any)?.data ?? []) as any[])
      // 投稿数 = 村投稿 + つぶやき の合計（マイページの「投稿」表示と整合）
      setPostCount((villagePostsCount ?? 0) + (tweetsCount ?? 0))
      setFollowerCount(followers ?? 0)
      setFollowingCount(following ?? 0)
      if (trust?.tier) setTrustTier(trust.tier)
      setIsPremium(!!premSub)

      // 自分 (= 現在ログイン中の user) がこの profile の村投稿にいいね済みかを
      // 取得する。ハート色 (liked) と toggleLike の即時反映に使用。
      // 未ログインなら likedIds は空のまま (timeline と同じ挙動)。
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const visibleVillagePostIds = profileVillage.map(p => p.id)
      if (currentUser?.id && visibleVillagePostIds.length > 0) {
        const { data: myReactions } = await supabase
          .from('village_reactions')
          .select('post_id')
          .eq('user_id', currentUser.id)
          .in('post_id', visibleVillagePostIds)
        setLikedIds(new Set((myReactions ?? []).map((r: any) => r.post_id)))
      }

      setLoading(false)
    }
    load()
  }, [userId])

  // 2026-05-08 マッキーさん指示「他人マイページの投稿カードでハート押下時に
  // 画面遷移しない、いいね処理だけ実行する」への対応。
  // timeline / mypage と同じ village_reactions テーブルを正として、optimistic
  // update でハートの色と reaction_count を即時反映する。
  function toggleLike(postId: string) {
    if (!myId) return
    const supabase = createClient()
    if (likedIds.has(postId)) {
      supabase.from('village_reactions').delete().eq('post_id', postId).eq('user_id', myId)
      setLikedIds(prev => { const n = new Set(prev); n.delete(postId); return n })
      setProfileVillagePosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: Math.max(0, p.reaction_count - 1) } : p))
    } else {
      supabase.from('village_reactions').upsert({ post_id: postId, user_id: myId })
      setLikedIds(prev => new Set([...prev, postId]))
      setProfileVillagePosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: p.reaction_count + 1 } : p))
    }
  }

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
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080812' }}>
      <span
        className="w-6 h-6 border-2 rounded-full animate-spin"
        style={{ borderColor: '#9D5CFF', borderTopColor: 'transparent' }}
      />
    </div>
  )
  if (!profile) return null

  const flag = getNationalityFlag(profile.nationality || '')
  const isMe = myId === userId

  // 他ユーザープロフィールも YVOICE 全体のダークテーマに統一する。
  // 旧版は bg-birch (cream/off-white) + bg-white カードで他画面と分離していたが、
  // 「上部だけ白く浮く」「下部 nav とつながらない」等の世界観破綻を起こしていた。
  // 採用色: pageBg #080812、card bg rgba(255,255,255,0.04)、accent #9D5CFF。
  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>

      {/* 「下方向スクロール中だけ N 件の投稿」表示。停止 500ms / 上スクロールで非表示 */}
      {showPostCount && postCount > 0 && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center"
          style={{
            background: 'rgba(8,8,18,0.92)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(157,92,255,0.18)',
            paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
            paddingBottom: '12px',
          }}
        >
          <p className="text-sm font-extrabold" style={{ color: '#F0EEFF' }}>
            {postCount}件の投稿
          </p>
        </div>
      )}
      {/*
        旧: 上部 sticky ヘッダー (戻る矢印 + 表示名 + ... メニュー)。
        AppLayout のマイページ固定アバターと位置が被って視覚的にごちゃつく
        ため、ヘッダー全体を削除した。戻り動線は iOS の左端スワイプで代替。
        ... メニューはプロフィールカードのアバター行右端に再配置。
      */}

      {/*
        Profile card.
        AppLayout のマイページ固定アバター (left-4, top:12, 40x40) が画面
        左上に重なるため、本文 (アバター + 名前) を 60px ほど下げる。
        旧: pt-5 (20px) → 新: pt-16 (64px) でマイページボタンとの被りを解消。
      */}
      <div
        className="px-5 pt-16 pb-4"
        style={{
          background: 'linear-gradient(180deg, #0B0B14 0%, #080812 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-start gap-4 mb-4">
          <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" tier={trustTier} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="font-extrabold text-lg leading-tight" style={{ color: '#F0EEFF' }}>{profile.display_name}</p>
              <span className="text-xl">{flag}</span>
              {isVerifiedByExistingSchema(profile) && <VerifiedBadge verified size="md" />}
              {!isMe && myId && (
                <button
                  onClick={() => setShowMenu(true)}
                  className="ml-auto p-1.5 rounded-full transition-colors active:opacity-60"
                  style={{ color: 'rgba(240,238,255,0.45)' }}
                  aria-label="メニュー"
                >
                  <MoreHorizontal size={20} />
                </button>
              )}
            </div>
            {trustTier && (
              <div className="mb-1">
                <TrustBadge tierId={trustTier} size="md" isPremium={isPremium} />
              </div>
            )}
            {profile.bio && (
              <p className="text-sm leading-relaxed mt-1" style={{ color: 'rgba(240,238,255,0.7)' }}>{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <p className="font-extrabold text-lg" style={{ color: '#F0EEFF' }}>{postCount}</p>
            <p className="text-xs" style={{ color: 'rgba(240,238,255,0.45)' }}>投稿</p>
          </div>
          <div className="text-center">
            <p className="font-extrabold text-lg" style={{ color: '#F0EEFF' }}>{followerCount}</p>
            <p className="text-xs" style={{ color: 'rgba(240,238,255,0.45)' }}>フォロワー</p>
          </div>
          <div className="text-center">
            <p className="font-extrabold text-lg" style={{ color: '#F0EEFF' }}>{followingCount}</p>
            <p className="text-xs" style={{ color: 'rgba(240,238,255,0.45)' }}>フォロー中</p>
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
            <button
              onClick={toggleFollow}
              disabled={toggling}
              className="flex-1 py-2.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              style={
                isFollowing
                  ? {
                      background: 'rgba(157,92,255,0.12)',
                      border: '1px solid rgba(168,85,247,0.35)',
                      color: '#EDE9FE',
                    }
                  : {
                      background: 'linear-gradient(135deg, #9D5CFF, #7B3FE4)',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 16px rgba(157,92,255,0.4)',
                    }
              }
            >
              {toggling ? '...' : isFollowing ? '✓ フォロー中' : 'フォローする'}
            </button>
            <button
              onClick={handleDM}
              disabled={dmLoading}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50"
              style={{
                background: 'rgba(157,92,255,0.12)',
                border: '1px solid rgba(168,85,247,0.35)',
                color: '#EDE9FE',
              }}
            >
              {dmLoading
                ? <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(237,233,254,0.7)', borderTopColor: 'transparent' }} />
                : <><MessageSquare size={14} /> DM</>
              }
            </button>
          </div>
        )}
        {isMe && (
          <button
            onClick={() => router.push('/mypage')}
            className="w-full py-2.5 rounded-2xl font-bold text-sm active:opacity-80 transition-all"
            style={{
              background: 'rgba(157,92,255,0.12)',
              border: '1px solid rgba(168,85,247,0.35)',
              color: '#EDE9FE',
            }}
          >
            Edit profile →
          </button>
        )}
      </div>

      {/* ── タブ (投稿 / 動画 / 画像) ──
          回答タブは UI から削除 (DB 上の qa_answers は未削除で残置)。
          動画タブは現状 DB に video_url 等が無いため空状態のみ表示。 */}
      {/* ── タブ (投稿 / 写真 / 動画) ── */}
      <div
        className="flex sticky top-[57px] z-10"
        style={{
          background: '#080812',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {([
          { id: 'posts',  label: '投稿' },
          { id: 'images', label: '写真' },
          { id: 'videos', label: '動画' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1 py-3 text-xs font-bold relative transition-colors"
            style={{ color: activeTab === t.id ? '#F0EEFF' : 'rgba(240,238,255,0.4)' }}
          >
            {t.label}
            {activeTab === t.id && (
              <span
                className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #9D5CFF, #7B3FE4)',
                  boxShadow: '0 0 8px rgba(157,92,255,0.5)',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── コンテンツ ── */}
      <div className="px-4 pt-4 pb-28 space-y-3">

        {/* 投稿タブ (全件表示、limit/slice 撤廃)。
            tweets と村投稿を時系列降順でマージし、
            tweet は TweetCard で / 村投稿は ProfileVillagePostInline で
            視覚的にリッチ統一表示 (マッキーさん指示 2026-05-07)。 */}
        {activeTab === 'posts' && (
          <>
            {richTweets.length === 0 && profileVillagePosts.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-center"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(157,92,255,0.18)',
                }}
              >
                <p className="text-3xl mb-2">✍️</p>
                <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>まだ投稿がありません</p>
              </div>
            ) : (
              (() => {
                type Item =
                  | { kind: 'tweet'; data: TweetData; ts: number }
                  | { kind: 'village'; data: ProfileVillagePost; ts: number }
                const items: Item[] = [
                  ...richTweets.map(t => ({ kind: 'tweet' as const, data: t, ts: new Date(t.created_at).getTime() })),
                  ...profileVillagePosts.map(v => ({ kind: 'village' as const, data: v, ts: new Date(v.created_at).getTime() })),
                ].sort((a, b) => b.ts - a.ts)
                return items.map(item => item.kind === 'tweet' ? (
                  // 2026-05-08 (8 回目): wrapper を共通 PostCardShell に集約。
                  // これにより village 投稿カードと完全に同一の wrapper となり、
                  // 「bivi二条なう」だけ shadow / padding / 二重背景で違って見える
                  // 事故が起きない構造になる。
                  <PostCardShell key={`tweet-${item.data.id}`}>
                    <TweetCard
                      tweet={item.data}
                      myId={myId}
                      onUpdate={() => { /* recentPosts re-fetch なし。reaction 反映は次回ロードで */ }}
                      showBorder={false}
                      canInteract={true}
                      avatarVariant="green"
                    />
                  </PostCardShell>
                ) : (
                  <ProfileVillagePostInline
                    key={`village-${item.data.id}`}
                    post={item.data}
                    profile={profile}
                    trustTier={trustTier}
                    profileUserId={userId as string}
                    liked={likedIds.has(item.data.id)}
                    onToggleLike={toggleLike}
                  />
                ))
              })()
            )}
          </>
        )}

        {/* 動画タブ (現状 DB に video_url 等が無いため空状態のみ。UI 先行で
            将来 video カラム追加時に実装拡張する) */}
        {activeTab === 'videos' && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(157,92,255,0.18)',
            }}
          >
            <p className="text-3xl mb-2">🎬</p>
            <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>まだ動画の投稿がありません</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.35)' }}>動画を投稿するとここに表示されます</p>
          </div>
        )}

        {/* 画像タブ (guild_posts.image_url IS NOT NULL のレコードを表示) */}
        {activeTab === 'images' && (
          <>
            {imagePosts.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-center"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(157,92,255,0.18)',
                }}
              >
                <p className="text-3xl mb-2">🖼️</p>
                <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>まだ写真の投稿がありません</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.35)' }}>写真を投稿するとここに表示されます</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {imagePosts.map(ip => (
                  <div
                    key={ip.id}
                    className="aspect-square overflow-hidden rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(157,92,255,0.18)',
                    }}
                  >
                    <img
                      src={ip.image_url}
                      alt={ip.content ?? ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── アクションシート（通報・ブロック）── */}
      {showMenu && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMenu(false)} />
          <div
            className="relative rounded-t-3xl w-full max-w-md mx-auto overflow-hidden pb-safe"
            style={{
              background: '#0F0820',
              border: '1px solid rgba(157,92,255,0.2)',
              borderBottom: 'none',
            }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(157,92,255,0.3)' }} />
            </div>
            <div className="px-4 pb-6">
              <p
                className="text-xs font-bold uppercase tracking-wider mb-3 px-1"
                style={{ color: 'rgba(240,238,255,0.4)' }}
              >
                {profile.display_name} さんへの操作
              </p>

              {/* 通報 */}
              <button
                onClick={() => { setShowMenu(false); setShowReport(true) }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:opacity-70 transition-opacity text-left"
                style={{ background: 'rgba(251,146,60,0.06)' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(251,146,60,0.12)' }}
                >
                  <Flag size={16} style={{ color: '#fb923c' }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#fb923c' }}>通報する</p>
                  <p className="text-xs" style={{ color: 'rgba(251,146,60,0.6)' }}>不適切なユーザーを報告する</p>
                </div>
              </button>

              {/* ブロック */}
              <button
                onClick={handleBlock}
                disabled={blocking || blockDone}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:opacity-70 transition-opacity text-left mt-1 disabled:opacity-60"
                style={{ background: 'rgba(255,77,144,0.06)' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,77,144,0.12)' }}
                >
                  {blockDone
                    ? <span className="text-base">✅</span>
                    : <Ban size={16} style={{ color: '#FF4D90' }} />}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#FF4D90' }}>
                    {blockDone ? 'ブロックしました' : 'ブロックする'}
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(255,77,144,0.6)' }}>
                    {blockDone ? 'このユーザーは非表示になります' : 'このユーザーを非表示にする'}
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowMenu(false)}
                className="w-full mt-3 py-3.5 rounded-2xl text-sm font-bold active:opacity-70 transition-opacity"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(240,238,255,0.6)' }}
              >
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
