'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchFeatureGuideBundle,
  pickByLocation,
  evaluateLock,
  groupByCategory,
  type FeatureGuideBundle,
  type FeatureCategory,
} from '@/lib/feature-guides'
import FeatureCard from './FeatureCard'

// カテゴリの表示名・色マッピング（DB に未知カテゴリが追加されてもフォールバック）
const CAT_META: Record<string, { label: string; color: string }> = {
  voice:     { label: '話す',         color: '#3B82F6' },
  community: { label: 'つながる',     color: '#10B981' },
  fun:       { label: '遊ぶ',         color: '#FBBF24' },
  safety:    { label: '守る',         color: '#EF4444' },
  system:    { label: 'しくみ',       color: '#A78BFA' },
  browse:    { label: '見る',         color: '#94A3B8' },
}
function catMeta(id: string) {
  return CAT_META[id] ?? { label: id, color: '#94A3B8' }
}

export default function FeaturesTab() {
  const [bundle, setBundle]   = useState<FeatureGuideBundle | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [activeCat, setActiveCat] = useState<FeatureCategory | 'all'>('all')
  const [trustTier, setTrustTier] = useState<number>(0)
  const [verified,  setVerified]  = useState<boolean>(false)
  const [age,       setAge]       = useState<number | null>(null)

  // ── データ取得 + ユーザー状態 ──
  useEffect(() => {
    let alive = true
    fetchFeatureGuideBundle()
      .then(b => { if (alive) setBundle(b) })
      .catch((e: unknown) => {
        if (!alive) return
        setLoadErr(e instanceof Error ? e.message : '機能ガイドの取得に失敗しました')
      })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    async function fetchUserCtx() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !alive) return

        const [trustRes, profileRes] = await Promise.all([
          supabase.from('user_trust')
            .select('tier, age_verification_status')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase.from('profiles').select('age').eq('id', user.id).maybeSingle(),
        ])
        if (!alive) return

        const tierLabel = (trustRes.data as { tier?: string } | null)?.tier
        const tierMap: Record<string, number> = {
          visitor: 0, resident: 1, regular: 2, trusted: 3, pillar: 4,
        }
        setTrustTier(tierLabel ? (tierMap[tierLabel] ?? 0) : 0)
        setVerified((trustRes.data as { age_verification_status?: string } | null)
          ?.age_verification_status === 'verified')
        setAge((profileRes.data as { age?: number } | null)?.age ?? null)
      } catch { /* silent — gating defaults to most restrictive */ }
    }
    fetchUserCtx()
    return () => { alive = false }
  }, [])

  // ── 派生データ ──
  const sections = useMemo(() => {
    if (!bundle) return null
    const visible = pickByLocation(bundle.features, 'mypage')
    const filtered = activeCat === 'all'
      ? visible
      : visible.filter(f => f.category === activeCat)
    return groupByCategory(filtered)
  }, [bundle, activeCat])

  const ctx = { trustTier, verified, age }

  return (
    <div className="px-4 py-4 space-y-5">
      {/* ヘッダー＋キャッチ */}
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: '#FBBF24' }}>FEATURE GUIDE</p>
        <h2 className="font-extrabold text-xl leading-tight" style={{ color: '#F0EEFF' }}>できること</h2>
        {bundle?.meta.catchcopies?.[0] && (
          <p className="text-sm mt-1" style={{ color: 'rgba(240,238,255,0.55)' }}>
            {bundle.meta.catchcopies[0]}
          </p>
        )}
      </div>

      {/* 3ステップ */}
      {bundle?.meta.starterFlow?.length ? (
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.22)' }}>
          <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#FBBF24' }}>はじめての3ステップ</p>
          <ol className="space-y-2">
            {bundle.meta.starterFlow.map(s => (
              <li key={s.step} className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                  style={{ background: '#FBBF24', color: '#1f1300' }}>
                  {s.step}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: '#F0EEFF' }}>{s.title}</p>
                  <p className="text-xs" style={{ color: 'rgba(240,238,255,0.45)' }}>{s.hint}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {/* カテゴリタブ */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
        {(['all', ...Object.keys(CAT_META)] as const).map(c => {
          const on = activeCat === c
          const meta = c === 'all' ? { label: 'すべて', color: '#c4b5fd' } : catMeta(c)
          return (
            <button
              key={c}
              onClick={() => setActiveCat(c as FeatureCategory | 'all')}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
              style={on
                ? { background: hexA(meta.color, 0.22), color: meta.color, border: `1px solid ${hexA(meta.color, 0.45)}` }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* 不安解消メッセージ */}
      {bundle?.meta.anxietyMessages?.length ? (
        <details className="rounded-2xl"
          style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.22)' }}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold list-none flex items-center justify-between"
            style={{ color: '#c4b5fd' }}>
            <span>不安なことがある？</span>
            <span className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>タップで開く</span>
          </summary>
          <div className="px-4 pb-4 space-y-3">
            {bundle.meta.anxietyMessages.map(m => (
              <div key={m.key}>
                <p className="text-xs font-bold mb-1" style={{ color: 'rgba(240,238,255,0.7)' }}>
                  「{m.title}」
                </p>
                <ul className="space-y-1">
                  {m.candidates.map((c, i) => (
                    <li key={i} className="text-xs leading-relaxed pl-3"
                      style={{ color: 'rgba(240,238,255,0.55)', borderLeft: '2px solid rgba(196,181,253,0.4)' }}>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {/* ローディング / エラー */}
      {!bundle && !loadErr && (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin" style={{ color: '#FBBF24' }} />
        </div>
      )}
      {loadErr && (
        <div className="rounded-2xl p-3 text-xs"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#fecaca' }}>
          {loadErr}
        </div>
      )}

      {/* 機能リスト（カテゴリ別） */}
      {sections && Object.keys(sections).length === 0 && (
        <p className="text-center py-8 text-xs" style={{ color: 'rgba(240,238,255,0.35)' }}>
          このカテゴリの機能はまだありません。
        </p>
      )}
      {sections && Object.entries(sections).map(([catId, items]) => (
        <section key={catId} className="space-y-2.5">
          {activeCat === 'all' && (
            <h3 className="text-[10px] font-bold tracking-widest uppercase mt-2"
              style={{ color: catMeta(catId).color }}>
              {catMeta(catId).label}
            </h3>
          )}
          {items.map(f => (
            <FeatureCard
              key={f.id}
              feature={f}
              lockReason={evaluateLock(f, ctx)}
            />
          ))}
        </section>
      ))}
    </div>
  )
}

function hexA(hex: string, a: number): string {
  const m = hex.replace('#', '').match(/^([0-9a-fA-F]{6})$/)
  if (!m) return `rgba(139,92,246,${a})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
