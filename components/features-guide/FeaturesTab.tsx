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
// 旧: 6 カテゴリ + 「すべて」で iPhone 幅で右端が見切れていたため、
// 「見る」(browse) は「つながる」(community) に近い概念なので統合。
const CAT_META: Record<string, { label: string; color: string }> = {
  voice:     { label: '話す',         color: '#3B82F6' },
  community: { label: 'つながる',     color: '#10B981' },
  fun:       { label: '遊ぶ',         color: '#FBBF24' },
  safety:    { label: '守る',         color: '#EF4444' },
  system:    { label: 'しくみ',       color: '#A78BFA' },
  // browse は community 配下に統合（タブには出さない）。
  // DB に browse 機能が残っていてもラベル色が引けるよう定義は残す。
  browse:    { label: 'つながる',     color: '#10B981' },
}
// タブとして表示するカテゴリ（browse を除外）
const VISIBLE_CATS = ['voice', 'community', 'fun', 'safety', 'system'] as const
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
        {/* 旧: bundle.meta.catchcopies[0] (DB 内に「大人だけの、ちょっと静かな
            通話アプリ」が残っていて通話だけのアプリに見える)。
            samee はゲーム + 通話 + コミュニティ全体なのでコード側で固定。 */}
        <p className="text-sm mt-1 leading-relaxed" style={{ color: 'rgba(240,238,255,0.6)' }}>
          ゲームや雑談を、安心して楽しめる大人のコミュニティ。
        </p>
      </div>

      {/* ── いま使える機能（実装済み） ── */}
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.22)' }}>
        <p className="text-[11px] font-extrabold tracking-wider mb-1" style={{ color: '#FBBF24' }}>
          いま使える機能
        </p>
        {[
          { icon: '📋', name: 'タイムライン',       color: '#39FF88', desc: '近況・ゲームの募集・ひとことが流れる場所' },
          { icon: '🎮', name: 'いますぐ村',         color: '#8B5CF6', desc: '今すぐ一緒に遊ぶ人を探せる場所' },
          { icon: '🛡️', name: 'ギルド',             color: '#27DFFF', desc: '同じゲームが好きな仲間が集まる継続的なコミュニティ' },
          { icon: '🎙️', name: '通話ルーム',         color: '#A78BFA', desc: 'ルーム内で声で話せる。聞き専でも参加可' },
          { icon: '💬', name: 'チャット / DM',      color: '#FF4FD8', desc: '個別のメッセージ。フレンドや申請承認で開始' },
          { icon: '🔍', name: 'ユーザー検索',       color: '#27DFFF', desc: '名前・自己紹介でフレンドを探す（フォロー / 申請も可）' },
          { icon: '📺', name: 'YouTube 同時視聴',   color: '#EF4444', desc: 'ルームで同じ動画をみんなで見ながら通話' },
          { icon: '🍶', name: '漂流瓶（ひとこと）', color: '#3B82F6', desc: '匿名で気持ちを村に流す。誰かが返事してくれることも' },
          { icon: '🔔', name: '通知',               color: '#FFC928', desc: 'いいね・コメント・申請・ルーム開始を確認' },
          { icon: '👤', name: 'プロフィール',       color: '#c4b5fd', desc: '自己紹介・投稿・参加中・認証状態を編集 / 確認' },
        ].map(({ icon, name, color, desc }) => (
          <div key={name} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <span className="text-base">{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold leading-snug" style={{ color: '#F0EEFF' }}>{name}</p>
              <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'rgba(240,238,255,0.55)' }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 今後対応予定 ── */}
      <div className="rounded-2xl p-4 space-y-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(240,238,255,0.10)' }}>
        <p className="text-[10px] font-extrabold tracking-widest uppercase mb-1" style={{ color: 'rgba(240,238,255,0.5)' }}>
          今後対応予定
        </p>
        {[
          { icon: '🖥️', name: '画面共有',          desc: 'PC ブラウザでゲーム画面をルーム内に共有（準備中）' },
          { icon: '👥', name: '男女別 / 人数制限ルーム', desc: 'ルーム作成時に参加条件・上限人数を設定（準備中）' },
          { icon: '🏆', name: 'ギルド大会',        desc: 'ギルド同士の対戦・ランキング（準備中）' },
        ].map(({ icon, name, desc }) => (
          <div key={name} className="flex items-start gap-3 opacity-80">
            <span className="text-base flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-snug" style={{ color: 'rgba(240,238,255,0.7)' }}>{name}</p>
              <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'rgba(240,238,255,0.45)' }}>{desc}</p>
            </div>
          </div>
        ))}
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

      {/* カテゴリタブ — 末尾に右余白を入れてスクロール末尾の見切れを防ぐ */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 pl-4 pr-6 pb-1">
        {(['all', ...VISIBLE_CATS] as const).map(c => {
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
