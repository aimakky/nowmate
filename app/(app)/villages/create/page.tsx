'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import { VILLAGE_TYPE_STYLES } from '@/components/ui/VillageCard'

const VILLAGE_TYPES = [
  { id: '雑談',      label: '話して、整理する村',       icon: '🌿', desc: '話すことで気持ちや考えが整理される',   category: 'tonight' },
  { id: '仕事終わり', label: '仕事後を豊かにする村',    icon: '🌙', desc: '一日を振り返り、明日につながる話を',  category: 'work'    },
  { id: '相談',      label: '経験を還元する村',         icon: '🤝', desc: '悩みを持ち込んでいい。経験者が待つ',  category: 'help'    },
  { id: '趣味',      label: '趣味で視点を広げる村',     icon: '🎨', desc: '好きから学べることを語り合う場所',    category: 'think'   },
  { id: '職業',      label: '同じ道を歩む人と話す村',   icon: '💼', desc: '仕事のリアル・キャリアを語り合う',    category: 'work'    },
  { id: '地域',      label: '暮らしをより良くする村',   icon: '📍', desc: '地元のリアルを共に育てていく場所',    category: 'life'    },
  { id: '初参加',    label: '最初の一歩を歓迎する村',   icon: '🌱', desc: 'コミュニティが初めてでも大丈夫',      category: 'start'   },
  { id: '焚き火',    label: '今日を静かに終わらせる村', icon: '🔥', desc: '話してもいい、聞いていてもいい',      category: 'tonight' },
]

const JOB_TYPE_OPTIONS = [
  { emoji: '🏥', label: '看護師・医療',     value: '看護師' },
  { emoji: '👨‍⚕️', label: '医師',            value: '医師' },
  { emoji: '💊', label: '薬剤師',            value: '薬剤師' },
  { emoji: '🏥', label: '介護・福祉',        value: '介護士' },
  { emoji: '📚', label: '教師・講師',        value: '教師' },
  { emoji: '💻', label: 'エンジニア',        value: 'エンジニア' },
  { emoji: '🎨', label: 'デザイナー',        value: 'デザイナー' },
  { emoji: '📊', label: '営業・販売',        value: '営業' },
  { emoji: '🏛️', label: '公務員',            value: '公務員' },
  { emoji: '⚖️', label: '法律・司法',        value: '法律職' },
  { emoji: '💼', label: 'コンサル・経営',    value: 'コンサル' },
  { emoji: '🏦', label: '金融・保険',        value: '金融' },
  { emoji: '🎬', label: 'クリエイター',      value: 'クリエイター' },
  { emoji: '🚀', label: '起業家・CEO',       value: '経営者' },
  { emoji: '🔄', label: '転職・求職中',      value: '転職活動中' },
]

export default function CreateVillagePage() {
  const router = useRouter()
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [type,        setType]        = useState('雑談')
  const [jobLocked,   setJobLocked]   = useState(false)
  const [jobType,     setJobType]     = useState('')
  const [creating,    setCreating]    = useState(false)

  const selectedType  = VILLAGE_TYPES.find(t => t.id === type)!
  const selectedStyle = VILLAGE_TYPE_STYLES[type] ?? VILLAGE_TYPE_STYLES['雑談']

  async function handleCreate() {
    if (!name.trim() || creating) return
    if (jobLocked && !jobType) return
    setCreating(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase.from('villages').insert({
      name:        name.trim(),
      description: description.trim(),
      type:        jobLocked ? '職業' : type,
      icon:        jobLocked ? '💼' : selectedType.icon,
      category:    jobLocked ? 'work' : selectedType.category,
      host_id:     user.id,
      job_locked:  jobLocked,
      job_type:    jobLocked ? jobType : null,
    }).select().single()

    if (data) {
      // Auto-join as host
      await supabase.from('village_members').insert({
        village_id: data.id,
        user_id:    user.id,
        role:       'host',
      })
      router.push(`/villages/${data.id}`)
    }
    setCreating(false)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500">
          <ArrowLeft size={20} />
        </button>
        <p className="font-extrabold text-stone-900">村を作る</p>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-5">

        {/* ── Live Preview ── */}
        <div className="rounded-3xl overflow-hidden shadow-md border border-white">
          {/* Gradient banner */}
          <div
            className="relative flex items-center justify-center"
            style={{ background: selectedStyle.gradient, height: 120 }}
          >
            {/* Noise */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
            />
            <div
              className="absolute top-2 left-2 text-[9px] font-bold text-white/80 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              🌱 芽吹いた村
            </div>
            <span style={{ fontSize: '2.8rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' }}>
              {selectedType.icon}
            </span>
          </div>
          {/* Info */}
          <div className="bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-extrabold text-stone-900 text-sm leading-tight">
                {name || '村の名前'}
              </p>
              <span className={`flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border ${selectedStyle.badgeBg}`}>
                {selectedStyle.label}
              </span>
            </div>
            <p className="text-xs text-stone-400 line-clamp-2">
              {description || '村の説明がここに表示されます'}
            </p>
          </div>
        </div>

        {/* ── Village Name ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            村の名前 <span className="text-rose-400">*</span>
          </p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例：夜の焚き火　仕事帰りの縁側"
            maxLength={30}
            className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-brand-400 bg-white"
          />
          <p className="text-right text-[10px] text-stone-400 mt-1">{name.length}/30</p>
        </div>

        {/* ── Description ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            村の説明
          </p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="この村でどんなことが増えてほしいか書いてください。どんな話をする場所か、来てほしい人のイメージなど。"
            maxLength={100}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm resize-none focus:outline-none focus:border-brand-400 bg-white"
          />
          <p className="text-right text-[10px] text-stone-400 mt-1">{description.length}/100</p>
        </div>

        {/* ── 職業限定トグル ── */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
            職業限定村にする
          </p>
          <button
            onClick={() => { setJobLocked(v => !v); if (!jobLocked) setType('職業') }}
            className="w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left"
            style={{ borderColor: jobLocked ? '#6366f1' : '#e7e5e4', background: jobLocked ? '#eef2ff' : '#fff' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💼</span>
              <div>
                <p className="text-sm font-extrabold" style={{ color: jobLocked ? '#4f46e5' : '#1c1917' }}>
                  職業限定村
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">同じ職業の人だけが入れる村を作る</p>
              </div>
            </div>
            <div
              className="w-10 h-6 rounded-full relative transition-all flex-shrink-0"
              style={{ background: jobLocked ? '#6366f1' : '#d6d3d1' }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                style={{ left: jobLocked ? '18px' : '2px' }}
              />
            </div>
          </button>

          {jobLocked && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">対象の職業</p>
              <div className="grid grid-cols-2 gap-2">
                {JOB_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setJobType(opt.value)}
                    className="flex items-center gap-2 p-3 rounded-2xl border-2 text-left transition-all active:scale-95"
                    style={jobType === opt.value
                      ? { borderColor: '#6366f1', background: '#eef2ff' }
                      : { borderColor: '#e7e5e4', background: '#fff' }
                    }
                  >
                    <span className="text-lg flex-shrink-0">{opt.emoji}</span>
                    <p className="text-xs font-bold truncate" style={{ color: jobType === opt.value ? '#4f46e5' : '#44403c' }}>
                      {opt.label}
                    </p>
                  </button>
                ))}
              </div>
              {!jobType && (
                <p className="text-xs text-rose-500 font-bold px-1">職業を選択してください</p>
              )}
            </div>
          )}
        </div>

        {/* ── Village Type ── */}
        {!jobLocked && (
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
            村のタイプ
          </p>
          <div className="grid grid-cols-2 gap-2">
            {VILLAGE_TYPES.map(t => {
              const ts = VILLAGE_TYPE_STYLES[t.id] ?? VILLAGE_TYPE_STYLES['雑談']
              const selected = type === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all active:scale-95"
                  style={
                    selected
                      ? { borderColor: ts.accent, background: `${ts.accent}12` }
                      : { borderColor: '#e7e5e4', background: '#fff' }
                  }
                >
                  <span className="text-xl flex-shrink-0">{t.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: selected ? ts.accent : '#44403c' }}>
                      {t.label}
                    </p>
                    <p className="text-[10px] text-stone-400 truncate">{t.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        )}

        {/* ── 村の哲学ヒント ── */}
        <div
          className="rounded-2xl px-4 py-3.5 space-y-2"
          style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: '1px solid #ddd6fe' }}
        >
          <p className="text-xs font-bold text-violet-700">✍️ 良い村の説明文とは</p>
          <div className="space-y-1.5">
            {[
              { bad: '趣味の村です',              good: '趣味を通じて視点を広げ、人生に活かせることを語り合う村' },
              { bad: '何でも話していい村',         good: '話しながら気持ちや考えが整理される、静かな場所' },
              { bad: 'ゲーム好き集まれ！',         good: 'ゲームから仕事・人間関係・思考に活かせることを語り合う' },
            ].map((ex, i) => (
              <div key={i} className="flex gap-2 text-[10px]">
                <span className="text-rose-400 font-bold flex-shrink-0">×</span>
                <span className="text-stone-400 line-through">{ex.bad}</span>
                <span className="text-violet-500 font-medium flex-shrink-0">→</span>
                <span className="text-violet-700 font-medium">{ex.good}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-violet-500 pt-1">
            🌿 村長になると、あなたが場の空気を作ります。来てほしい人に向けた言葉を書いてください。
          </p>
        </div>

        {/* ── Submit ── */}
        <button
          onClick={handleCreate}
          disabled={!name.trim() || creating || (jobLocked && !jobType)}
          className="w-full py-4 rounded-2xl font-extrabold text-base text-white disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{
            background: jobLocked ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : selectedStyle.gradient,
            boxShadow: jobLocked ? '0 8px 24px rgba(99,102,241,0.4)' : `0 8px 24px ${selectedStyle.accent}40`,
          }}
        >
          {creating
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : jobLocked ? <>💼 {jobType}限定村を作る</> : <>{selectedType.icon} 村を作る</>}
        </button>
      </div>
    </div>
  )
}
