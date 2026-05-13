'use client'

// 募集カード作成シート (Phase B PR-B2)
//
// 画面下からスライドアップするボトムシート。
// 入力 5 項目 (本文 / タイプ / 上限 / 属性 / プレイスタイル) + 任意の村選択。
// 「投稿する」で village_posts に is_recruitment=true で INSERT。
// SQL 未実行時は createRecruitment() が分かりやすい toast を返すので、
// 画面が破壊されることはない。

import { useState, useEffect } from 'react'
import { X, Send, Mic, Sparkles, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  createRecruitment,
  RECRUITMENT_TYPE_LABEL,
  PLAY_STYLE_LABEL,
  type RecruitmentType,
  type PlayStyle,
} from '@/lib/recruitment'
import { detectNgWords } from '@/lib/moderation'

interface VillageOption {
  id: string
  name: string
  icon: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  userId: string
  onCreated?: () => void
}

const MAX_CONTENT = 200

export default function RecruitmentCreateSheet({ open, onClose, userId, onCreated }: Props) {
  const [content, setContent] = useState('')
  const [type, setType] = useState<RecruitmentType>('voice_play')
  const [maxParticipants, setMaxParticipants] = useState<number | null>(4)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [beginnerFriendly, setBeginnerFriendly] = useState(false)
  const [playStyle, setPlayStyle] = useState<PlayStyle | null>('casual')
  const [game, setGame] = useState('')
  const [timeText, setTimeText] = useState('')
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null)
  const [myVillages, setMyVillages] = useState<VillageOption[] | null>(null)
  const [sending, setSending] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  // シート開いた時、参加中ギルド一覧を取得 (任意項目)
  useEffect(() => {
    if (!open || myVillages !== null) return
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('village_members')
          .select('villages(id, name, icon)')
          .eq('user_id', userId)
        const rows = ((data ?? []) as any[])
          .map(r => r.villages)
          .filter((v: any) => v && v.id)
          .map((v: any) => ({ id: v.id, name: v.name ?? '無題', icon: v.icon ?? null }))
        const seen = new Set<string>()
        const uniq: VillageOption[] = []
        for (const v of rows) {
          if (seen.has(v.id)) continue
          seen.add(v.id)
          uniq.push(v)
        }
        setMyVillages(uniq)
      } catch {
        setMyVillages([])
      }
    })()
  }, [open, userId, myVillages])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function reset() {
    setContent('')
    setType('voice_play')
    setMaxParticipants(4)
    setVoiceEnabled(true)
    setBeginnerFriendly(false)
    setPlayStyle('casual')
    setGame('')
    setTimeText('')
    setSelectedVillageId(null)
    setErrMsg('')
  }

  async function handleSubmit() {
    if (sending) return
    const trimmed = content.trim()
    if (!trimmed) {
      setErrMsg('募集内容を入力してください')
      return
    }
    const ng = detectNgWords(trimmed)
    if (ng) {
      setErrMsg(`「${ng}」は使えません`)
      return
    }
    setSending(true)
    setErrMsg('')
    const supabase = createClient()
    const res = await createRecruitment(supabase, {
      userId,
      content: trimmed,
      villageId: selectedVillageId,
      recruitmentType: type,
      maxParticipants: maxParticipants,
      voiceEnabled,
      beginnerFriendly,
      playStyle,
      lfgGame: game.trim() || null,
      lfgTime: timeText.trim() || null,
    })
    setSending(false)
    if (res.ok) {
      showToast('募集を作成しました')
      reset()
      onCreated?.()
      setTimeout(onClose, 400)
    } else {
      setErrMsg(res.message)
    }
  }

  if (!open) return null

  const typeKeys: RecruitmentType[] = ['voice_play', 'beginner_friendly', 'rank', 'casual', 'other']
  const styleKeys: PlayStyle[] = ['casual', 'rank', 'fun', 'serious']

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          background: '#0E0B1F',
          borderTop: '1px solid rgba(157,92,255,0.25)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          maxHeight: '92vh',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(240,238,255,0.18)' }} />
        </div>

        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
          <p className="text-sm font-extrabold" style={{ color: '#F0EEFF' }}>
            🎮 募集を作る
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center active:bg-white/10 transition-all"
            aria-label="閉じる"
            style={{ color: 'rgba(240,238,255,0.6)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-32 space-y-4 flex-1">

          {/* 本文 */}
          <div>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: 'rgba(240,238,255,0.6)' }}>
              募集内容 <span style={{ color: '#FF6B7A' }}>*</span>
            </p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={MAX_CONTENT}
              rows={3}
              placeholder="例: APEX 一緒に遊べる方募集！プラチナ帯。ボイスありで楽しめれば OK"
              className="w-full px-3 py-2.5 rounded-xl text-sm resize-none outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(157,92,255,0.25)',
                color: '#F0EEFF',
              }}
            />
            <p className="text-right text-[10px] mt-0.5" style={{ color: 'rgba(240,238,255,0.35)' }}>
              {content.length} / {MAX_CONTENT}
            </p>
          </div>

          {/* タイプ */}
          <div>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: 'rgba(240,238,255,0.6)' }}>
              募集タイプ
            </p>
            <div className="grid grid-cols-2 gap-2">
              {typeKeys.map(k => {
                const info = RECRUITMENT_TYPE_LABEL[k]
                const selected = type === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setType(k)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-left active:scale-95 transition-all"
                    style={{
                      background: selected ? 'rgba(57,255,136,0.15)' : 'rgba(255,255,255,0.04)',
                      border: selected
                        ? '1px solid rgba(57,255,136,0.5)'
                        : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <span className="text-base">{info.emoji}</span>
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: selected ? '#9CFFC7' : 'rgba(240,238,255,0.7)' }}
                    >
                      {info.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 上限人数 */}
          <div>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: 'rgba(240,238,255,0.6)' }}>
              <Users size={11} className="inline mr-1" />
              上限人数
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {[2, 3, 4, 5, 6, 8, null].map(n => {
                const selected = maxParticipants === n
                return (
                  <button
                    key={n ?? 'unlimited'}
                    type="button"
                    onClick={() => setMaxParticipants(n)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all"
                    style={{
                      background: selected ? 'rgba(157,92,255,0.2)' : 'rgba(255,255,255,0.04)',
                      border: selected
                        ? '1px solid rgba(157,92,255,0.5)'
                        : '1px solid rgba(255,255,255,0.1)',
                      color: selected ? '#C7B4FF' : 'rgba(240,238,255,0.7)',
                    }}
                  >
                    {n === null ? '上限なし' : `${n} 人`}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 属性 (ボイス / 初心者歓迎) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVoiceEnabled(v => !v)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl active:scale-95 transition-all"
              style={{
                background: voiceEnabled ? 'rgba(255,77,144,0.15)' : 'rgba(255,255,255,0.04)',
                border: voiceEnabled
                  ? '1px solid rgba(255,77,144,0.45)'
                  : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Mic size={14} style={{ color: voiceEnabled ? '#FFA8C8' : 'rgba(240,238,255,0.4)' }} />
              <span
                className="text-[11px] font-bold"
                style={{ color: voiceEnabled ? '#FFA8C8' : 'rgba(240,238,255,0.65)' }}
              >
                ボイス参加
              </span>
            </button>
            <button
              type="button"
              onClick={() => setBeginnerFriendly(v => !v)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl active:scale-95 transition-all"
              style={{
                background: beginnerFriendly ? 'rgba(57,255,136,0.15)' : 'rgba(255,255,255,0.04)',
                border: beginnerFriendly
                  ? '1px solid rgba(57,255,136,0.45)'
                  : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Sparkles size={14} style={{ color: beginnerFriendly ? '#9CFFC7' : 'rgba(240,238,255,0.4)' }} />
              <span
                className="text-[11px] font-bold"
                style={{ color: beginnerFriendly ? '#9CFFC7' : 'rgba(240,238,255,0.65)' }}
              >
                初心者歓迎
              </span>
            </button>
          </div>

          {/* プレイスタイル */}
          <div>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: 'rgba(240,238,255,0.6)' }}>
              プレイスタイル
            </p>
            <div className="flex flex-wrap gap-2">
              {styleKeys.map(k => {
                const info = PLAY_STYLE_LABEL[k]
                const selected = playStyle === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPlayStyle(selected ? null : k)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all flex items-center gap-1"
                    style={{
                      background: selected ? 'rgba(157,92,255,0.2)' : 'rgba(255,255,255,0.04)',
                      border: selected
                        ? '1px solid rgba(157,92,255,0.5)'
                        : '1px solid rgba(255,255,255,0.1)',
                      color: selected ? '#C7B4FF' : 'rgba(240,238,255,0.7)',
                    }}
                  >
                    <span>{info.emoji}</span>
                    {info.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ゲーム名 / 時間帯 (任意) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] font-bold mb-1.5" style={{ color: 'rgba(240,238,255,0.6)' }}>
                ゲーム名 (任意)
              </p>
              <input
                value={game}
                onChange={e => setGame(e.target.value)}
                placeholder="APEX / FF14 / 原神 ..."
                maxLength={40}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(157,92,255,0.18)',
                  color: '#F0EEFF',
                }}
              />
            </div>
            <div>
              <p className="text-[11px] font-bold mb-1.5" style={{ color: 'rgba(240,238,255,0.6)' }}>
                時間帯 (任意)
              </p>
              <input
                value={timeText}
                onChange={e => setTimeText(e.target.value)}
                placeholder="今夜 22 時〜 / 週末 ..."
                maxLength={40}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(157,92,255,0.18)',
                  color: '#F0EEFF',
                }}
              />
            </div>
          </div>

          {/* ギルド選択 (任意) */}
          {myVillages && myVillages.length > 0 && (
            <div>
              <p className="text-[11px] font-bold mb-1.5" style={{ color: 'rgba(240,238,255,0.6)' }}>
                ギルドに紐付ける (任意)
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVillageId(null)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all"
                  style={{
                    background: selectedVillageId === null ? 'rgba(157,92,255,0.2)' : 'rgba(255,255,255,0.04)',
                    border: selectedVillageId === null
                      ? '1px solid rgba(157,92,255,0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                    color: selectedVillageId === null ? '#C7B4FF' : 'rgba(240,238,255,0.7)',
                  }}
                >
                  紐付けない
                </button>
                {myVillages.map(v => {
                  const selected = selectedVillageId === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVillageId(v.id)}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all flex items-center gap-1"
                      style={{
                        background: selected ? 'rgba(157,92,255,0.2)' : 'rgba(255,255,255,0.04)',
                        border: selected
                          ? '1px solid rgba(157,92,255,0.5)'
                          : '1px solid rgba(255,255,255,0.1)',
                        color: selected ? '#C7B4FF' : 'rgba(240,238,255,0.7)',
                      }}
                    >
                      <span>{v.icon ?? '🏠'}</span>
                      <span className="truncate max-w-[100px]">{v.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {errMsg && (
            <p className="text-[11px] font-semibold" style={{ color: '#FF6B7A' }}>
              {errMsg}
            </p>
          )}

          {toast && (
            <div
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-center"
              style={{
                background: 'rgba(57,255,136,0.12)',
                color: '#9CFFC7',
                border: '1px solid rgba(57,255,136,0.3)',
              }}
            >
              {toast}
            </div>
          )}
        </div>

        {/* Sticky submit */}
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{
            background: 'rgba(14,11,31,0.92)',
            borderTop: '1px solid rgba(157,92,255,0.18)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          }}
        >
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim() || sending}
            className="w-full py-3 rounded-2xl font-extrabold text-sm disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #39FF88 0%, #2dd96a 100%)',
              color: '#0a1a0f',
              boxShadow: '0 8px 24px rgba(57,255,136,0.35)',
            }}
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send size={14} /> 募集を投稿
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
