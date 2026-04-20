import Link from 'next/link'
import { Crown } from 'lucide-react'

export default function UpgradeSuccess() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center max-w-[430px] mx-auto px-5 text-center">
      <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mb-6">
        <Crown size={40} className="text-amber-500" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">You're Premium!</h1>
      <p className="text-gray-500 text-sm leading-relaxed mb-8">
        Unlimited Likes, see who liked you, profile boost — all active now.
      </p>
      <Link href="/likes-me"
        className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold text-sm text-center shadow-md shadow-amber-200 active:scale-[0.98] transition-all block mb-3">
        See who liked you →
      </Link>
      <Link href="/search" className="text-sm text-gray-400 hover:text-gray-600">
        Back to Search
      </Link>
    </div>
  )
}
