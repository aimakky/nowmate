'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Users, Star, Ban, Check } from 'lucide-react'

type DMPrivacy = 'all' | 'village_members' | 'tier3plus' | 'none'

const OPTIONS: {
  id: DMPrivacy
  icon: React.ReactNode
  label: string
  desc: string
  color: string
  bg: string
  border: string
  premium?: boolean
}[] = [
  {
    id: 'all',
    icon: <Users size={18} />,
    label: '全員からOK',
    desc: 'すべてのユーザーからDMを受け取る',
    color: '#059669', bg: '#ecfdf5', border: '#a7f3d0',
  },
  {
    id: 'village_members',
    icon: <Shield size={18} />,
    label: '同じ村・集いのメンバーのみ',
    desc: '共通の村か集いに参加している人だけ',
    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
  },
  {
    id: 'tier3plus',
    icon: <Star size={18} />,
    label: '信頼ティア3以上のみ',
    desc: '実績のある信頼できるメンバーだけ',
    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    premium: true,
  },
  {
    id: 'none',
    icon: <Ban size={18} />,
    label: 'DMを受け付けない',
    desc: '全員からのDMをリクエストに回す',
    color: '#dc2626', bg: '#fef2f2', border: '#fecaca',
    premium: true,
  },
]

export default function DMPrivacySettings({
  userId,
  initialValue = 'all',
}: {
  userId: string
  initialValue?: DMPrivacy
}) {
  const [current, setCurrent] = useState<DMPrivacy>(initialValue)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  async function handleChange(val: DMPrivacy) {
    setCurrent(val)
    setSaving(true)
    setSaved(false)
    await createClient()
      .from('profiles')
      .update({ dm_privacy: val })
      .eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-2">
      {OPTIONS.map(opt => {
        const selected = current === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => handleChange(opt.id)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={selected
              ? { background: opt.bg, border: `2px solid ${opt.color}` }
              : { background: '#fafaf9', border: '2px solid #e7e5e4' }
            }
          >
            {/* アイコン */}
            <div
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: selected ? opt.color : '#f3f4f6', color: selected ? '#fff' : '#9ca3af' }}
            >
              {opt.icon}
            </div>

            {/* テキスト */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-extrabold" style={{ color: selected ? opt.color : '#1c1917' }}>
                  {opt.label}
                </p>
                {opt.premium && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">{opt.desc}</p>
            </div>

            {/* チェック */}
            {selected && (
              <div
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: opt.color }}
              >
                <Check size={11} color="#fff" strokeWidth={3} />
              </div>
            )}
          </button>
        )
      })}

      {/* 保存状態 */}
      <div className="h-5 flex items-center justify-end px-1">
        {saving && <span className="text-[11px] text-stone-400">保存中...</span>}
        {saved  && <span className="text-[11px] text-emerald-500 font-bold">✓ 保存しました</span>}
      </div>

      {/* 説明 */}
      <div className="rounded-2xl px-4 py-3 bg-stone-50 border border-stone-100">
        <p className="text-[11px] text-stone-500 leading-relaxed">
          💡 条件を満たさないユーザーからのDMは<span className="font-bold text-stone-700">「リクエスト」</span>として届きます。
          リクエストは承認するまで相手に既読がつきません。拒否しても相手には通知されません。
        </p>
      </div>
    </div>
  )
}
