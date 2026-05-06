'use client'

import { useState, useEffect } from 'react'
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

// 統合投稿アイテム。village_posts (村への投稿) と tweets (つぶやき) を
// 同じカードで表示するための共通形。kind で由来を区別する。
type UnifiedPost =
  | {
      kind: 'village'
      id: string
      content: string
      created_at: string
      village_id: string | null
      reaction_count: number
      village: { id: string; name: string; icon: string } | null
    }
  | {
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

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setMyId(user.id)
    })
  }, [])

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

      const villageUnified: UnifiedPost[] = villagePostsRaw.map((p: any) => ({
        kind: 'village' as const,
        id: p.id,
        content: p.content,
        created_at: p.created_at,
        village_id: p.village_id ?? null,
        reaction_count: p.reaction_count ?? 0,
        village: p.village_id ? villageMap.get(p.village_id) ?? null : null,
      }))
      const tweetUnified: UnifiedPost[] = ((tweetsRes as any)?.data ?? []).map((t: any) => ({
        kind: 'tweet' as const,
        id: t.id,
        content: t.content,
        created_at: t.created_at,
        reaction_count: 0,
      }))

      // 時系列降順でマージし、全件表示 (旧: slice(0, 5) → 全件)
      const merged = [...villageUnified, ...tweetUnified]
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
      // 投稿数 = 村投稿 + つぶやき の合計（マイページの「投稿」表示と整合）
      setPostCount((villagePostsCount ?? 0) + (tweetsCount ?? 0))
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
    <div className="min-h-screen flex items-center justify-center bg-birch">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!profile) return null

  const flag = getNationalityFlag(profile.nationality || '')
  const isMe = myId === userId

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">
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
      <div className="bg-white px-5 pt-16 pb-4 border-b border-stone-100">
        <div className="flex items-start gap-4 mb-4">
          <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" tier={trustTier} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="font-extrabold text-stone-900 text-lg leading-tight">{profile.display_name}</p>
              <span className="text-xl">{flag}</span>
              {isVerifiedByExistingSchema(profile) && <VerifiedBadge verified size="md" />}
              {!isMe && myId && (
                <button
                  onClick={() => setShowMenu(true)}
                  className="ml-auto p-1.5 rounded-full text-stone-400 hover:bg-stone-100 active:bg-stone-200 transition-colors"
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

      {/* ── タブ (投稿 / 動画 / 画像) ──
          回答タブは UI から削除 (DB 上の qa_answers は未削除で残置)。
          動画タブは現状 DB に video_url 等が無いため空状態のみ表示。 */}
      <div className="flex border-b border-stone-100 bg-white sticky top-[57px] z-10">
        {([
          { id: 'posts',  label: '✍️ 投稿' },
          { id: 'videos', label: '🎬 動画' },
          { id: 'images', label: '🖼️ 画像' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1 py-3 text-xs font-bold relative transition-colors"
            style={{ color: activeTab === t.id ? '#1c1917' : '#a8a29e' }}
          >
            {t.label}
            {activeTab === t.id && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-stone-900" />
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
              <div className="bg-white border border-stone-100 rounded-2xl p-8 text-center">
                <p className="text-3xl mb-2">✍️</p>
                <p className="text-sm font-bold text-stone-500">まだ投稿がありません</p>
              </div>
            ) : (
              recentPosts.map(post => (
                <div key={`${post.kind}-${post.id}`} className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 pt-3.5 pb-2.5">
                    <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-stone-50">
                    {post.kind === 'village' && post.village ? (
                      <Link href={`/villages/${post.village_id}`}
                        className="flex items-center gap-1.5 active:opacity-70 transition-opacity">
                        <span className="text-sm">{post.village.icon}</span>
                        <span className="text-[11px] font-bold text-stone-500 truncate max-w-[160px]">
                          {post.village.name}
                        </span>
                        <ChevronRight size={11} className="text-stone-300 flex-shrink-0" />
                      </Link>
                    ) : post.kind === 'tweet' ? (
                      <span className="text-[10px] font-bold text-stone-400">つぶやき</span>
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

        {/* 動画タブ (現状 DB に video_url 等が無いため空状態のみ。UI 先行で
            将来 video カラム追加時に実装拡張する) */}
        {activeTab === 'videos' && (
          <div className="bg-white border border-stone-100 rounded-2xl p-8 text-center">
            <p className="text-3xl mb-2">🎬</p>
            <p className="text-sm font-bold text-stone-500">まだ動画投稿がありません</p>
            <p className="text-xs text-stone-400 mt-1">動画を投稿するとここに表示されます</p>
          </div>
        )}

        {/* 画像タブ (guild_posts.image_url IS NOT NULL のレコードを表示) */}
        {activeTab === 'images' && (
          <>
            {imagePosts.length === 0 ? (
              <div className="bg-white border border-stone-100 rounded-2xl p-8 text-center">
                <p className="text-3xl mb-2">🖼️</p>
                <p className="text-sm font-bold text-stone-500">まだ画像投稿がありません</p>
                <p className="text-xs text-stone-400 mt-1">画像を投稿するとここに表示されます</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {imagePosts.map(ip => (
                  <div key={ip.id} className="aspect-square overflow-hidden rounded-xl border border-stone-100 bg-stone-50">
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
