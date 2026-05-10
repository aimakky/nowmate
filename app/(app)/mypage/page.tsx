'use client'

// Vercel Edge cache 対策は middleware.ts で全レスポンスに no-store を
// 注入する方式に統一。'use client' ページでは route segment config が
// build error ([object Object] revalidate error) を起こすため使わない。

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrustCard } from '@/components/ui/TrustBadge'
import TrustBadge from '@/components/ui/TrustBadge'
// PhoneVerifyModal は TrustVerificationCard 内部で管理される
import { getUserTrust, fetchTierProgress, type TierProgress } from '@/lib/trust'
import { Settings, LogOut, ChevronRight, Users, Copy, Check, Pencil, X, Eye, EyeOff, User, UserPlus } from 'lucide-react'
import PurpleIconButton from '@/components/ui/PurpleIconButton'
import PostActions from '@/components/ui/PostActions'
import { getNationalityFlag, timeAgo } from '@/lib/utils'
import { getUserDisplayName, getAvatarInitial } from '@/lib/user-display'
import Avatar from '@/components/ui/Avatar'
import { isVerifiedByExistingSchema } from '@/lib/identity-types'
// VILLAGE_TYPE_STYLES は旧 参加中タブで使用していたが、タブ削除に伴い未使用化
import { INDUSTRIES } from '@/lib/guild'
import TweetCard, { type TweetData } from '@/components/ui/TweetCard'
import PostCardShell from '@/components/ui/PostCardShell'
import PostCardHeader from '@/components/ui/PostCardHeader'
import DMPrivacySettings from '@/components/features/DMPrivacySettings'
import GuildShieldIcon from '@/components/ui/icons/GuildShieldIcon'
// GuideTab / FeaturesTab はマイページのタブから移動した。
// 現在は app/(app)/safety と app/(app)/guide のスタンドアロンページに配置し、
// 設定画面 (/settings) からリンクで到達する。
import TrustVerificationCard from '@/components/features/TrustVerificationCard'

// 旧: tweets / joined_villages / features / guide の 4 タブ + following / followers 擬似。
// 整理後: profile/[userId] と同じ 投稿 / 動画 / 画像 の 3 タブ。
//  - 参加中 (joined_villages): タブから削除。data fetch は維持 (将来別経路で再利用)
//  - 使い方 (features): 設定画面 (/guide) に移動
//  - 安心 (guide): 設定画面 (/safety) に移動
//  - 動画 (videos): UI 先行で空状態のみ
//  - 画像 (images): guild_posts.image_url IS NOT NULL のレコードを表示
//  - following / followers は統計カードクリックで切り替わる「擬似タブ」として維持
type ProfileTab = 'tweets' | 'replies' | 'images' | 'videos' | 'guilds' | 'likes' | 'following' | 'followers'

// マイページ「投稿」タブ用: 村投稿 (village_posts) を統合表示するための型。
// tweets は TweetCard でリッチに表示し、村投稿は dark theme の simple card で
// 表示する (両者を時系列降順で merge する)。profile/[userId] の UnifiedPost と
// 同じ思想だが、tweet 側は TweetData そのままを使うため村投稿のみ別型化。
type MyVillagePost = {
  id: string
  content: string
  created_at: string
  village_id: string | null
  reaction_count: number
  village: { id: string; name: string; icon: string } | null
  // 2026-05-09 マッキーさん指示「いいね欄で他人の村投稿の投稿者名が自分になる」
  // 真因対応。元投稿者の profile / trust を持たせて、いいねタブから表示する時に
  // 元投稿者として表示できるようにする。自分の村投稿 (mypage の投稿タブ) では
  // 未設定でよい (mypage の自分 profile を fallback で渡す)。
  author_profile?: any
  author_trust?: any
  // 2026-05-09 マッキーさん指示「いいね欄を『いいね押した順 (likes.created_at DESC)』
  // に並び替える」対応。村投稿に対する自分の village_reactions.created_at を保持。
  // DB 列が無ければ undefined → 表示時に投稿の created_at に fallback (fail-open)。
  liked_at?: string | null
}

type FollowUser = {
  id: string
  display_name: string | null
  avatar_url: string | null
  nowjp_id: string | null
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

// マイページ「投稿」タブで使う村投稿の描画。
// 2026-05-07: マッキーさん指示「投稿一覧の全投稿を通常投稿UIで統一」を受け、
// 旧シンプル枠線カード版から TweetCard と同等のリッチ UI に刷新。
// アバター / 投稿者名 / 見習いバッジ / 国旗 / 時刻 / 三点メニュー / +リアクション /
// コメント / リポスト までの可視要素を tweets 側と完全に揃える。
//
// アクションボタンは「視覚的統一」のみ目的で配置。
//   - 村投稿は schema が tweets と異なるため、tweet_reactions / tweet_replies に
//     対する DB 操作はしない。クリックすると villages/[villageId] に遷移して
//     本来のリアクション動線に乗せる (= 機能としても自然)
//   - 三点メニューも同じく villages 詳細遷移に統一
function MyVillagePostInline({
  post, profile, trust, liked, onToggleLike, currentUserId,
}: {
  post: MyVillagePost
  profile: any
  trust: any
  /** 自分がこの投稿にいいね済みか (mypage の likedIds から計算) */
  liked: boolean
  /** ハートボタン押下時に呼ぶ村投稿 like トグル関数 (画面遷移しない) */
  onToggleLike: (postId: string) => void
  /** 現在ログイン中のユーザー ID (= mypage の userId state)。
      profileHref を「自分なら /mypage、他人なら /profile/${id}」と切り替えるために使用。 */
  currentUserId?: string | null
}) {
  const router = useRouter()
  const isVerified = isVerifiedByExistingSchema(profile)
  const flag = getNationalityFlag(profile?.nationality || '')
  const villageHref = post.village_id ? `/villages/${post.village_id}` : '/timeline'
  // 2026-05-09 マッキーさん指示「いいね欄のプロフィール押してもその人のマイページに飛ばない」
  // 真因対応。MyVillagePostInline はマイページの投稿タブ (= 必ず自分の投稿) と
  // いいねタブ (= 他人の投稿もあり) の両方で使われるため、profileHref を動的に算出する。
  // - author_profile.id が存在し、かつ currentUserId と一致しなければ → 他人の profile へ
  // - それ以外 → 自分の /mypage
  const authorId = post.author_profile?.id ?? null
  const profileHref =
    authorId && authorId !== currentUserId
      ? `/profile/${authorId}`
      : '/mypage'

  // 2026-05-08 マッキーさん指示: timeline の PostCard (app/(app)/timeline/page.tsx
  // 行 360-480) と完全同一の視覚構造に統一。
  // - 外側 wrapper: rounded-2xl + 紫グロー border + box shadow
  // - 内側 padding: px-4 pt-3.5 pb-3
  // - Avatar: 40x40 緑グラデ + 緑リング (Avatar コンポーネントから差し替え)
  // - Action 行: 緑 borderTop 区切り + Heart / MessageCircle / Share2 (PostCard と完全同一)
  //   2026-05-08 (4 回目): 旧 Repeat2 → Share2 に変更し timeline PostCard と完全統一。
  //   shareToX も PostCard と同等のロジックで X 共有を起動。
  // 動作面 (Heart / Comment クリック → 村詳細) は mypage 固有のため維持。
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
          村遷移) は mypage 固有のため onMenuClick で委譲。 */}
      <PostCardHeader
        profileHref={profileHref}
        displayName={getUserDisplayName(profile)}
        avatarUrl={profile?.avatar_url}
        avatarVariant="green"
        isVerified={isVerified}
        trustTier={trust?.tier ?? null}
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
          実行する」を受けて、Heart の onHeart は親 (MyPage) から渡される
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
  // 自分の村投稿 (profile/[userId] では villageUnified として表示している分)。
  // 旧マイページは tweets のみ表示していたため「プロフィールには出るのに
  // マイページに投稿が出ない」差分の原因となっていた。
  const [villagePosts,   setVillagePosts]   = useState<MyVillagePost[]>([])
  // 自分がいいねした village_posts の id 集合。timeline と同じ village_reactions
  // テーブルを正として、ハート押下で upsert/delete し画面遷移は起こさない。
  // 2026-05-08 マッキーさん指示「マイページ・他人マイページの投稿カードで
  // ハート押下時に別ページへ遷移しないようにする」への対応。
  const [likedIds,       setLikedIds]       = useState<Set<string>>(new Set())
  // 2026-05-08 マッキーさん指示 (YVOICE5): 6 タブ化
  // (投稿 / 返信 / 写真 / 動画 / ギルド / いいね)。
  // 返信タブ: tweet_replies で本人が他の投稿に書いた返信
  // いいねタブ: 自分がハート押した tweets + village_posts (本人だけ閲覧可、プライバシー配慮)
  // ギルドタブ: 既存 joinedVillages / hostedVillages を再利用
  const [myReplies, setMyReplies] = useState<Array<{ id: string; tweet_id: string; content: string; created_at: string }>>([])
  const [likedTweets, setLikedTweets] = useState<TweetData[]>([])
  const [likedVillagePosts, setLikedVillagePosts] = useState<MyVillagePost[]>([])
  // 返信 / いいねは初回ロード時に一括取得 (タブ切替で空白を避けるため)。
  // タブ未訪問でも UI 完全描画したいので、loaded フラグは持たない。
  const [tweetLoading,   setTweetLoading]   = useState(false)
  const [userId,         setUserId]         = useState<string | null>(null)
  const [activeTab,      setActiveTab]      = useState<ProfileTab>('tweets')
  const [loading,        setLoading]        = useState(true)
  // 電話認証モーダルの状態は TrustVerificationCard が内部で持つため不要
  const [showCompose,    setShowCompose]    = useState(false)
  const [idCopied,       setIdCopied]       = useState(false)
  const [showIndustry,   setShowIndustry]   = useState(true)
  const [savingIndustry, setSavingIndustry] = useState(false)
  // 「下方向にスクロール中だけ N 件の投稿バーを表示」(2026-05-07 仕様変更):
  //   - 下スクロール → showPostCount = true
  //   - 上スクロール → 即 false
  //   - 停止後 500ms → false
  //   - 初期表示 → false
  // ±2px の閾値で iOS Safari のバウンド / 微動を無視する。
  const [showPostCount, setShowPostCount] = useState(false)
  const lastScrollYRef = useRef(0)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // フォロー中 / フォロワー一覧（lazy load）。null = 未取得、[] = 0件、配列 = 取得済
  const [followingList,  setFollowingList]  = useState<FollowUser[] | null>(null)
  const [followersList,  setFollowersList]  = useState<FollowUser[] | null>(null)
  const [followListLoading, setFollowListLoading] = useState(false)

  // 上部固定バーは createPortal で document.body 直下に描画する
  // (mypage wrapper の overflow-x-hidden / AppLayout sticky の
  // backdrop-filter による iOS Safari の containing block バグ回避)。
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
      // 2026-05-09 マッキーさん指示「投稿数の表示はスクロールをやめた瞬間に消えて欲しい」
      // 旧 500ms → 新 100ms に短縮 (体感「即消える」)。
      // scroll イベント間隔 (~16ms) より十分長いのでスクロール中は表示維持、
      // 停止すると 100ms で消える。
      scrollTimeoutRef.current = setTimeout(() => {
        setShowPostCount(false)
      }, 100)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

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
        { count: tc },
        hostedRes,
        joinedRes,
        followsRes,
        followersRes,
        imageRes,
        tweetRes,
        villagePostRowsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        getUserTrust(user.id),
        fetchTierProgress(user.id),
        supabase.from('village_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('village_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        // tweets count (投稿数 = 村投稿 + つぶやき の合計に整合させるため追加)
        supabase.from('tweets').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
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
        // 村投稿の行データ (profile/[userId] と同じパターンで取得)。
        // 旧マイページは count しか取らず行データを取らなかったため、
        // 投稿タブに村投稿が出ていなかった。embed なしで純粋取得。
        supabase
          .from('village_posts')
          .select('id, content, category, created_at, village_id, reaction_count')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      if (!p) { router.push('/onboarding'); return }
      setProfile(p)
      setShowIndustry(p.show_industry !== false)
      setTrust(trustData)
      setTierProgress(tierProgressData)
      setVillageCount(vc ?? 0)
      // 投稿数 = 村投稿 + つぶやきの合計 (profile/[userId] と整合)
      setPostCount((pc ?? 0) + (tc ?? 0))
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

      // 村投稿の行データ + 村情報マージ。embed を使わず別 query で取得し、
      // 村情報も別 query でまとめて取得 (profile/[userId] と同じパターン)。
      const rawMyVillagePosts = ((villagePostRowsRes as any)?.data ?? []) as any[]
      const myVillageIdsForPosts = Array.from(new Set(
        rawMyVillagePosts
          .map((p: any) => p.village_id)
          .filter((v: any): v is string => typeof v === 'string' && v.length > 0)
      ))
      const myVillagePostMap = new Map<string, { id: string; name: string; icon: string }>()
      if (myVillageIdsForPosts.length > 0) {
        const { data: vRows } = await supabase
          .from('villages')
          .select('id, name, icon')
          .in('id', myVillageIdsForPosts)
        for (const v of (vRows ?? []) as any[]) {
          myVillagePostMap.set(v.id, v)
        }
      }
      const myUnifiedVillagePosts: MyVillagePost[] = rawMyVillagePosts.map((p: any) => ({
        id: p.id,
        content: p.content,
        created_at: p.created_at,
        village_id: p.village_id ?? null,
        reaction_count: p.reaction_count ?? 0,
        village: p.village_id ? myVillagePostMap.get(p.village_id) ?? null : null,
      }))
      setVillagePosts(myUnifiedVillagePosts)

      // 自分がいいねした village_posts を初期取得 (timeline と同じ実装)。
      // village_reactions.user_id = 自分 の post_id 群を Set 化し、
      // ハートボタンの liked / 押下時 toggleLike で使用。
      const myVillagePostIds = myUnifiedVillagePosts.map(p => p.id)
      if (myVillagePostIds.length > 0) {
        const { data: myReactions } = await supabase
          .from('village_reactions')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', myVillagePostIds)
        setLikedIds(new Set((myReactions ?? []).map((r: any) => r.post_id)))
      }

      // ── 2026-05-08 YVOICE5 6 タブ化: 返信 / いいね の追加データ取得 ──
      // 返信タブ用: 本人が他の投稿に書いた返信 (tweet_replies)
      const { data: repliesRows } = await supabase
        .from('tweet_replies')
        .select('id, tweet_id, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setMyReplies((repliesRows ?? []) as any[])

      // いいねタブ用: 自分がリアクションした tweets を取得 + enrich
      // PR #41: .limit(50) を撤廃 / PR #44: reaction フィルタを撤廃 (旧 6 種互換)
      // PR #52: tweet_id → liked_at Map で「いいね押した日時 DESC」に並び替え
      const { data: heartReactions } = await supabase
        .from('tweet_reactions')
        .select('tweet_id, reaction, created_at')
        .eq('user_id', user.id)
      const heartTweetIds = ((heartReactions ?? []) as any[]).map(r => r.tweet_id).filter(Boolean)
      const ltLikedAtMap = new Map<string, string>()
      for (const r of ((heartReactions ?? []) as any[])) {
        if (r.tweet_id && r.created_at) ltLikedAtMap.set(r.tweet_id, r.created_at)
      }
      if (heartTweetIds.length > 0) {
        const { data: ltRows } = await supabase
          .from('tweets')
          .select('*')
          .in('id', heartTweetIds)
          .order('created_at', { ascending: false })
        const ltRaw = (ltRows ?? []) as any[]
        if (ltRaw.length > 0) {
          // 投稿者プロフィール / リアクション / 返信 / 信頼スコアを別 query で並列取得し merge
          const ltIds = ltRaw.map((t: any) => t.id)
          const ltAuthorIds = Array.from(new Set(ltRaw.map((t: any) => t.user_id).filter(Boolean)))
          const [authProfRes, ltReactRes, ltReplyRes, authTrustRes] = await Promise.all([
            supabase.from('profiles')
              .select('id, display_name, nationality, avatar_url, age_verified, age_verification_status')
              .in('id', ltAuthorIds),
            supabase.from('tweet_reactions').select('tweet_id, user_id, reaction').in('tweet_id', ltIds),
            supabase.from('tweet_replies').select('id, tweet_id').in('tweet_id', ltIds),
            supabase.from('user_trust').select('user_id, tier').in('user_id', ltAuthorIds),
          ])
          const profMap = new Map<string, any>()
          for (const p of ((authProfRes as any).data ?? [])) profMap.set(p.id, p)
          const reactByT = new Map<string, any[]>()
          for (const r of ((ltReactRes as any).data ?? [])) {
            if (!reactByT.has(r.tweet_id)) reactByT.set(r.tweet_id, [])
            reactByT.get(r.tweet_id)!.push({ user_id: r.user_id, reaction: r.reaction })
          }
          const replyByT = new Map<string, any[]>()
          for (const r of ((ltReplyRes as any).data ?? [])) {
            if (!replyByT.has(r.tweet_id)) replyByT.set(r.tweet_id, [])
            replyByT.get(r.tweet_id)!.push({ id: r.id })
          }
          const trustMap = new Map<string, string>()
          for (const t of ((authTrustRes as any).data ?? [])) trustMap.set(t.user_id, t.tier)
          for (const t of ltRaw) {
            t.profiles = profMap.get(t.user_id) ?? null
            t.tweet_reactions = reactByT.get(t.id) ?? []
            t.tweet_replies = replyByT.get(t.id) ?? []
            t.user_trust = trustMap.has(t.user_id) ? { tier: trustMap.get(t.user_id) } : null
            // 2026-05-09: いいね欄ソート用に liked_at を merge
            t.liked_at = ltLikedAtMap.get(t.id) ?? null
          }
          setLikedTweets(ltRaw as TweetData[])
        }
      }
      // 2026-05-10 マッキーさん指示「自分の投稿に自分でハートを押しても、
      // マイページの『いいね』欄に表示されない」事象の防御策。
      // 自分が反応した tweet_id (heartTweetIds) の中に、上記 .in() SELECT で
      // 取得できなかった own tweet があれば、既取得済みの own tweets
      // (rawMyTweets) から補完して likedTweets に追加する。
      // 既に setLikedTweets が呼ばれていなくても (ltRaw が空でも) 動作する
      // よう、heartTweetIds.length > 0 の外側で実行する。
      // 2026-05-10 (2 回目): rawMyTweets の補完だけでは不足する場合があった
      // ため、Supabase に own user_id 限定で「いいねした自分の tweet」を直接
      // 再取得する明示的フォールバックを追加。
      if (heartTweetIds.length > 0) {
        const { data: ownLikedTweetsRows } = await supabase
          .from('tweets')
          .select('*')
          .eq('user_id', user.id)
          .in('id', heartTweetIds)
        const ownRows = (ownLikedTweetsRows ?? []) as any[]
        console.log('[likes-debug:initial:tweets]', {
          heartTweetIds,
          ownLikedTweetsRowsCount: ownRows.length,
          rawMyTweetsCount: rawMyTweets.length,
        })
        if (ownRows.length > 0) {
          // 自分の投稿なので profile / trust は p / trustData (= 自分のもの)
          const myProf = p
          const myTrust = trustData ? { tier: trustData.tier ?? null } : null
          for (const t of ownRows) {
            t.profiles = myProf
            t.tweet_reactions = []  // 自分のいいねが含まれている前提だが空でも liked=true は別管理
            t.tweet_replies = []
            t.user_trust = myTrust
            t.liked_at = ltLikedAtMap.get(t.id) ?? null
          }
          setLikedTweets(prev => {
            const existingIds = new Set(prev.map(t => t.id))
            const toAdd = ownRows.filter((t: any) => !existingIds.has(t.id))
            return [...prev, ...toAdd] as TweetData[]
          })
        }
      }

      // いいねタブ用: 自分が反応した village_posts 全範囲版
      // PR #41: .limit(50) を撤廃 / PR #50: 元投稿者 profile を保持 / PR #52: liked_at で並び替え
      const { data: allMyVillageReacts } = await supabase
        .from('village_reactions')
        .select('post_id, created_at')
        .eq('user_id', user.id)
      const likedVillageIds = ((allMyVillageReacts ?? []) as any[]).map(r => r.post_id).filter(Boolean)
      const lvLikedAtMap = new Map<string, string>()
      for (const r of ((allMyVillageReacts ?? []) as any[])) {
        if (r.post_id && r.created_at) lvLikedAtMap.set(r.post_id, r.created_at)
      }
      if (likedVillageIds.length > 0) {
        const { data: lvRows } = await supabase
          .from('village_posts')
          .select('id, content, category, created_at, village_id, reaction_count, user_id')
          .in('id', likedVillageIds)
          .order('created_at', { ascending: false })
        const lvRaw = (lvRows ?? []) as any[]
        const lvVillageIds = Array.from(new Set(lvRaw.map((p: any) => p.village_id).filter(Boolean)))
        const lvAuthorIds = Array.from(new Set(lvRaw.map((p: any) => p.user_id).filter(Boolean)))
        const [vRowsRes, vAuthorProfRes, vAuthorTrustRes] = await Promise.all([
          lvVillageIds.length > 0
            ? supabase.from('villages').select('id, name, icon').in('id', lvVillageIds)
            : Promise.resolve({ data: [] }),
          lvAuthorIds.length > 0
            ? supabase.from('profiles')
                .select('id, display_name, nationality, avatar_url, age_verified, age_verification_status')
                .in('id', lvAuthorIds)
            : Promise.resolve({ data: [] }),
          lvAuthorIds.length > 0
            ? supabase.from('user_trust').select('user_id, tier').in('user_id', lvAuthorIds)
            : Promise.resolve({ data: [] }),
        ])
        const lvVMap = new Map<string, any>()
        for (const v of ((vRowsRes as any).data ?? [])) lvVMap.set(v.id, v)
        const lvAuthorProfMap = new Map<string, any>()
        for (const p of ((vAuthorProfRes as any).data ?? [])) lvAuthorProfMap.set(p.id, p)
        const lvAuthorTrustMap = new Map<string, string>()
        for (const t of ((vAuthorTrustRes as any).data ?? [])) lvAuthorTrustMap.set(t.user_id, t.tier)
        setLikedVillagePosts(lvRaw.map((p: any) => ({
          id: p.id,
          content: p.content,
          created_at: p.created_at,
          village_id: p.village_id ?? null,
          reaction_count: p.reaction_count ?? 0,
          village: p.village_id ? lvVMap.get(p.village_id) ?? null : null,
          author_profile: p.user_id ? lvAuthorProfMap.get(p.user_id) ?? null : null,
          author_trust: p.user_id && lvAuthorTrustMap.has(p.user_id) ? { tier: lvAuthorTrustMap.get(p.user_id) } : null,
          liked_at: lvLikedAtMap.get(p.id) ?? null,
        })))
        // 全範囲 likedIds に上書き (mypage 内 toggleLike が他人の村投稿でも動作するため)
        setLikedIds(prev => {
          const n = new Set(prev)
          for (const id of likedVillageIds) n.add(id)
          return n
        })
      }
      // 2026-05-10 マッキーさん指示「自分の村投稿に自分でハートを押しても、
      // いいね欄に表示されない」事象の防御策。
      // 自分が反応した post_id (likedVillageIds) の中に、上記 .in() SELECT で
      // 取得できなかった own village_post があれば、既取得済みの own
      // village_posts (myUnifiedVillagePosts) から補完して likedVillagePosts
      // に追加する。
      // 2026-05-10 (2 回目): 自分の村投稿が反応欄に出ない問題への防御。
      // Supabase に own user_id 限定で「いいねした自分の村投稿」を直接再取得。
      if (likedVillageIds.length > 0) {
        const { data: ownLikedVRows } = await supabase
          .from('village_posts')
          .select('id, content, category, created_at, village_id, reaction_count, user_id')
          .eq('user_id', user.id)
          .in('id', likedVillageIds)
        const ownVRows = (ownLikedVRows ?? []) as any[]
        console.log('[likes-debug:initial:village]', {
          likedVillageIds,
          ownLikedVRowsCount: ownVRows.length,
          myUnifiedVillagePostsCount: myUnifiedVillagePosts.length,
        })
        if (ownVRows.length > 0) {
          // 自分の村投稿なので author_profile / author_trust は自分
          const ownAuthorProfile = p
          const ownAuthorTrust = trustData ? { tier: trustData.tier ?? null } : null
          // village 情報も既取得 lvVMap から取れるはず (上の通常 SELECT で
          // 取得していれば)。取得失敗時は null にする
          setLikedVillagePosts(prev => {
            const existingIds = new Set(prev.map(vp => vp.id))
            const toAdd = ownVRows
              .filter(vp => !existingIds.has(vp.id))
              .map((vp: any) => ({
                id: vp.id,
                content: vp.content,
                created_at: vp.created_at,
                village_id: vp.village_id ?? null,
                reaction_count: vp.reaction_count ?? 0,
                village: null,  // village 情報は省略 (lvVMap が undefined の可能性)
                author_profile: ownAuthorProfile,
                author_trust: ownAuthorTrust,
                liked_at: lvLikedAtMap.get(vp.id) ?? null,
              }))
            return [...prev, ...toAdd]
          })
        }
      }

      setLoading(false)
    }
    load()
  }, [router])

  // 2026-05-09 マッキーさん指示「ハートを押した投稿が必ずいいね欄に表示される
  // ように」への対応。真因: load() の useEffect は [router] 依存で初回 mount の
  // 1 回しか実行されない。マッキーさんがミヤさんプロフィールで新しいハート押下
  // → mypage に戻る (component cache で残っている) → load() 再実行されない →
  // likedTweets / likedVillagePosts が古いまま。
  //
  // 修正: いいねタブを開いた瞬間 (activeTab === 'likes' になった時) に
  // tweet_reactions / village_reactions を再取得して likedTweets /
  // likedVillagePosts を最新化する独立 useEffect を追加。
  // 確認後、DEBUG ログは除去予定 (CLAUDE.md「最短ライフサイクル」)。
  useEffect(() => {
    if (activeTab !== 'likes' || !userId) return
    let cancelled = false
    async function reloadLikes() {
      const supabase = createClient()
      // tweet_reactions 全件 (PR #44 で reaction フィルタ撤廃済)
      const { data: heartReactions } = await supabase
        .from('tweet_reactions')
        .select('tweet_id, reaction, created_at')
        .eq('user_id', userId)
      if (cancelled) return
      const heartTweetIds = ((heartReactions ?? []) as any[]).map(r => r.tweet_id).filter(Boolean)
      // PR #52: いいね欄ソート用 tweet_id → liked_at Map
      const ltLikedAtMap = new Map<string, string>()
      for (const r of ((heartReactions ?? []) as any[])) {
        if (r.tweet_id && r.created_at) ltLikedAtMap.set(r.tweet_id, r.created_at)
      }
      if (heartTweetIds.length > 0) {
        const { data: ltRows } = await supabase
          .from('tweets').select('*').in('id', heartTweetIds).order('created_at', { ascending: false })
        if (cancelled) return
        const ltRaw = (ltRows ?? []) as any[]
        if (ltRaw.length > 0) {
          const ltIds = ltRaw.map((t: any) => t.id)
          const ltAuthorIds = Array.from(new Set(ltRaw.map((t: any) => t.user_id).filter(Boolean)))
          const [authProfRes, ltReactRes, ltReplyRes, authTrustRes] = await Promise.all([
            supabase.from('profiles')
              .select('id, display_name, nationality, avatar_url, age_verified, age_verification_status')
              .in('id', ltAuthorIds),
            supabase.from('tweet_reactions').select('tweet_id, user_id, reaction').in('tweet_id', ltIds),
            supabase.from('tweet_replies').select('id, tweet_id').in('tweet_id', ltIds),
            supabase.from('user_trust').select('user_id, tier').in('user_id', ltAuthorIds),
          ])
          if (cancelled) return
          const profMap = new Map<string, any>()
          for (const p of ((authProfRes as any).data ?? [])) profMap.set(p.id, p)
          const reactByT = new Map<string, any[]>()
          for (const r of ((ltReactRes as any).data ?? [])) {
            if (!reactByT.has(r.tweet_id)) reactByT.set(r.tweet_id, [])
            reactByT.get(r.tweet_id)!.push({ user_id: r.user_id, reaction: r.reaction })
          }
          const replyByT = new Map<string, any[]>()
          for (const r of ((ltReplyRes as any).data ?? [])) {
            if (!replyByT.has(r.tweet_id)) replyByT.set(r.tweet_id, [])
            replyByT.get(r.tweet_id)!.push({ id: r.id })
          }
          const trustMap = new Map<string, string>()
          for (const t of ((authTrustRes as any).data ?? [])) trustMap.set(t.user_id, t.tier)
          for (const t of ltRaw) {
            t.profiles = profMap.get(t.user_id) ?? null
            t.tweet_reactions = reactByT.get(t.id) ?? []
            t.tweet_replies = replyByT.get(t.id) ?? []
            t.user_trust = trustMap.has(t.user_id) ? { tier: trustMap.get(t.user_id) } : null
            // 2026-05-09: いいね欄ソート用に liked_at を merge
            t.liked_at = ltLikedAtMap.get(t.id) ?? null
          }
          setLikedTweets(ltRaw as TweetData[])
        } else {
          setLikedTweets([])
        }
      } else {
        setLikedTweets([])
      }
      // 2026-05-10 マッキーさん指示「自分の投稿に自分でハートを押しても、
      // いいね欄に表示されない」事象の防御策 (reloadLikes 版)。
      // 2026-05-10 (2 回目): tweets state は reloadLikes の closure で stale な
      // 可能性があるため、Supabase に own user_id 限定で直接再取得する明示的
      // フォールバックに変更。
      if (heartTweetIds.length > 0) {
        const { data: ownLikedTweetsRows } = await supabase
          .from('tweets')
          .select('*')
          .eq('user_id', userId)
          .in('id', heartTweetIds)
        if (cancelled) return
        const ownRows = (ownLikedTweetsRows ?? []) as any[]
        console.log('[likes-debug:reload:tweets]', {
          heartTweetIds,
          ownLikedTweetsRowsCount: ownRows.length,
          tweetsStateCount: tweets.length,
        })
        if (ownRows.length > 0) {
          // 自分の投稿なので profile / trust は profile / trust state (= 自分のもの)
          const myProf = profile
          const myTrust = trust ? { tier: trust.tier ?? null } : null
          for (const t of ownRows) {
            t.profiles = myProf
            t.tweet_reactions = []
            t.tweet_replies = []
            t.user_trust = myTrust
            t.liked_at = ltLikedAtMap.get(t.id) ?? null
          }
          setLikedTweets(prev => {
            const existingIds = new Set(prev.map(t => t.id))
            const toAdd = ownRows.filter((t: any) => !existingIds.has(t.id))
            return [...prev, ...toAdd] as TweetData[]
          })
        }
      }
      // village_reactions 全件
      const { data: allMyVillageReacts } = await supabase
        .from('village_reactions').select('post_id, created_at').eq('user_id', userId)
      if (cancelled) return
      const likedVillageIds = ((allMyVillageReacts ?? []) as any[]).map(r => r.post_id).filter(Boolean)
      // 2026-05-09: いいね欄ソート用 post_id → liked_at Map (reloadLikes 用)
      const lvLikedAtMap = new Map<string, string>()
      for (const r of ((allMyVillageReacts ?? []) as any[])) {
        if (r.post_id && r.created_at) lvLikedAtMap.set(r.post_id, r.created_at)
      }
      if (likedVillageIds.length > 0) {
        // 2026-05-09 マッキーさん指示「いいね欄で他人の村投稿の投稿者名が自分に
        // なる」真因対応: select で user_id も取得し、元投稿者の profiles / user_trust
        // を別 query で merge して MyVillagePostInline に渡せるようにする。
        const { data: lvRows } = await supabase
          .from('village_posts')
          .select('id, content, category, created_at, village_id, reaction_count, user_id')
          .in('id', likedVillageIds)
          .order('created_at', { ascending: false })
        if (cancelled) return
        const lvRaw = (lvRows ?? []) as any[]
        const lvVillageIds = Array.from(new Set(lvRaw.map((p: any) => p.village_id).filter(Boolean)))
        const lvAuthorIds = Array.from(new Set(lvRaw.map((p: any) => p.user_id).filter(Boolean)))
        const [vRowsRes, vAuthorProfRes, vAuthorTrustRes] = await Promise.all([
          lvVillageIds.length > 0
            ? supabase.from('villages').select('id, name, icon').in('id', lvVillageIds)
            : Promise.resolve({ data: [] }),
          lvAuthorIds.length > 0
            ? supabase.from('profiles')
                .select('id, display_name, nationality, avatar_url, age_verified, age_verification_status')
                .in('id', lvAuthorIds)
            : Promise.resolve({ data: [] }),
          lvAuthorIds.length > 0
            ? supabase.from('user_trust').select('user_id, tier').in('user_id', lvAuthorIds)
            : Promise.resolve({ data: [] }),
        ])
        if (cancelled) return
        const lvVMap = new Map<string, any>()
        for (const v of ((vRowsRes as any).data ?? [])) lvVMap.set(v.id, v)
        const lvAuthorProfMap = new Map<string, any>()
        for (const p of ((vAuthorProfRes as any).data ?? [])) lvAuthorProfMap.set(p.id, p)
        const lvAuthorTrustMap = new Map<string, string>()
        for (const t of ((vAuthorTrustRes as any).data ?? [])) lvAuthorTrustMap.set(t.user_id, t.tier)
        setLikedVillagePosts(lvRaw.map((p: any) => ({
          id: p.id,
          content: p.content,
          created_at: p.created_at,
          village_id: p.village_id ?? null,
          reaction_count: p.reaction_count ?? 0,
          village: p.village_id ? lvVMap.get(p.village_id) ?? null : null,
          // 元投稿者の profile / trust を保持 (いいねタブで他人の村投稿を表示する時に使う)
          author_profile: p.user_id ? lvAuthorProfMap.get(p.user_id) ?? null : null,
          author_trust: p.user_id && lvAuthorTrustMap.has(p.user_id) ? { tier: lvAuthorTrustMap.get(p.user_id) } : null,
          liked_at: lvLikedAtMap.get(p.id) ?? null,
        })))
        setLikedIds(prev => {
          const n = new Set(prev)
          for (const id of likedVillageIds) n.add(id)
          return n
        })
      } else {
        setLikedVillagePosts([])
      }
      // 2026-05-10 マッキーさん指示「自分の村投稿に自分でハートを押しても、
      // いいね欄に表示されない」事象の防御策 (reloadLikes 版)。
      // 2026-05-10 (2 回目): villagePosts state は stale の可能性があるため、
      // Supabase 直接フォールバックに変更。
      if (likedVillageIds.length > 0) {
        const { data: ownLikedVRows } = await supabase
          .from('village_posts')
          .select('id, content, category, created_at, village_id, reaction_count, user_id')
          .eq('user_id', userId)
          .in('id', likedVillageIds)
        if (cancelled) return
        const ownVRows = (ownLikedVRows ?? []) as any[]
        console.log('[likes-debug:reload:village]', {
          likedVillageIds,
          ownLikedVRowsCount: ownVRows.length,
          villagePostsStateCount: villagePosts.length,
        })
        if (ownVRows.length > 0) {
          const ownAuthorProfile = profile
          const ownAuthorTrust = trust ? { tier: trust.tier ?? null } : null
          setLikedVillagePosts(prev => {
            const existingIds = new Set(prev.map(vp => vp.id))
            const toAdd = ownVRows
              .filter(vp => !existingIds.has(vp.id))
              .map((vp: any) => ({
                id: vp.id,
                content: vp.content,
                created_at: vp.created_at,
                village_id: vp.village_id ?? null,
                reaction_count: vp.reaction_count ?? 0,
                village: null,
                author_profile: ownAuthorProfile,
                author_trust: ownAuthorTrust,
                liked_at: lvLikedAtMap.get(vp.id) ?? null,
              }))
            return [...prev, ...toAdd]
          })
        }
      }
    }
    reloadLikes()
    return () => { cancelled = true }
  }, [activeTab, userId])

  // PR #31: ハート押下時に画面遷移せず、いいね処理だけ実行。
  // PR #46: async + await + error 検出 + onConflict 明示で silent failure 解消。
  async function toggleLike(postId: string) {
    if (!userId) return
    const supabase = createClient()
    if (likedIds.has(postId)) {
      const r = await supabase.from('village_reactions').delete().eq('post_id', postId).eq('user_id', userId)
      if (r.error) {
        console.error('[toggleLike] delete error:', r.error)
        return
      }
      setLikedIds(prev => { const n = new Set(prev); n.delete(postId); return n })
      setVillagePosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: Math.max(0, p.reaction_count - 1) } : p))
    } else {
      const r = await supabase.from('village_reactions').upsert(
        { post_id: postId, user_id: userId },
        { onConflict: 'post_id,user_id' }
      )
      if (r.error) {
        console.error('[toggleLike] upsert error:', r.error)
        return
      }
      setLikedIds(prev => new Set([...prev, postId]))
      setVillagePosts(prev => prev.map(p => p.id === postId ? { ...p, reaction_count: p.reaction_count + 1 } : p))
    }
  }

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
      .select('id, display_name, avatar_url, nowjp_id')
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
      nowjp_id: null,
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

      {/* X 風スクロール時固定バー: 「N 件の投稿」を表示。
          /profile/[userId] と同じ表示にする。
          createPortal で document.body 直下に描画する理由:
            - mypage wrapper の overflow-x-hidden が iOS Safari で fixed 子孫を
              壊すバグの回避
            - AppLayout sticky wrapper の backdrop-filter:blur が祖先連鎖に
              存在することで起きる containing block 破壊の回避
          /profile/[userId] は wrapper に overflow-x-hidden が無いため Portal
          なしで動作するが、mypage は他の都合で overflow 制御が必要なため
          Portal で確実に viewport 基準に固定する。 */}
      {showPostCount && postCount > 0 && typeof document !== 'undefined' && createPortal(
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
        </div>,
        document.body
      )}

      {/* シルバーグロー（右上） */}
      <div className="absolute top-0 right-0 w-80 h-80 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle at 80% 15%, rgba(234,242,255,0.18) 0%, rgba(184,199,217,0.1) 40%, transparent 70%)' }} />

      {/* ── ヘッダー行 ──
          2026-05-07 マッキーさん指示: 左右を入れ替え + layout.tsx 上部の
          紫グロー丸ボタンと同デザインに統一 (PurpleIconButton 共通化)。
          - 左 = 設定 (Settings → /settings)
          - 右 = フレンドを追加 (UserPlus → /users)
          配置を /timeline 等の layout 上部 (右=友達追加) と揃えた。 */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-0">
        <PurpleIconButton href="/settings" icon={Settings} ariaLabel="設定" />
        <PurpleIconButton href="/users" icon={UserPlus} ariaLabel="フレンドを追加" />
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
          {profile.nowjp_id && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile.nowjp_id!)
                setIdCopied(true)
                setTimeout(() => setIdCopied(false), 2000)
              }}
              className="flex items-center gap-1 mt-0.5 active:opacity-60 transition-opacity"
            >
              <span className="text-xs font-mono" style={{ color: 'rgba(240,238,255,0.3)' }}>#{profile.nowjp_id}</span>
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
          ユーザー指示で「投稿」列を撤去 (X 風スクロール件数バーで表示するため)。
          フォロー中 / フォロワー の 2 列のみ。 */}
      <div className="relative z-10 mx-4 mb-3 rounded-2xl overflow-hidden"
        style={{ background: 'rgba(234,242,255,0.04)', border: '1px solid rgba(234,242,255,0.14)', boxShadow: '0 0 24px rgba(234,242,255,0.06)' }}>
        <div className="flex">
          {([
            { tab: 'following', count: followingCount, label: 'フォロー中' },
            { tab: 'followers', count: followersCount, label: 'フォロワー' },
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

      {/* ── タブ (投稿 / 返信 / 写真 / 動画 / ギルド / いいね) ──
          2026-05-08 YVOICE5: 6 タブ化。スマホ画面で flex-1 等分だと窮屈なため、
          横スクロール (overflow-x-auto + whitespace-nowrap) に変更。
          いいねタブはマイページのみ (他人プロフィールでは表示しない、プライバシー配慮)。 */}
      <div className="relative z-10 mx-4 mb-1 rounded-2xl sticky top-2"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.18)', boxShadow: '0 0 16px rgba(157,92,255,0.08)' }}>
        <div
          className="flex overflow-x-auto whitespace-nowrap"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {([
            { id: 'tweets',  label: '投稿' },
            { id: 'replies', label: '返信' },
            { id: 'images',  label: '写真' },
            { id: 'videos',  label: '動画' },
            { id: 'guilds',  label: 'ギルド' },
            { id: 'likes',   label: 'いいね' },
          ] as { id: ProfileTab; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              // 2026-05-09 マッキーさん指示「タブ切り替えで高さ・余白がズレないよう統一」
              // profile/[userId] のタブと完全に同じ DOM 構造に統一:
              //   flex items-center justify-center gap-1 py-3 (= 12px)
              // (旧: py-3.5 で profile と 4px ズレていた)
              className="flex-1 min-w-[68px] flex items-center justify-center gap-1 py-3 text-xs font-bold transition-colors relative"
              style={{ color: activeTab === tab.id ? '#F0EEFF' : 'rgba(240,238,255,0.4)' }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #9D5CFF, #7B3FE4)', boxShadow: '0 0 8px rgba(157,92,255,0.5)' }}
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
            ) : tweets.length === 0 && villagePosts.length === 0 ? (
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
              // 投稿一覧 wrapper の余白を profile/[userId] と完全一致させる。
              // px-4: 左右 16px (カードを画面端から内側に inset)
              // pt-4: タブ直下から最初のカードまで 16px の余白
              // space-y-3: カード同士の縦間隔 12px
              // これで profile/[userId] の `<div className="px-4 pt-4 pb-28 space-y-3">`
              // と同じ視覚密度になる (2026-05-07 マッキーさん指示)。
              <div className="px-4 pt-4 space-y-3" style={{ background: 'transparent' }}>
                {/* tweets と村投稿を時系列降順でマージ。
                    tweet は TweetCard でリッチに、村投稿は MyVillagePostInline
                    (TweetCard 同等のリッチ UI) で表示。 */}
                {(() => {
                  type Item =
                    | { kind: 'tweet'; data: TweetData; ts: number }
                    | { kind: 'village'; data: MyVillagePost; ts: number }
                  const items: Item[] = [
                    ...tweets.map(t => ({
                      kind: 'tweet' as const,
                      data: t,
                      ts: new Date(t.created_at).getTime(),
                    })),
                    ...villagePosts.map(v => ({
                      kind: 'village' as const,
                      data: v,
                      ts: new Date(v.created_at).getTime(),
                    })),
                  ].sort((a, b) => b.ts - a.ts)

                  return items.map(item => item.kind === 'tweet' ? (
                    // 2026-05-08 マッキーさん指示: timeline と完全同一の表示形式に統一。
                    // timeline (app/(app)/timeline/page.tsx 行 1431-1441) と同じ
                    // 紫グロー丸角 wrapper + avatarVariant="green" を採用。
                    // 2026-05-08 (8 回目): wrapper を共通 PostCardShell に集約。
                    <PostCardShell key={`tweet-${item.data.id}`}>
                      <TweetCard
                        tweet={item.data}
                        myId={userId}
                        onUpdate={() => userId && loadTweets(userId)}
                        showBorder={false}
                        canInteract={true}
                        avatarVariant="green"
                      />
                    </PostCardShell>
                  ) : (
                    <MyVillagePostInline
                      key={`village-${item.data.id}`}
                      post={item.data}
                      profile={profile}
                      trust={trust}
                      liked={likedIds.has(item.data.id)}
                      onToggleLike={toggleLike}
                      currentUserId={userId}
                    />
                  ))
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── 返信タブ (2026-05-08 YVOICE5) ── */}
        {activeTab === 'replies' && (
          <div className="px-4 pt-4 space-y-3">
            {myReplies.length === 0 ? (
              <div className="rounded-2xl p-8 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.18)' }}>
                <p className="text-3xl mb-2">💬</p>
                <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>まだ返信はありません</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.35)' }}>投稿に返信するとここに履歴が並びます</p>
              </div>
            ) : (
              myReplies.map(r => (
                <Link
                  key={r.id}
                  href={`/tweet/${r.tweet_id}`}
                  className="block rounded-2xl px-4 py-3.5 active:opacity-80 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.18)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: '#9D5CFF' }}>返信</span>
                    <span className="text-xs" style={{ color: 'rgba(240,238,255,0.4)' }}>· {timeAgo(r.created_at)}</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'rgba(240,238,255,0.85)' }}>
                    {r.content}
                  </p>
                  <p className="text-[11px] mt-2" style={{ color: 'rgba(240,238,255,0.35)' }}>
                    元の投稿を見る →
                  </p>
                </Link>
              ))
            )}
          </div>
        )}

        {/* ── ギルドタブ (2026-05-08 YVOICE5) ── */}
        {activeTab === 'guilds' && (
          <div className="px-4 pt-4">
            {(() => {
              const allGuilds = [...hostedVillages, ...joinedVillages].filter(Boolean)
              // 重複除去 (host と member を兼ねている場合)
              const uniqueGuilds: any[] = []
              const seenIds = new Set<string>()
              for (const g of allGuilds) {
                if (!g || !g.id || seenIds.has(g.id)) continue
                seenIds.add(g.id)
                uniqueGuilds.push(g)
              }
              if (uniqueGuilds.length === 0) {
                return (
                  <div className="rounded-2xl p-8 text-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.18)' }}>
                    {/* 2026-05-10: 旧 🛡️ 絵文字 (iOS で赤系に見える) を青ベース
                        の GuildShieldIcon SVG に統一 (profile/[userId] と同じ)。 */}
                    <div className="flex justify-center mb-2">
                      <GuildShieldIcon size={36} active />
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>まだ参加中のギルドはありません</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.35)' }}>気になるギルドに参加してみよう</p>
                    <Link
                      href="/guild"
                      className="inline-block mt-5 px-5 py-2.5 rounded-full text-sm font-bold text-white active:scale-95 transition-all"
                      style={{ background: 'linear-gradient(135deg, #9D5CFF 0%, #7B3FE4 100%)', boxShadow: '0 4px 20px rgba(157,92,255,0.3)' }}
                    >
                      ギルドを探す
                    </Link>
                  </div>
                )
              }
              return (
                <div className="space-y-2">
                  {uniqueGuilds.map((g: any) => (
                    <Link
                      key={g.id}
                      href={`/guilds/${g.id}`}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 active:opacity-80 transition-opacity"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.18)' }}
                    >
                      <span className="text-2xl flex-shrink-0">{g.icon ?? '🛡️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold truncate" style={{ color: '#F0EEFF' }}>{g.name}</p>
                        {(g.member_count != null) && (
                          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(240,238,255,0.4)' }}>
                            メンバー {g.member_count}人
                          </p>
                        )}
                      </div>
                      <ChevronRight size={14} style={{ color: 'rgba(240,238,255,0.3)' }} className="flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── いいねタブ (2026-05-08 YVOICE5) ──
            プライバシー配慮: 本人のマイページでのみ表示。
            自分がハートを押した tweets + village_posts を時系列降順で表示。 */}
        {activeTab === 'likes' && (
          <div className="px-4 pt-4 space-y-3">
            {likedTweets.length === 0 && likedVillagePosts.length === 0 ? (
              <div className="rounded-2xl p-8 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.18)' }}>
                <p className="text-3xl mb-2">❤️</p>
                <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>まだいいねした投稿はありません</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.35)' }}>気になる投稿にハートを押すとここに溜まります</p>
              </div>
            ) : (
              (() => {
                type LItem =
                  | { kind: 'tweet'; data: TweetData; ts: number }
                  | { kind: 'village'; data: MyVillagePost; ts: number }
                // 2026-05-09 マッキーさん指示「いいね欄をいいね押した順 (likes.created_at DESC) に」
                // ts は liked_at (= tweet_reactions.created_at / village_reactions.created_at) を優先。
                // DB 列が無くて undefined の場合は 投稿の created_at に fallback (fail-open)。
                // CLAUDE.md「投稿者情報の混同防止」準拠: liked_at は「いいね押した日時」、
                // 投稿の created_at は「元投稿者が投稿した日時」。両者を絶対に混同しない。
                const items: LItem[] = [
                  ...likedTweets.map(t => {
                    const likedAt = (t as any).liked_at as string | null | undefined
                    return { kind: 'tweet' as const, data: t, ts: new Date(likedAt ?? t.created_at).getTime() }
                  }),
                  ...likedVillagePosts.map(v => {
                    const likedAt = v.liked_at
                    return { kind: 'village' as const, data: v, ts: new Date(likedAt ?? v.created_at).getTime() }
                  }),
                ].sort((a, b) => b.ts - a.ts)
                return items.map(item => item.kind === 'tweet' ? (
                  <PostCardShell key={`liked-tweet-${item.data.id}`}>
                    <TweetCard
                      tweet={item.data}
                      myId={userId}
                      onUpdate={() => userId && loadTweets(userId)}
                      showBorder={false}
                      canInteract={true}
                      avatarVariant="green"
                    />
                  </PostCardShell>
                ) : (
                  <MyVillagePostInline
                    key={`liked-village-${item.data.id}`}
                    post={item.data}
                    /* 2026-05-09: いいねタブでは元投稿者の profile / trust を渡す。
                       無ければ自分 profile fallback (自分の村投稿に自分でいいねした場合の保険) */
                    profile={item.data.author_profile ?? profile}
                    trust={item.data.author_trust ?? trust}
                    liked={likedIds.has(item.data.id)}
                    onToggleLike={toggleLike}
                    currentUserId={userId}
                  />
                ))
              })()
            )}
          </div>
        )}

        {/* 動画タブ (現状 DB に video_url 等が無いため空状態のみ。
            UI 先行で profile/[userId] と同等。将来 video カラム追加時に拡張) */}
        {/* 2026-05-09 マッキーさん指示「写真/動画タブの空状態カード位置を返信タブと
            完全に揃える」対応。返信タブ (L1364) の wrapper className `px-4 pt-4 space-y-3`
            と完全一致させ、空状態カードの DOM 構造・style 記法も返信と単一行スタイル属性で揃える。 */}
        {activeTab === 'videos' && (
          <div className="px-4 pt-4 space-y-3">
            <div className="rounded-2xl p-8 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.18)' }}>
              <p className="text-3xl mb-2">🎬</p>
              <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>まだ動画の投稿がありません</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.35)' }}>動画を投稿するとここに表示されます</p>
            </div>
          </div>
        )}

        {/* 画像タブ (guild_posts.image_url IS NOT NULL のレコードを 3 列グリッドで表示)。
            profile/[userId] と同等のレイアウト。imagePosts は初期 load で取得済。 */}
        {/* 2026-05-09 マッキーさん指示「写真/動画タブの空状態カード位置を返信タブと
            完全に揃える」対応。返信タブ (L1364) の wrapper className `px-4 pt-4 space-y-3`
            と完全一致させ、空状態カードの DOM 構造・style 記法も返信と単一行スタイル属性で揃える。 */}
        {activeTab === 'images' && (
          <div className="px-4 pt-4 space-y-3">
            {imagePosts.length === 0 ? (
              <div className="rounded-2xl p-8 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.18)' }}>
                <p className="text-3xl mb-2">🖼️</p>
                <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>まだ写真の投稿がありません</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(240,238,255,0.35)' }}>写真を投稿するとここに表示されます</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {imagePosts.map((ip: any) => (
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
          </div>
        )}

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
                      {getUserDisplayName(u)}
                    </p>
                    {u.nowjp_id && (
                      <p className="text-[11px] font-mono truncate" style={{ color: 'rgba(240,238,255,0.3)' }}>
                        #{u.nowjp_id}
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


