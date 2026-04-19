'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { REPORT_REASONS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

interface ReportModalProps {
  reportedId: string
  reportedName: string
  onClose: () => void
}

export default function ReportModal({ reportedId, reportedName, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!reason) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_id: reportedId,
        reason,
        description: description || null,
      })
    }
    setLoading(false)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Report User</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-gray-800">Report submitted</p>
            <p className="text-sm text-gray-500 mt-1">Thank you. We'll review this report.</p>
            <Button className="mt-5 w-full" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">Report <strong>{reportedName}</strong> for inappropriate behavior.</p>
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-sm border transition ${
                    reason === r
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional: add more details..."
              rows={2}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 mb-4"
            />
            <Button fullWidth loading={loading} disabled={!reason} onClick={handleSubmit} variant="danger">
              Submit Report
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
