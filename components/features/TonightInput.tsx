'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send } from 'lucide-react'

interface Props {
  userId: string | null
  onPosted?: () => void
}

export default function TonightInput({ userId, onPosted }: Props) {
  const [text,      setText]      = useState('')
  const [posting,   setPosting]   = useState(false)
  const [posted,    setPosted]    = useState(false)
  const [onlineCount, setOnlineCount] = useState<number | null>(null)
  const [hour, setHour] = useState(new Date().getHours())

  // 今夜いる人数（過去3時間以内に投稿したユーザー数）
  useEffect(() => {
    async function fetchCount() {
      const supabase = createClient()
      const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('tweets')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', since)
      setOnlineCount(count ?? 0)
    }
    fetchCount()
    setHour(new Date().getHours())
  }, [])

  const isEvening = hour >= 18 || hour < 4

  async function handlePost() {
    if (!text.trim() || !userId || posting) return
    setPosting(true)
    const supabase = createClient()
    await supabase.from('tweets').insert({
      user_id: userId,
      content: text.trim(),
      country: 'JP',
    })
    setText('')
    setPosted(true)
    setPosting(false)
    onPosted?.()
    setTimeout(() => setPosted(false), 3000)
  }

  if (!isEvening) {
    // 昼間は軽量バージョン
    return (
      <div className="mx-4 mb-3">
        <div className="bg-white border border-stone-100 rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">☀️</span>
            <p className="text-xs font-bold text-stone-600">今日はどんな日でしたか？</p>
            {onlineCount !== null && onlineCount > 0 && (
              <span className="ml-auto text-[10px] text-stone-400">🟢 {onlineCount}人がここにいます</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handlePost()}
              placeholder="一言だけ書いてみる…"
              className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-300 placeholder:text-stone-300"
              disabled={!userId}
            />
            <button
              onClick={handlePost}
              disabled={!text.trim() || posting || !userId}
              className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all flex-shrink-0"
            >
              {posting
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send size={14} className="text-white" />
              }
            </button>
          </div>
          {posted && (
            <p className="text-[11px] text-brand-500 font-bold mt-1.5">✓ 投稿しました</p>
          )}
        </div>
      </div>
    )
  }

  // 夜（18時〜）はメインバージョン
  return (
    <div className="mx-4 mb-3">
      <div className="rounded-2xl overflow-hidden shadow-sm"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #312e81 100%)', border: '1px solid rgba(99,102,241,0.3)' }}>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🌙</span>
              <p className="text-xs font-bold text-white">今夜どうだった？</p>
            </div>
            {onlineCount !== null && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-[10px] text-white/50 font-medium">{onlineCount}人がここにいます</span>
              </div>
            )}
          </div>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.metaKey && handlePost()}
            placeholder={userId ? '一言だけでいい。今日のことを書いてみる…' : 'ログインすると書けます'}
            rows={2}
            className="w-full text-sm bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 resize-none"
            disabled={!userId}
          />

          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-white/30">Cmd+Enter または送信ボタンで投稿</p>
            <button
              onClick={handlePost}
              disabled={!text.trim() || posting || !userId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-30 active:scale-95 transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              {posting
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Send size={12} /> 送る</>
              }
            </button>
          </div>
        </div>

        {posted && (
          <div className="px-4 pb-3">
            <div className="bg-green-500/20 border border-green-400/30 rounded-xl px-3 py-2">
              <p className="text-xs font-bold text-green-300">✓ 送りました。誰かが受け取ります。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
