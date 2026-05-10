import Link from 'next/link'
import { Crown } from 'lucide-react'

// 2026-05-10 リリース前整理: 旧 dating Premium feature の文言 (Unlimited Likes /
// See who liked you) を YVOICE 文脈に合わせて更新。/likes-me は非表示化したので
// ボタンの遷移先を /mypage に変更。
export default function UpgradeSuccess() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center max-w-[430px] mx-auto px-5 text-center">
      <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mb-6">
        <Crown size={40} className="text-amber-500" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">プレミアムになりました</h1>
      <p className="text-gray-500 text-sm leading-relaxed mb-8">
        プレミアム特典がすべて有効になりました。マイページで状態を確認できます。
      </p>
      <Link href="/mypage"
        className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold text-sm text-center shadow-md shadow-amber-200 active:scale-[0.98] transition-all block mb-3">
        マイページを見る →
      </Link>
      <Link href="/timeline" className="text-sm text-gray-400 hover:text-gray-600">
        タイムラインへ戻る
      </Link>
    </div>
  )
}
