'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const MISSIONS = [
  { day: 1, key: 'join_village',       icon: '🏕️', title: '村に参加する',         hint: '気になる村に入ってみよう' },
  { day: 2, key: 'post_opinion',       icon: '✏️', title: '考えを1つ出す',         hint: '村に投稿してみよう' },
  { day: 3, key: 'reply_someone',      icon: '💬', title: '誰かに返す',             hint: '共感・返信してみよう' },
  { day: 4, key: 'answer_qa',          icon: '🤝', title: '相談に答える',           hint: '相談広場で1件回答しよう' },
  { day: 5, key: 'join_voice',         icon: '🎙️', title: '通話に参加する',         hint: '声でつながってみよう' },
  { day: 6, key: 'write_tweet',        icon: '💡', title: '今日の気づきを書く',     hint: 'タイムラインに投稿しよう' },
  { day: 7, key: 'learn_from_someone', icon: '📖', title: '誰かから学ぶ',           hint: 'この人から学ぶ を押してみよう' },
]

type Mission = {
  id: string
  day: number
  mission_key: string
  completed_at: string | null
}

export default function MissionsCard({ userId }: { userId: string }) {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // ミッションを取得。なければ初期化してから再取得
      let { data } = await supabase
        .from('user_missions')
        .select('*')
        .eq('user_id', userId)
        .order('day')

      if (!data || data.length === 0) {
        await supabase.rpc('initialize_user_missions', { p_user_id: userId })
        const res = await supabase
          .from('user_missions')
          .select('*')
          .eq('user_id', userId)
          .order('day')
        data = res.data
      }

      // 完了チェックを自動実行
      await supabase.rpc('check_and_complete_missions', { p_user_id: userId })

      // 再取得（チェック後）
      const { data: updated } = await supabase
        .from('user_missions')
        .select('*')
        .eq('user_id', userId)
        .order('day')

      setMissions((updated || data || []) as Mission[])
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return (
    <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm animate-pulse">
      <div className="h-4 bg-stone-100 rounded w-1/2 mb-3" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-stone-50 rounded-xl" />
        ))}
      </div>
    </div>
  )

  const completedCount = missions.filter(m => m.completed_at).length
  const pct = Math.round((completedCount / 7) * 100)
  const allDone = completedCount === 7
  const visibleMissions = expanded ? MISSIONS : MISSIONS.slice(0, 4)

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-stone-100">
      {/* Header */}
      <div
        className="px-4 py-3.5 flex items-center justify-between"
        style={{ background: allDone
          ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
          : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base">{allDone ? '🎉' : '🗓️'}</span>
            <p className="text-xs font-bold text-white">
              {allDone ? '7日間ミッション完了！' : '7日間チャレンジ'}
            </p>
          </div>
          <p className="text-white/60 text-[10px]">
            {allDone
              ? 'あなたは VILLIA の住人になりました'
              : `使うたびに、何かが増える — ${completedCount}/7 完了`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white font-extrabold text-xl leading-none">{pct}%</p>
          <p className="text-white/50 text-[10px]">達成</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-stone-100">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: allDone
              ? 'linear-gradient(90deg, #059669, #34d399)'
              : 'linear-gradient(90deg, #4f46e5, #7c3aed)',
          }}
        />
      </div>

      {/* Mission list */}
      <div className="bg-white divide-y divide-stone-50">
        {visibleMissions.map(m => {
          const record = missions.find(r => r.day === m.day)
          const done = !!record?.completed_at
          return (
            <div
              key={m.day}
              className="flex items-center gap-3 px-4 py-3"
            >
              {/* Day number */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0"
                style={done
                  ? { background: '#4f46e5', color: '#fff' }
                  : { background: '#f5f5f4', color: '#a8a29e' }}
              >
                {done ? '✓' : m.day}
              </div>

              {/* Icon + text */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-base flex-shrink-0" style={{ opacity: done ? 1 : 0.5 }}>
                  {m.icon}
                </span>
                <div className="min-w-0">
                  <p
                    className="text-xs font-bold truncate"
                    style={{ color: done ? '#1c1917' : '#a8a29e', textDecoration: done ? 'none' : 'none' }}
                  >
                    {m.title}
                  </p>
                  {!done && (
                    <p className="text-[10px] text-stone-400 truncate">{m.hint}</p>
                  )}
                  {done && record?.completed_at && (
                    <p className="text-[10px] text-emerald-500">
                      達成！
                    </p>
                  )}
                </div>
              </div>

              {/* Status chip */}
              <div
                className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={done
                  ? { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }
                  : { background: '#fafaf9', color: '#d4d0cc', border: '1px solid #e7e5e4' }}
              >
                {done ? '✓ 完了' : '未'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Expand toggle */}
      {!allDone && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full py-2.5 text-center text-[11px] font-bold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition-colors"
        >
          {expanded ? '閉じる ↑' : `残り${7 - completedCount}つを見る ↓`}
        </button>
      )}
    </div>
  )
}
