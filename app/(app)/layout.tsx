'use client'

import { useState } from 'react'
import BottomNav from '@/components/layout/BottomNav'
import FeedbackModal from '@/components/features/FeedbackModal'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showFeedback, setShowFeedback] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-20">
        {children}
      </div>
      <BottomNav />

      {/* Floating feedback button */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-24 right-4 z-30 w-11 h-11 bg-white border border-gray-200 rounded-2xl shadow-md flex items-center justify-center text-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
        title="Share feedback"
      >
        💡
      </button>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  )
}
