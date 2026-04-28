'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const REPORT_REASONS = [
  '誹謗中傷・人格攻撃',
  '勧誘・営業・スパム',
  '連絡先・個人情報の要求',
  '差別的・不適切な発言',
  '嫌がらせ・ストーキング',
  'その他',
]

interface ReportModalProps {
  reportedId: string
  reportedName: string
  onClose: () => void
}

export default function ReportModal({ reportedId, reportedName, onClose }: ReportModalProps) {
  const [reason,      setReason]      = useState('')
  const [description, setDescription] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(false)

  async function handleSubmit() {
    if (!reason) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // ── 重複通報チェック（集団通報対策）──────────────────────
      // 同一reporter_idが同一reported_idに既に通報済みの場合はスキップ
      const { data: existing } = await supabase
        .from('reports')
        .select('id')
        .eq('reporter_id', user.id)
        .eq('reported_id', reportedId)
        .limit(1)

      if (!existing || existing.length === 0) {
        // 初回通報のみ有効
        await supabase.from('reports').insert({
          reporter_id:  user.id,
          reported_id:  reportedId,
          reason,
          description:  description || null,
        })
        // report_countインクリメント（shadow banトリガー発火）
        await supabase.rpc('increment_report_count', { p_user_id: reportedId })
      }
      // 重複の場合も「受け付けました」表示（ユーザーには知らせない）
    }
    setLoading(false)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-t-3xl p-5 pb-8 shadow-2xl">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚨</span>
            <h2 className="text-base font-extrabold text-stone-900">通報する</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-stone-100 transition">
            <X size={18} className="text-stone-500" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-extrabold text-stone-800 text-base">通報を受け付けました</p>
            <p className="text-sm text-stone-500 mt-2 leading-relaxed">
              運営チームが確認し、対応します。<br />
              自由村をより良い場所にするための報告、ありがとうございます。
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full py-3 rounded-2xl bg-stone-100 text-stone-700 font-bold text-sm active:scale-95 transition-all"
            >
              閉じる
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-500 mb-4">
              <strong className="text-stone-800">{reportedName}</strong> さんを通報する理由を選んでください。
            </p>

            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-sm border transition-all ${
                    reason === r
                      ? 'border-red-400 bg-red-50 text-red-700 font-bold'
                      : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="詳細（任意）"
              rows={2}
              className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm resize-none focus:outline-none mb-4"
            />

            <button
              onClick={handleSubmit}
              disabled={!reason || loading}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                : '通報を送信する'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
