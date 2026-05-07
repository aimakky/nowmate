'use client'

// Vercel Edge cache 対策は middleware.ts で全レスポンスに no-store を
// 注入する方式に統一。'use client' ページでは route segment config が
// build error を起こすため使わない。

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, timeAgo } from '@/lib/utils'
import { Heart, ChevronRight, MessageSquare, MoreHorizontal, Flag, Ban } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import TrustBadge from '@/components/ui/TrustBadge'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import { isVerifiedByExistingSchema } from '@/lib/identity-types'
import Link from 'next/link'
import { getCategoryStyle, getTitleName, TITLE_LEVEL_STYLE } from '@/lib/qa'
import ReportModal from '@/components/features/ReportModal'
import { getGenreTitles, getIndustry } from '@/lib/guild'
import { startDM } from '@/lib/dm'

// 投稿一覧アイテム。「投稿」タブには tweets (つぶやき) のみを表示する仕様
// (2026-05-07 マッキーさん指示)。村投稿 (village_posts) は混在を避けるため
// 投稿一覧から除外し、villages/[id] 側で見せる形に統一。
// kind フィールドは将来別種類の投稿を取り込む余地を残すため維持。
type UnifiedPost = {
  kind: 'tweet'
  id: string
  content: string
  created_at: string
  reaction_count: number
}

// QAAnswerWithQ 型は回答タブ削除に伴い未使用。qa_answers の DB データ
// 自体は残置 (将来の復活余地)。UI から外すだけ。

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [recentPosts, setRecentPosts] = useState<UnifiedPost[]>([])
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
  // 「スクロール中だけ N 件の投稿を表示」: スクロールが発生した瞬間 true、
  // 600ms 何も発生しなければ false に戻す debounce 方式。スクロール停止後
  // にバーが残らない仕様。閾値 (scrollY > 240) 判定は廃止 (停止判定が本旨)。
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onScroll() {
      setIsScrolling(true)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 600)
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
      // 村投稿 (village_posts) は投稿一覧に表示しない仕様 (2026-05-07
      // マッキーさん指示)。マイページと同じく、つぶやき (tweets) のみを
      // 「投稿」タブに表示する。村投稿は villages/[id] 側で見える。
      const [
        { data: p },
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

      if ((tweetsRes as any)?.error) {
        console.error('[profile/userId] tweets fetch error:', (tweetsRes as any).error)
      }

      const tweetUnified: UnifiedPost[] = ((tweetsRes as any)?.data ?? []).map((t: any) => ({
        kind: 'tweet' as const,
        id: t.id,
        content: t.content,
        created_at: t.created_at,
        reaction_count: 0,
      }))

      // 時系列降順 (tweets のみ表示)
      const merged = tweetUnified
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      if ((imagePostsRes as any)?.error) {
        console.error('[profile/userId] image_posts fetch error:', (imagePostsRes as any).error)
      }

      setProfile(p)
      setQaTitles(titlesData ?? [])
      // ジャンルマスター称号
      const gt = await getGenreTitles(userId as string)
      setGenreTitles(gt)
      setRecentPosts(merged)
      setImagePosts(((imagePostsRes as any)?.data ?? []) as any[])
      // 投稿数 = tweets のみ (マイページと整合)
      setPostCount(tweetsCount ?? 0)
      setFollowerCount(followers ?? 0)
      setFollowingCount(following ?? 0)
      if (trust?.tier) setTrustTier(trust.tier)
      setIsPremium(!!premSub)
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

      {/* 「スクロール中だけ N 件の投稿」表示。停止後 600ms で自動消滅 */}
      {isScrolling && postCount > 0 && (
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

        {/* 投稿タブ (全件表示、limit/slice 撤廃) */}
        {activeTab === 'posts' && (
          <>
            {recentPosts.length === 0 ? (
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
              recentPosts.map(post => (
                <div
                  key={`${post.kind}-${post.id}`}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(157,92,255,0.18)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="px-4 pt-3.5 pb-2.5">
                    <p
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      style={{ color: 'rgba(240,238,255,0.85)' }}
                    >
                      {post.content}
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <span className="text-[10px] font-bold" style={{ color: 'rgba(240,238,255,0.4)' }}>つぶやき</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px]" style={{ color: 'rgba(240,238,255,0.4)' }}>{timeAgo(post.created_at)}</span>
                      {post.reaction_count > 0 && (
                        <div className="flex items-center gap-1" style={{ color: '#FB7185' }}>
                          <Heart size={12} fill="#FB7185" strokeWidth={0} />
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
