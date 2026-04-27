'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mic, Users, Radio } from 'lucide-react'
import Header from '@/components/layout/Header'

const CATEGORIES = ['雑談', '夜話', '相談', '悩み', '笑い', '趣味']

const CAT_EMOJI: Record<string, string> = {
  '雑談': '💬', '夜話': '🌙', '相談': '🤝', '悩み': '💭', '笑い': '😂', '趣味': '🎵'
}

interface Room {
  id: string
  title: string
  category: string
  is_open: boolean
  status: string
  created_at: string
  host_id: string
  agenda?: string | null
  profiles: { display_name: string; nationality: string; avatar_url: string | null }
  voice_participants: { user_id: string; is_listener: boolean }[]
}

export default function VoicePage() {
  const router = useRouter()
  const [tab, setTab] = useState<'follow' | 'open'>('open')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle,   setNewTitle]   = useState('')
  const [newCat,     setNewCat]     = useState('雑談')
  const [newIsOpen,  setNewIsOpen]  = useState(true)
  const [newAgenda,  setNewAgenda]  = useState('')
  const [creating,   setCreating]   = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('voice_rooms')
      .select('*, profiles(display_name, nationality, avatar_url), voice_participants(user_id, is_listener)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setRooms((data || []) as Room[])
    setLoading(false)
  }, [])

  const fetchFollowing = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId)
    setFollowingIds(new Set((data || []).map((f: any) => f.following_id)))
  }, [userId])

  useEffect(() => { fetchRooms() }, [fetchRooms])
  useEffect(() => { fetchFollowing() }, [fetchFollowing])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('voice_rooms_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_participants' }, fetchRooms)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_rooms' }, fetchRooms)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchRooms])

  async function handleCreate() {
    if (!userId || !newTitle.trim() || creating) return
    setCreating(true)
    const supabase = createClient()
    const { data } = await supabase.from('voice_rooms').insert({
      host_id:  userId,
      title:    newTitle.trim(),
      category: newCat,
      is_open:  newIsOpen,
      ...(newAgenda.trim() ? { agenda: newAgenda.trim() } : {}),
    }).select().single()
    if (data) {
      await supabase.from('voice_participants').insert({ room_id: data.id, user_id: userId })
      setShowCreate(false)
      setNewTitle('')
      setNewAgenda('')
      router.push(`/voice/${data.id}`)
    }
    setCreating(false)
  }

  const displayed = rooms.filter(r =>
    tab === 'open' ? r.is_open : followingIds.has(r.host_id) || r.host_id === userId
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9]">
      <Header title="通話" />

      {/* フォロー中 / すべて タブ */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          <button onClick={() => setTab('follow')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'follow' ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-500'
            }`}>
            👥 フォロー中
          </button>
          <button onClick={() => setTab('open')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'open' ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-500'
            }`}>
            🎙️ すべての通話
          </button>
        </div>
      </div>

      {/* ルーム一覧 */}
      <div className="px-4 pb-28 space-y-3 pt-2">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 animate-pulse h-24" />
          ))
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🎙️</div>
            <p className="font-bold text-stone-700">
              {tab === 'follow' ? 'フォロー中の人の通話はまだありません' : '今は通話ルームがありません'}
            </p>
            <p className="text-sm text-stone-400 mt-1.5 mb-5">最初のルームを開いてみましょう！</p>
            <button onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-bold shadow-sm">
              🎙️ 通話を始める
            </button>
          </div>
        ) : (
          displayed.map(room => {
            const speakers  = room.voice_participants?.filter(p => !p.is_listener) || []
            const listeners = room.voice_participants?.filter(p =>  p.is_listener) || []
            const total     = room.voice_participants?.length || 0
            return (
              <div key={room.id}
                onClick={() => router.push(`/voice/${room.id}`)}
                className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.99] transition-all hover:shadow-md">

                {/* ヘッダー */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CAT_EMOJI[room.category] ?? '✨'}</span>
                    <div>
                      <p className="font-extrabold text-stone-900 text-sm leading-snug">{room.title}</p>
                      <p className="text-xs text-stone-400">{room.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-red-50 border border-red-100 px-2 py-1 rounded-full flex-shrink-0">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-red-600">LIVE</span>
                  </div>
                </div>

                {/* アジェンダ */}
                {room.agenda && (
                  <div className="flex items-start gap-1.5 bg-indigo-50 border border-indigo-100 rounded-xl px-2.5 py-2 mb-2">
                    <span className="text-xs flex-shrink-0">📋</span>
                    <p className="text-[11px] text-indigo-700 font-medium leading-relaxed line-clamp-2">{room.agenda}</p>
                  </div>
                )}

                {/* フッター */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500 font-medium">{room.profiles?.display_name}</span>
                    {!room.is_open && (
                      <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full font-semibold">フォロワー限定</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {listeners.length > 0 && (
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <Radio size={10} /> {listeners.length}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs font-semibold text-stone-600">
                      <Users size={12} /> {total}
                    </span>
                    <span className="text-xs font-bold px-3 py-1.5 bg-brand-500 text-white rounded-xl">
                      参加 →
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* フローティングボタン */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-200 hover:bg-brand-600 active:scale-90 transition-all z-30">
        <Mic size={22} className="text-white" />
      </button>

      {/* ルーム作成モーダル */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <h3 className="font-extrabold text-stone-900 text-lg mb-4">🎙️ 通話ルームを作る</h3>

            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="タイトル… 例：今日しんどかった話・趣味の話"
              className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-brand-400 mb-3"
              autoFocus
            />

            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
              アジェンダ <span className="normal-case font-normal text-stone-300">（任意・今日話したいこと）</span>
            </p>
            <textarea
              value={newAgenda}
              onChange={e => setNewAgenda(e.target.value.slice(0, 120))}
              placeholder="例：最近モヤモヤしてること、誰かと話し合いたい"
              rows={2}
              className="w-full px-4 py-2.5 rounded-2xl border-2 border-stone-200 text-sm resize-none focus:outline-none focus:border-brand-400 mb-4"
            />

            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">カテゴリ</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setNewCat(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    newCat === c ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-stone-200 text-stone-600'
                  }`}>
                  {CAT_EMOJI[c]} {c}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-5">
              <button onClick={() => setNewIsOpen(true)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  newIsOpen ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-stone-200 text-stone-600'
                }`}>
                🌏 全員に公開
              </button>
              <button onClick={() => setNewIsOpen(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  !newIsOpen ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-stone-200 text-stone-600'
                }`}>
                👥 フォロワーのみ
              </button>
            </div>

            <button onClick={handleCreate} disabled={!newTitle.trim() || creating}
              className="w-full py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base disabled:opacity-40 shadow-lg shadow-brand-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              {creating
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Mic size={18} /> ルームを開く</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
