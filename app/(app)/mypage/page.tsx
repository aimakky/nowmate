'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrustCard, TrustHowToCard } from '@/components/ui/TrustBadge'
import PhoneVerifyModal from '@/components/features/PhoneVerifyModal'
import { getUserTrust, fetchTierProgress, type TierProgress } from '@/lib/trust'
import { getTitleName, TITLE_LEVEL_STYLE } from '@/lib/qa'
import { Settings, LogOut, ChevronRight, Crown, Users } from 'lucide-react'
import { VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'
import MissionsCard from '@/components/features/MissionsCard'
import GrowthPortfolio from '@/components/features/GrowthPortfolio'
import ThirtyDayJourney from '@/components/features/ThirtyDayJourney'
import DailyCheckIn from '@/components/features/DailyCheckIn'

export default function MyPage() {
  const router = useRouter()

  const [profile,        setProfile]        = useState<any>(null)
  const [trust,          setTrust]          = useState<any>(null)
  const [villageCount,   setVillageCount]   = useState(0)
  const [postCount,      setPostCount]      = useState(0)
  const [tierProgress,   setTierProgress]   = useState<TierProgress | null>(null)
  const [qaTitles,       setQaTitles]       = useState<any[]>([])
  const [hostedVillages, setHostedVillages] = useState<any[]>([])
  const [joinedVillages, setJoinedVillages] = useState<any[]>([])
  const [myBottles,      setMyBottles]      = useState<any[]>([])
  const [followingPosts, setFollowingPosts] = useState<any[]>([])
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingUsers, setFollowingUsers] = useState<any[]>([])
  const [followerUsers,  setFollowerUsers]  = useState<any[]>([])
  const [followingIds,   setFollowingIds]   = useState<Set<string>>(new Set())
  const [followTab,      setFollowTab]      = useState<'following' | 'followers'>('following')
  const [loading,        setLoading]        = useState(true)
  const [showPhoneVerify,setShowPhoneVerify]= useState(false)
  const [idCopied,       setIdCopied]       = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [
        { data: p },
        trustData,
        tierProgressData,
        { count: vc },
        { count: pc },
        qaTitlesRes,
        hostedRes,
        joinedRes,
        bottlesRes,
        followsRes,
        followersRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        getUserTrust(user.id),
        fetchTierProgress(user.id),
        supabase.from('village_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('village_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('qa_titles').select('*').eq('user_id', user.id).order('awarded_at', { ascending: false }),
        supabase.from('village_members')
          .select('villages(id, name, icon, type, member_count, post_count_7d, description)')
          .eq('user_id', user.id).eq('role', 'host'),
        supabase.from('village_members')
          .select('villages(id, name, icon, type, member_count, post_count_7d)')
          .eq('user_id', user.id).eq('role', 'member')
          .order('joined_at', { ascending: false }).limit(6),
        supabase.from('drift_bottles')
          .select(`id, message, status, created_at,
            recipient_village:recipient_village_id(name, icon)`)
          .eq('sender_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('user_follows').select('following_id, profiles:following_id(id,display_name,avatar_url,bio)').eq('follower_id', user.id),
        supabase.from('user_follows').select('follower_id, profiles:follower_id(id,display_name,avatar_url,bio)').eq('following_id', user.id),
      ])

      if (!p) { router.push('/onboarding'); return }
      setProfile(p)
      setTrust(trustData)
      setTierProgress(tierProgressData)
      setVillageCount(vc ?? 0)
      setPostCount(pc ?? 0)
      setQaTitles((qaTitlesRes as any)?.data ?? [])
      setHostedVillages(((hostedRes as any)?.data ?? []).map((r: any) => r.villages).filter(Boolean))
      setJoinedVillages(((joinedRes as any)?.data ?? []).map((r: any) => r.villages).filter(Boolean))
      setMyBottles((bottlesRes as any)?.data ?? [])

      // フォロー
      const followingRaw: any[] = (followsRes as any)?.data ?? []
      const followingIdArr: string[] = followingRaw.map((r: any) => r.following_id)
      const followingIdSet = new Set(followingIdArr)
      setFollowingIds(followingIdSet)
      setFollowingCount(followingIdArr.length)

      const fUsers = followingRaw.map((r: any) => {
        const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
        return p
      }).filter(Boolean)
      setFollowingUsers(fUsers)

      const followerRaw: any[] = (followersRes as any)?.data ?? []
      setFollowersCount(followerRaw.length)
      const fwUsers = followerRaw.map((r: any) => {
        const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
        return p
      }).filter(Boolean)
      setFollowerUsers(fwUsers)

      // フォロー中ユーザーの最新投稿
      if (followingIdArr.length > 0) {
        const { data: fPosts } = await supabase
          .from('village_posts')
          .select(`id, content, created_at, user_id,
            profiles:user_id(display_name, avatar_url),
            villages:village_id(id, name, icon)`)
          .in('user_id', followingIdArr)
          .order('created_at', { ascending: false })
          .limit(10)
        setFollowingPosts(fPosts ?? [])
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function handleUnfollow(targetId: string) {
    const supabase = createClient()
    await supabase.from('user_follows').delete()
      .eq('follower_id', profile.id).eq('following_id', targetId)
    setFollowingUsers(prev => prev.filter(u => u.id !== targetId))
    setFollowingIds(prev => { const n = new Set(prev); n.delete(targetId); return n })
    setFollowingCount(prev => prev - 1)
  }

  async function handleFollowBack(targetId: string) {
    const supabase = createClient()
    await supabase.from('user_follows').insert({ follower_id: profile.id, following_id: targetId })
    const { data: p } = await supabase.from('profiles')
      .select('id,display_name,avatar_url,bio').eq('id', targetId).single()
    if (p) setFollowingUsers(prev => [...prev, p])
    setFollowingIds(prev => new Set([...prev, targetId]))
    setFollowingCount(prev => prev + 1)
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/')
  }

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-birch">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">

      {/* ── Profile Hero ── */}
      <div
        className="relative overflow-hidden px-5 pt-14 pb-6"
        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}
      >
        {/* stars */}
        <div className="absolute inset-0 opacity-25"
          style={{ backgroundImage: `radial-gradient(1px 1px at 25% 35%, white, transparent), radial-gradient(1px 1px at 70% 20%, white, transparent), radial-gradient(1.5px 1.5px at 85% 60%, white, transparent), radial-gradient(1px 1px at 40% 75%, white, transparent)` }}
        />

        {/* Edit button */}
        <Link
          href="/settings"
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
        >
          <Settings size={12} /> 編集
        </Link>

        {/* Avatar */}
        <div className="flex items-end gap-4">
          <div
            className="w-18 h-18 rounded-3xl border-2 border-white/30 flex items-center justify-center text-4xl bg-white/10 shadow-lg flex-shrink-0"
            style={{ width: 72, height: 72 }}
          >
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-3xl" />
              : <span>🙂</span>
            }
          </div>
          <div className="pb-1 flex-1 min-w-0">
            <h2 className="font-extrabold text-white text-xl leading-tight truncate">
              {profile.display_name}
            </h2>
            {profile.bio && (
              <p className="text-white/60 text-xs mt-0.5 line-clamp-2 leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Activity stats */}
        <div
          className="mt-4 grid grid-cols-4 gap-1.5 rounded-2xl px-3 py-3"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
        >
          {[
            { value: villageCount,   label: '参加村' },
            { value: postCount,      label: '投稿' },
            { value: followingCount, label: '学んでる' },
            { value: followersCount, label: '学ばれてる' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-extrabold text-white text-base leading-none">{s.value}</p>
              <p className="text-white/50 text-[9px] mt-0.5 font-medium leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* 人助けカウント */}
        {(profile.helped_count ?? 0) > 0 && (
          <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <span className="text-2xl">🤝</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-emerald-300">
                {profile.helped_count}人を助けた
              </p>
              <p className="text-[10px] text-emerald-400/60 mt-0.5">漂流瓶の質問に回答した回数</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-black text-emerald-300">{profile.helped_count}</p>
              <p className="text-[9px] text-emerald-400/40">人助け</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-32 space-y-4">

        {/* ── デイリーチェックイン ── */}
        <DailyCheckIn userId={profile.id} />

        {/* ── 30日の村旅 ── */}
        {profile.created_at && (
          <ThirtyDayJourney
            tierProgress={tierProgress}
            postCount={postCount}
            joinedAt={profile.created_at}
          />
        )}

        {/* ── 7日間ミッション ── */}
        <MissionsCard userId={profile.id} />

        {/* ── フォロー・フォロワー ── */}
        {(followingCount > 0 || followersCount > 0) && (
          <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
            {/* タブ */}
            <div className="flex">
              {([
                { id: 'following', label: 'フォロー中', count: followingCount },
                { id: 'followers', label: 'フォロワー', count: followersCount },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFollowTab(tab.id)}
                  className="flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition-colors relative"
                  style={{ color: followTab === tab.id ? '#1c1917' : '#a8a29e' }}
                >
                  <span>{tab.label}</span>
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold"
                    style={{
                      background: followTab === tab.id ? '#1c1917' : '#f5f5f4',
                      color:      followTab === tab.id ? '#fff'    : '#a8a29e',
                    }}
                  >
                    {tab.count}
                  </span>
                  {followTab === tab.id && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-stone-900" />
                  )}
                </button>
              ))}
            </div>

            {/* リスト */}
            <div className="divide-y divide-stone-50">
              {followTab === 'following' ? (
                followingUsers.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-2xl mb-2">👥</p>
                    <p className="text-xs text-stone-400">まだ誰もフォローしていません</p>
                  </div>
                ) : followingUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-lg overflow-hidden flex-shrink-0 border border-stone-100">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span>🙂</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-900 truncate">{u.display_name}</p>
                      {u.bio && <p className="text-[10px] text-stone-400 truncate mt-0.5">{u.bio}</p>}
                    </div>
                    <button
                      onClick={() => handleUnfollow(u.id)}
                      className="flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-stone-200 text-stone-500 active:scale-95 transition-all"
                    >
                      フォロー中
                    </button>
                  </div>
                ))
              ) : (
                followerUsers.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-2xl mb-2">🌱</p>
                    <p className="text-xs text-stone-400">まだフォロワーがいません</p>
                  </div>
                ) : followerUsers.map((u: any) => {
                  const isFollowing = followingIds.has(u.id)
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-lg overflow-hidden flex-shrink-0 border border-stone-100">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span>🙂</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate">{u.display_name}</p>
                        {u.bio && <p className="text-[10px] text-stone-400 truncate mt-0.5">{u.bio}</p>}
                      </div>
                      {isFollowing ? (
                        <span className="flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-xl bg-stone-100 text-stone-400">
                          相互
                        </span>
                      ) : (
                        <button
                          onClick={() => handleFollowBack(u.id)}
                          className="flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-xl bg-stone-900 text-white active:scale-95 transition-all"
                        >
                          フォローする
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ── 成長ポートフォリオ ── */}
        <GrowthPortfolio
          postCount={postCount}
          tweetCount={0}
          followingCount={followingCount}
          villageCount={villageCount}
          displayName={profile?.display_name}
        />

        {/* ── Trust Card ── */}
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

        {/* ── 電話未認証バナー ── */}
        {trust && !trust.phone_verified && (
          <button
            onClick={() => setShowPhoneVerify(true)}
            className="w-full bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left active:scale-[0.99] transition-all"
          >
            <span className="text-2xl">📱</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-brand-700">電話番号を認証する</p>
              <p className="text-xs text-brand-500 mt-0.5">投稿・通話が解放されます · +30pt</p>
            </div>
            <ChevronRight size={16} className="text-brand-300" />
          </button>
        )}

        {/* ── 信頼の積み方 ── */}
        {trust && <TrustHowToCard />}

        {/* ── 私の村 ── */}
        {(hostedVillages.length > 0 || joinedVillages.length > 0) && (
          <div className="space-y-3">

            {/* 村長の村 */}
            {hostedVillages.length > 0 && (
              <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}
                >
                  <div className="flex items-center gap-2">
                    <Crown size={14} className="text-yellow-300" />
                    <p className="text-xs font-bold text-white">村長の村</p>
                  </div>
                  <p className="text-[10px] text-white/50">{hostedVillages.length}村</p>
                </div>
                <div className="divide-y divide-stone-50">
                  {hostedVillages.map((v: any) => {
                    const vs = VILLAGE_TYPE_STYLES[v.type] ?? VILLAGE_TYPE_STYLES['雑談']
                    return (
                      <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                        {/* Village gradient thumb */}
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
                          style={{ background: vs.gradient }}
                        >
                          {v.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-stone-900 truncate">{v.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-0.5 text-[10px] text-stone-400">
                              <Users size={9} /> {v.member_count}人
                            </span>
                            <span className="text-[10px] text-stone-400">
                              今週{v.post_count_7d}件
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Link
                            href={`/villages/${v.id}`}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-white active:scale-95 transition-all"
                            style={{ background: vs.accent }}
                          >
                            村を見る
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 参加中の村 */}
            {joinedVillages.length > 0 && (
              <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-stone-50 flex items-center justify-between">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">参加中の村</p>
                  <Link href="/villages" className="text-[10px] text-indigo-500 font-bold">すべて見る →</Link>
                </div>
                <div className="divide-y divide-stone-50">
                  {joinedVillages.map((v: any) => {
                    const vs = VILLAGE_TYPE_STYLES[v.type] ?? VILLAGE_TYPE_STYLES['雑談']
                    return (
                      <Link
                        key={v.id}
                        href={`/villages/${v.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors active:bg-stone-50"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: vs.gradient }}
                        >
                          {v.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{v.name}</p>
                          <p className="text-[10px] text-stone-400">
                            {v.member_count}人 · 今週{v.post_count_7d}件
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-stone-300 flex-shrink-0" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 私の漂流瓶 ── */}
        {myBottles.length > 0 && (
          <div className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: 'linear-gradient(135deg,#0c1445 0%,#0a2540 100%)', border: '1px solid rgba(100,140,255,0.2)' }}>
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/8">
              <div className="flex items-center gap-2">
                <span className="text-base">🍶</span>
                <p className="text-xs font-bold text-blue-200">私の漂流瓶</p>
              </div>
              <p className="text-[10px] text-blue-400/50">{myBottles.length}本</p>
            </div>
            <div className="divide-y divide-white/5">
              {myBottles.map((b: any) => {
                const rv = Array.isArray(b.recipient_village) ? b.recipient_village[0] : b.recipient_village
                const statusInfo =
                  b.status === 'replied'   ? { icon: '💌', label: '返事あり',  color: '#34d399' } :
                  b.status === 'delivered' ? { icon: '📬', label: '届いた',    color: '#60a5fa' } :
                                            { icon: '🌊', label: '漂流中',    color: '#94a3b8' }
                return (
                  <div key={b.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-lg flex-shrink-0">{statusInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/75 line-clamp-1">{b.message}</p>
                      <p className="text-[10px] text-blue-400/50 mt-0.5">
                        {rv ? `${rv.icon} ${rv.name}へ` : '送信先不明'}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: `${statusInfo.color}20`, color: statusInfo.color, border: `1px solid ${statusInfo.color}30` }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── フォロー中の投稿 ── */}
        {followingPosts.length > 0 && (
          <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">👥</span>
                <p className="text-xs font-bold text-stone-700">学んでいる人たちの最新の考え</p>
              </div>
              <p className="text-[10px] text-stone-400">{followingCount}人から学んでいる</p>
            </div>
            <div className="divide-y divide-stone-50">
              {followingPosts.map((fp: any) => {
                const prof = Array.isArray(fp.profiles) ? fp.profiles[0] : fp.profiles
                const vil  = Array.isArray(fp.villages)  ? fp.villages[0]  : fp.villages
                const ago  = (() => {
                  const diff = Date.now() - new Date(fp.created_at).getTime()
                  const m = Math.floor(diff / 60000)
                  if (m < 60)  return `${m}分前`
                  const h = Math.floor(m / 60)
                  if (h < 24)  return `${h}時間前`
                  return `${Math.floor(h / 24)}日前`
                })()
                return (
                  <Link
                    key={fp.id}
                    href={`/villages/${vil?.id ?? ''}`}
                    className="flex gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                      {prof?.avatar_url
                        ? <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" />
                        : '🙂'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-stone-800 truncate">{prof?.display_name ?? '…'}</span>
                        {vil && (
                          <span className="text-[10px] text-stone-400 flex-shrink-0">
                            in {vil.icon}{vil.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">{fp.content}</p>
                      <p className="text-[10px] text-stone-300 mt-1">{ago}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Q&A 称号 ── */}
        {qaTitles.length > 0 && (
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">獲得した称号</p>
            <div className="flex flex-wrap gap-2">
              {qaTitles.map((t: any) => {
                const lvStyle = TITLE_LEVEL_STYLE[t.level]
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold"
                    style={{ background: '#fafaf9', borderColor: '#e7e5e4', color: '#44403c' }}
                  >
                    <span>{lvStyle?.badge}</span>
                    <span>{getTitleName(t.category, t.level)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── VILLIA ID ── */}
        {profile.VILLIA_id && (
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">My ID</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5">
                <span className="font-mono font-bold text-stone-800 text-base tracking-widest">#{profile.VILLIA_id}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(profile.VILLIA_id!)
                  setIdCopied(true)
                  setTimeout(() => setIdCopied(false), 2000)
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  idCopied ? 'bg-emerald-500 text-white' : 'bg-stone-900 text-white'
                }`}
              >
                {idCopied ? '✓ コピー済み' : 'コピー'}
              </button>
            </div>
          </div>
        )}

        {/* ── Menu ── */}
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
              className="flex items-center justify-between px-4 py-3.5 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{item.icon}</span>
                <span className="text-sm text-stone-700 font-medium">{item.label}</span>
              </div>
              <ChevronRight size={14} className="text-stone-300" />
            </Link>
          ))}
        </div>

        {/* ── Logout ── */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl border border-red-100 bg-red-50 text-red-500 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
        >
          <LogOut size={15} /> ログアウト
        </button>
      </div>

      {/* ── Modals ── */}
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
