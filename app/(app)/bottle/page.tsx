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
  const [villages,  setVillages]  = useState<any[]>([])
  const [selected,  setSelected]  = useState<any>(null)
  const [userTrust, setUserTrust] = useState<any>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // 参加している村を取得
      const { data } = await supabase
        .from('village_members')
        .select('village_id, villages(id, name, icon, type, description)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })

      const vs = (data ?? []).map((m: any) => m.villages).filter(Boolean)
      setVillages(vs)
      if (vs.length === 1) setSelected(vs[0])

      const trust = await getUserTrust(user.id)
      setUserTrust(trust)
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
    <div className="max-w-md mx-auto min-h-screen bg-[#F5F0E8] pb-28">

      {/* ヘッダー */}
      <div className="bg-gradient-to-b from-[#0c1445] to-[#1a2c6b] px-5 pt-12 pb-6">
        <p className="text-blue-300 text-xs font-bold tracking-widest mb-1">DRIFT BOTTLE</p>
        <h1 className="text-2xl font-extrabold text-white">🌊 ひとこと</h1>
        <p className="text-blue-200 text-xs mt-1.5 leading-relaxed">
          気持ちや悩みを匿名で村に流す。<br />住民の誰かが拾って、返事をくれるかも。
        </p>
        {/* 使い方3ステップ */}
        <div className="flex gap-2 mt-4">
          {[
            { icon: '🔒', text: '匿名で送る' },
            { icon: '🤲', text: '誰かが拾う' },
            { icon: '💬', text: '返事が届く' },
          ].map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-white/10">
              <span className="text-lg">{s.icon}</span>
              <span className="text-[9px] font-bold text-blue-200">{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* 村に参加していない場合 */}
        {villages.length === 0 && (
          <div className="bg-white rounded-3xl p-6 text-center shadow-sm border border-stone-100">
            <p className="text-3xl mb-3">🌿</p>
            <p className="text-sm font-bold text-stone-700">まず村に参加しよう</p>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              漂流瓶はvilliaの村の機能です。<br />村に参加してから使えます。
            </p>
            <button
              onClick={() => router.push('/villages')}
              className="mt-4 px-6 py-2.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#1e40af,#1d4ed8)' }}>
              村を探す →
            </button>
          </div>
        )}

        {/* 村が1つ以上ある場合 */}
        {villages.length > 0 && (
          <>
            {/* 村セレクター（2村以上の場合） */}
            {villages.length > 1 && (
              <div>
                <p className="text-xs font-bold text-stone-500 mb-2 px-1">どの村に流しますか？</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                  {villages.map((v: any) => {
                    const st = VILLAGE_TYPE_STYLES[v.type] ?? VILLAGE_TYPE_STYLES['雑談']
                    const isSelected = selected?.id === v.id
                    return (
                      <button key={v.id}
                        onClick={() => setSelected(v)}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all active:scale-95"
                        style={isSelected
                          ? { background: st.accent, borderColor: st.accent, color: '#fff' }
                          : { background: '#fff', borderColor: '#e7e5e4', color: '#57534e' }}>
                        <span className="text-lg">{v.icon}</span>
                        <span className="text-xs font-bold truncate max-w-[80px]">{v.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 選択された村のDriftBottle */}
            {selected ? (
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
            )}
          </>
        )}
      </div>
    </div>
  )
}
