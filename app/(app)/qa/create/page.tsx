'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Eye, EyeOff, X } from 'lucide-react'
import { QA_CATEGORIES, getCategoryStyle } from '@/lib/qa'
import { getUserTrust } from '@/lib/trust'

interface Village {
  id: string
  name: string
  icon: string
}

export default function QACreatePage() {
  const router = useRouter()
  const [category,      setCategory]      = useState('なんでも相談')
  const [title,         setTitle]         = useState('')
  const [content,       setContent]       = useState('')
  const [isAnonymous,   setIsAnonymous]   = useState(true)
  const [submitting,    setSubmitting]    = useState(false)
  const [error,         setError]         = useState('')
  const [myVillages,    setMyVillages]    = useState<Village[]>([])
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null)
  const [showVillages,  setShowVillages]  = useState(false)

  const cs = getCategoryStyle(category)

  useEffect(() => {
    async function loadVillages() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('village_members')
        .select('villages(id, name, icon)')
        .eq('user_id', user.id)
        .limit(20)
      const villages = (data || [])
        .map((r: any) => Array.isArray(r.villages) ? r.villages[0] : r.villages)
        .filter(Boolean) as Village[]
      setMyVillages(villages)
    }
    loadVillages()
  }, [])

  async function handleSubmit() {
    if (!title.trim() || !content.trim() || submitting) return
    setError('')
    setSubmitting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const trust = await getUserTrust(user.id)
    if (!trust || trust.tier === 'visitor') {
      setError('電話番号を認証してから質問できます')
      setSubmitting(false)
      return
    }

    const { error: err } = await supabase.from('qa_questions').insert({
      user_id:      user.id,
      category,
      title:        title.trim(),
      content:      content.trim(),
      is_anonymous: isAnonymous,
      village_id:   selectedVillage?.id ?? null,
    })

    if (err) {
      setError('投稿に失敗しました。もう一度お試しください。')
      setSubmitting(false)
      return
    }

    router.push('/qa')
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{ background: cs.gradient }}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div>
          <p className="font-extrabold text-white text-base">質問する</p>
          <p className="text-white/60 text-[10px]">匿名で気軽に相談できます</p>
        </div>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-5">

        {/* ── カテゴリ選択 ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">カテゴリ</p>
          <div className="grid grid-cols-2 gap-2">
            {QA_CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className="flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all active:scale-95"
                style={category === c.id
                  ? { borderColor: c.color, background: c.bg }
                  : { borderColor: '#e7e5e4', background: '#fff' }
                }
              >
                <span className="text-xl flex-shrink-0">{c.emoji}</span>
                <p className="text-xs font-bold leading-tight" style={{ color: category === c.id ? c.color : '#44403c' }}>
                  {c.id}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ── タイトル ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            質問のタイトル <span className="text-rose-400">*</span>
          </p>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="例：職場の先輩との関係で悩んでいます"
            maxLength={60}
            className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none bg-white"
            style={{ focusBorderColor: cs.color } as any}
          />
          <div className="flex justify-between mt-1">
            <p className="text-[10px] text-stone-400">5〜60文字</p>
            <p className="text-[10px] text-stone-400">{title.length}/60</p>
          </div>
        </div>

        {/* ── 本文 ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            詳しい内容 <span className="text-rose-400">*</span>
          </p>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="状況や背景を詳しく書くと、より良いアドバイスがもらえます。"
            maxLength={1000}
            rows={6}
            className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm resize-none focus:outline-none bg-white leading-relaxed"
          />
          <div className="flex justify-between mt-1">
            <p className="text-[10px] text-stone-400">10〜1000文字</p>
            <p className="text-[10px] text-stone-400">{content.length}/1000</p>
          </div>
        </div>

        {/* ── 届け先の村（任意） ── */}
        {myVillages.length > 0 && (
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              届け先の村 <span className="text-stone-300 normal-case font-normal">（任意）</span>
            </p>

            {/* 選択済みの村 */}
            {selectedVillage ? (
              <div
                className="flex items-center gap-3 p-3.5 rounded-2xl border-2"
                style={{ borderColor: cs.color, background: cs.bg }}
              >
                <span className="text-2xl">{selectedVillage.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: cs.color }}>
                    {selectedVillage.name}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    この村のメンバーに優先的に届きます
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVillage(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${cs.color}20` }}
                >
                  <X size={13} style={{ color: cs.color }} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowVillages(v => !v)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-dashed border-stone-200 bg-white active:bg-stone-50 transition-colors text-left"
              >
                <span className="text-xl">🏕️</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-stone-400">村を選ぶ</p>
                  <p className="text-[10px] text-stone-300">選ばない場合は全体公開のみ</p>
                </div>
                <span className="text-stone-300 text-xs">{showVillages ? '▲' : '▼'}</span>
              </button>
            )}

            {/* 村リスト */}
            {showVillages && !selectedVillage && (
              <div className="mt-2 rounded-2xl overflow-hidden border border-stone-100 divide-y divide-stone-50 shadow-sm">
                {myVillages.map(v => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVillage(v); setShowVillages(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-stone-50 active:bg-stone-100 transition-colors text-left"
                  >
                    <span className="text-xl flex-shrink-0">{v.icon}</span>
                    <p className="text-sm font-bold text-stone-800 flex-1 truncate">{v.name}</p>
                    <span className="text-[10px] text-stone-300">選ぶ →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 匿名設定 ── */}
        <div
          className="flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.99]"
          style={isAnonymous
            ? { borderColor: cs.color, background: cs.bg }
            : { borderColor: '#e7e5e4', background: '#fff' }
          }
          onClick={() => setIsAnonymous(v => !v)}
        >
          <div className="flex items-center gap-3">
            {isAnonymous
              ? <EyeOff size={18} style={{ color: cs.color }} />
              : <Eye size={18} className="text-stone-400" />
            }
            <div>
              <p className="text-sm font-bold" style={{ color: isAnonymous ? cs.color : '#44403c' }}>
                {isAnonymous ? '匿名で投稿する' : '名前を表示して投稿する'}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">
                {isAnonymous
                  ? '信頼Tierのみ表示。ニックネームは非表示。'
                  : 'プロフィールのニックネームが表示されます。'
                }
              </p>
            </div>
          </div>
          <div
            className="w-11 h-6 rounded-full transition-all flex-shrink-0"
            style={{ background: isAnonymous ? cs.color : '#d6d3d1' }}
          >
            <div
              className="w-5 h-5 bg-white rounded-full mt-0.5 transition-all shadow-sm"
              style={{ marginLeft: isAnonymous ? '22px' : '2px' }}
            />
          </div>
        </div>

        {/* ── 注意事項 ── */}
        <div className="bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3">
          <p className="text-xs text-stone-500 leading-relaxed">
            📋 <span className="font-bold">投稿のルール</span><br />
            · 個人を特定できる情報は書かないでください<br />
            · 誹謗中傷・スパムは通報対象です<br />
            · 違反投稿は通報3件でシャドーBANされます
          </p>
        </div>

        {/* ── Error ── */}
        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* ── Submit ── */}
        <button
          onClick={handleSubmit}
          disabled={title.length < 5 || content.length < 10 || submitting}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{ background: cs.gradient, boxShadow: `0 8px 24px ${cs.color}40` }}
        >
          {submitting
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <>{cs.emoji} 質問を投稿する</>
          }
        </button>
      </div>
    </div>
  )
}
