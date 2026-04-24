'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrustCard, TrustHowToCard } from '@/components/ui/TrustBadge'
import PhoneVerifyModal from '@/components/features/PhoneVerifyModal'
import { getUserTrust } from '@/lib/trust'
import { getTitleName, TITLE_LEVEL_STYLE } from '@/lib/qa'
import { Settings, LogOut, ChevronRight } from 'lucide-react'

export default function MyPage() {
  const router = useRouter()

  const [profile,        setProfile]        = useState<any>(null)
  const [trust,          setTrust]          = useState<any>(null)
  const [villageCount,   setVillageCount]   = useState(0)
  const [postCount,      setPostCount]      = useState(0)
  const [tweetCount,     setTweetCount]     = useState(0)
  const [qaTitles,       setQaTitles]       = useState<any[]>([])
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
        { count: vc },
        { count: pc },
        { count: tc },
        qaTitlesRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        getUserTrust(user.id),
        supabase.from('village_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('village_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('tweets').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('qa_titles').select('*').eq('user_id', user.id).order('awarded_at', { ascending: false }),
      ])

      if (!p) { router.push('/onboarding'); return }
      setProfile(p)
      setTrust(trustData)
      setVillageCount(vc ?? 0)
      setPostCount(pc ?? 0)
      setTweetCount(tc ?? 0)
      setQaTitles((qaTitlesRes as any)?.data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/')
  }

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAF9]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

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
          className="mt-4 grid grid-cols-3 gap-2 rounded-2xl px-3 py-3"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
        >
          {[
            { value: villageCount, label: '参加村' },
            { value: postCount,    label: '投稿数' },
            { value: tweetCount,   label: 'ツイート' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-extrabold text-white text-lg leading-none">{s.value}</p>
              <p className="text-white/50 text-[10px] mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-32 space-y-4">

        {/* ── Trust Card ── */}
        {trust && (
          <TrustCard trust={{
            score:          trust.score,
            tier:           trust.tier,
            total_helped:   trust.total_helped,
            phone_verified: trust.phone_verified,
          }} />
        )}

        {/* ── 電話未認証バナー ── */}
        {trust && !trust.phone_verified && (
          <button
            onClick={() => setShowPhoneVerify(true)}
            className="w-full bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left active:scale-[0.99] transition-all"
          >
            <span className="text-2xl">📱</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-sky-700">電話番号を認証する</p>
              <p className="text-xs text-sky-500 mt-0.5">投稿・通話が解放されます · +30pt</p>
            </div>
            <ChevronRight size={16} className="text-sky-300" />
          </button>
        )}

        {/* ── 信頼の積み方 ── */}
        {trust && <TrustHowToCard />}

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

        {/* ── Samee ID ── */}
        {profile.samee_id && (
          <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">My ID</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5">
                <span className="font-mono font-bold text-stone-800 text-base tracking-widest">#{profile.samee_id}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(profile.samee_id!)
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
