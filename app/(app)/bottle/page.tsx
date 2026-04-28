'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'
import DriftBottle from '@/components/features/DriftBottle'
import { getUserTrust, getTierById } from '@/lib/trust'

export default function BottlePage() {
  const router = useRouter()

  const [userId,    setUserId]    = useState<string | null>(null)
  const [userTrust, setUserTrust] = useState<any>(null)
  const [villages,  setVillages]  = useState<any[]>([])
  const [selected,  setSelected]  = useState<any>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [villageRes, trustRes] = await Promise.all([
        supabase
          .from('village_members')
          .select('village_id, villages(id, name, icon, type, description)')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false }),
        getUserTrust(user.id),
      ])

      const vs = (villageRes.data ?? []).map((m: any) => m.villages).filter(Boolean)
      setVillages(vs)
      if (vs.length === 1) setSelected(vs[0])
      setUserTrust(trustRes)
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
      <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const tier = userTrust ? getTierById(userTrust.tier) : getTierById('visitor')

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F5F0E8]">

      {/* ヘッダー */}
      <div
        className="relative overflow-hidden px-4 pt-12 pb-5 sticky top-0 z-10"
        style={{ background: 'linear-gradient(160deg, #0c1445 0%, #1a2c6b 60%, #0f3460 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(1px 1px at 15% 25%, white, transparent),
              radial-gradient(1px 1px at 65% 12%, white, transparent),
              radial-gradient(1.5px 1.5px at 82% 58%, white, transparent),
              radial-gradient(1px 1px at 38% 72%, white, transparent),
              radial-gradient(1px 1px at 92% 30%, white, transparent)`,
          }}
        />
        <div className="relative">
          <p className="text-blue-300/70 text-[10px] font-bold tracking-widest mb-0.5 uppercase">Drift Bottle</p>
          <h1 className="font-extrabold text-white text-2xl leading-tight">🌊 漂流瓶</h1>
          <p className="text-blue-200/60 text-[11px] mt-0.5">気持ちを匿名で流す・誰かが拾う</p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-32 space-y-4">

        {/* キャッチコピー */}
        <div
          className="rounded-2xl px-4 py-4 text-center space-y-1"
          style={{ background: 'linear-gradient(135deg, rgba(12,20,69,0.06) 0%, rgba(29,78,216,0.06) 100%)', border: '1px solid rgba(29,78,216,0.1)' }}
        >
          <p className="text-lg font-extrabold text-stone-800">今の気持ちを、流してみよう</p>
          <p className="text-xs text-stone-400 leading-relaxed">
            答えは求めなくていい。<br />ただ、誰かに受け止めてほしいとき。
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            {[
              { icon: '🔒', text: '完全匿名' },
              { icon: '🌊', text: 'どこかへ届く' },
              { icon: '🤲', text: '誰かが拾う' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-sm">{s.icon}</span>
                <span className="text-[10px] font-bold text-stone-500">{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ギルドへの誘導 */}
        <button
          onClick={() => router.push('/guild')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.99] transition-all"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}
        >
          <span className="text-xl">⚔️</span>
          <div className="flex-1 text-left">
            <p className="text-xs font-bold text-indigo-700">本音で話すなら → ギルド</p>
            <p className="text-[10px] text-indigo-400">業界別・匿名で仕事の話ができます</p>
          </div>
          <span className="text-indigo-300 text-xs">→</span>
        </button>

        {/* 村に参加していない場合 */}
        {villages.length === 0 && (
          <div className="bg-white rounded-3xl p-6 text-center shadow-sm border border-stone-100">
            <p className="text-3xl mb-3">🌿</p>
            <p className="text-sm font-bold text-stone-700">まず村に参加しよう</p>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              漂流瓶は村の機能です。<br />村に参加してから使えます。
            </p>
            <button
              onClick={() => router.push('/villages')}
              className="mt-4 px-6 py-2.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1e40af, #1d4ed8)' }}
            >
              村を探す →
            </button>
          </div>
        )}

        {/* 村セレクター（2村以上） */}
        {villages.length > 1 && (
          <div>
            <p className="text-xs font-bold text-stone-500 mb-2 px-1">どの村に流しますか？</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {villages.map((v: any) => {
                const st = VILLAGE_TYPE_STYLES[v.type] ?? VILLAGE_TYPE_STYLES['雑談']
                const isSelected = selected?.id === v.id
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelected(v)}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all active:scale-95"
                    style={isSelected
                      ? { background: st.accent, borderColor: st.accent, color: '#fff' }
                      : { background: '#fff', borderColor: '#e7e5e4', color: '#57534e' }
                    }
                  >
                    <span className="text-lg">{v.icon}</span>
                    <span className="text-xs font-bold truncate max-w-[80px]">{v.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* DriftBottle */}
        {villages.length > 0 && (
          selected ? (
            <DriftBottle
              villageId={selected.id}
              villageName={selected.name}
              userId={userId ?? ''}
              style={VILLAGE_TYPE_STYLES[selected.type] ?? VILLAGE_TYPE_STYLES['雑談']}
              isMember={true}
              canPost={tier.canPost}
              canReply={tier.canCreateRoom}
            />
          ) : (
            <div className="bg-white rounded-3xl p-6 text-center shadow-sm border border-stone-100">
              <p className="text-2xl mb-2">👆</p>
              <p className="text-sm font-bold text-stone-600">上から村を選んでください</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
