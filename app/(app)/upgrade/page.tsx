'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Zap } from 'lucide-react'

const BENEFITS = [
  { icon: '🛡️', label: 'ギルドへの参加が無制限になる' },
  { icon: '📝', label: '1日の投稿数が無制限になる' },
  { icon: '👀', label: '自分の投稿を見た人がわかる' },
  { icon: '🔝', label: 'フィードで優先表示される' },
  { icon: '⚡', label: 'プロフィールにプレミアムバッジ' },
  { icon: '✨', label: 'コミュニティの柱になると輝くバッジエフェクト' },
]

export default function UpgradePage() {
  const router = useRouter()

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
          <ArrowLeft size={20} />
        </button>
        <p className="font-extrabold text-stone-900 flex-1">プレミアムにアップグレード</p>
      </div>

      <div className="px-4 pt-8 pb-32">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
            <Zap size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-stone-900 mb-2">samee プレミアム</h1>
          <p className="text-stone-500 text-sm leading-relaxed">
            sameeをもっと使いこなす。<br />ギルドを制限なしで楽しもう。
          </p>
        </div>

        {/* Price */}
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white text-center mb-6 shadow-lg shadow-amber-200">
          <p className="text-sm font-bold opacity-80 mb-1">月額</p>
          <p className="text-5xl font-black mb-1">¥980</p>
          <p className="text-xs opacity-70">いつでもキャンセルできます</p>
        </div>

        {/* Benefits */}
        <div className="bg-white border border-stone-100 rounded-2xl p-5 mb-6 shadow-sm space-y-3.5">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">プレミアム特典</p>
          {BENEFITS.map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xl w-7 text-center flex-shrink-0">{icon}</span>
              <span className="text-sm text-stone-700 font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* CTA — Stripe未設定時はプレースホルダー */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center mb-4">
          <p className="text-sm font-bold text-amber-700 mb-1">🔧 決済設定準備中</p>
          <p className="text-xs text-amber-600 leading-relaxed">
            Stripe決済の設定が完了次第、こちらから購入できるようになります。<br />
            もうしばらくお待ちください。
          </p>
        </div>

        <button
          onClick={() => router.back()}
          className="w-full py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold text-sm border border-stone-200"
        >
          戻る
        </button>
      </div>
    </div>
  )
}
