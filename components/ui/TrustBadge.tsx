'use client'

import { getTierById, getTierFromScore, getNextTier, getProgressToNext } from '@/lib/trust'

// ─── コンパクトバッジ（一覧・カードに使う）──────────────────
export default function TrustBadge({
  tierId,
  score,
  size = 'sm',
  showLabel = true,
}: {
  tierId?: string
  score?: number
  size?: 'xs' | 'sm' | 'md'
  showLabel?: boolean
}) {
  const tier = tierId ? getTierById(tierId) : getTierFromScore(score ?? 0)

  const sizeClass = {
    xs: 'text-[9px] px-1 py-0.5 gap-0.5',
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1',
  }[size]

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${tier.color} ${sizeClass}`}
    >
      <span>{tier.icon}</span>
      {showLabel && <span>{tier.label}</span>}
    </span>
  )
}

// ─── フルカード（マイページで使う）──────────────────────────
export function TrustCard({
  trust,
}: {
  trust: {
    score: number
    tier: string
    total_helped: number
    phone_verified: boolean
  }
}) {
  const tier     = getTierById(trust.tier)
  const next     = getNextTier(trust.tier)
  const progress = getProgressToNext(trust.score)

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">村での立場</p>
        {trust.phone_verified && (
          <span className="text-[10px] bg-sky-50 text-sky-600 border border-sky-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            ✓ 電話認証済み
          </span>
        )}
      </div>

      {/* Tier display */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${tier.color}`}>
          {tier.icon}
        </div>
        <div>
          <p className="font-extrabold text-stone-900 text-base">{tier.label}</p>
          <p className="text-xs text-stone-400 leading-snug">{tier.desc}</p>
        </div>
      </div>

      {/* Progress to next tier */}
      {next && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] text-stone-400 font-semibold">
              次の立場まで：{next.icon} {next.label}
            </p>
            <p className="text-[10px] text-stone-400">あと{progress.pointsNeeded}pt</p>
          </div>
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-400 rounded-full transition-all duration-500"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Helped count */}
      <div className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-stone-600">
            {trust.total_helped > 0
              ? `${trust.total_helped}人の役に立てました`
              : 'まだ誰かの役に立っていません'}
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">
            相談に答えると信頼が増えます
          </p>
        </div>
        <div className="text-2xl">
          {trust.total_helped === 0 ? '🌱' : trust.total_helped < 5 ? '🌿' : trust.total_helped < 20 ? '🌳' : '✨'}
        </div>
      </div>

      {/* What you can do */}
      <div className="mt-3 space-y-1.5">
        {[
          { ok: tier.canPost,         label: '投稿できる' },
          { ok: tier.canSpeak,        label: '通話で話せる' },
          { ok: tier.canConsult,      label: '相談投稿できる' },
          { ok: tier.canCreateRoom,   label: '通話部屋を作れる' },
          { ok: tier.canCreateVillage,label: '村を作れる' },
        ].map(({ ok, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
              ok ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'
            }`}>
              {ok ? '✓' : '–'}
            </span>
            <span className={`text-xs ${ok ? 'text-stone-700 font-medium' : 'text-stone-400'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ポイント獲得方法リスト ───────────────────────────────────
export function TrustHowToCard() {
  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
        信頼の積み方
      </p>
      <div className="space-y-2.5">
        {[
          { icon: '📱', action: '電話番号を認証する',    pts: '+30', note: '一回のみ' },
          { icon: '🤝', action: '相談を解決する',        pts: '+25', note: '週3回まで' },
          { icon: '🌱', action: '新人の挨拶に返信する',  pts: '+8',  note: '1日3回まで' },
          { icon: '❤️', action: '投稿がいいねされる',    pts: '+2',  note: '1投稿MAX+10' },
          { icon: '🎙️', action: '通話に30分参加する',   pts: '+5',  note: '1日1回' },
          { icon: '📅', action: '7日連続アクティブ',     pts: '+10', note: '週次ボーナス' },
        ].map(({ icon, action, pts, note }) => (
          <div key={action} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base w-6 text-center">{icon}</span>
              <div>
                <p className="text-xs font-medium text-stone-700">{action}</p>
                <p className="text-[9px] text-stone-400">{note}</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-emerald-600">{pts}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
