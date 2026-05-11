'use client'

// ─── いいねしたユーザー一覧シート ──────────────────────────────
//
// 2026-05-10 マッキーさん指示「いいねを押した人が全員見れる仕組み」を実装。
//
// 仕様:
//   - 投稿カードの ❤️ count をタップして開くボトムシート
//   - tweet_reactions / village_reactions から reactor 一覧を取得
//   - profiles と別 query で結合 (PostgREST embed 禁止)
//   - likes.created_at DESC で並び替え
//   - ユーザー行タップ → /mypage (自分) or /profile/[userId] (他人)
//   - localStorage self-like を merge (RLS で隠れた自分の like も表示)
//
// CLAUDE.md「投稿者情報の混同防止」準拠:
//   表示するのは tweet_reactions.user_id (= いいね押した人) であり
//   tweets.user_id (= 元投稿者) ではない。両者を絶対に混同しない。

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSelfLikes } from '@/lib/self-likes'
import Avatar from '@/components/ui/Avatar'
import { getUserDisplayName } from '@/lib/user-display'
import { X } from 'lucide-react'

export type LikedUsersPostType = 'tweet' | 'village'

interface ReactorRow {
  user_id: string
  created_at: string | null
  profile: {
    id: string
    display_name: string | null
    avatar_url: string | null
    nowjp_id: string | null
  } | null
}

interface Props {
  open: boolean
  onClose: () => void
  postId: string
  postType: LikedUsersPostType
  currentUserId: string | null
}

export default function LikedUsersSheet({ open, onClose, postId, postType, currentUserId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reactors, setReactors] = useState<ReactorRow[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const table = postType === 'tweet' ? 'tweet_reactions' : 'village_reactions'
        const fkColumn = postType === 'tweet' ? 'tweet_id' : 'post_id'

        // 1. 投稿への全 reaction 行を取得 (RLS で見える範囲)
        // .eq('tweet_id', X) パターンは CLAUDE.md ノート上「self-like も含めて返る」経路
        const { data: rxRows, error: rxErr } = await supabase
          .from(table)
          .select('user_id, created_at')
          .eq(fkColumn, postId)
          .order('created_at', { ascending: false })
        if (rxErr) throw rxErr

        // 2. user_id ベースで dedup (同じ user が複数 reaction 種類を持つケース防御)
        const seen = new Set<string>()
        const uniqRows: { user_id: string; created_at: string | null }[] = []
        for (const r of ((rxRows ?? []) as any[])) {
          if (!r.user_id || seen.has(r.user_id)) continue
          seen.add(r.user_id)
          uniqRows.push({ user_id: r.user_id, created_at: r.created_at ?? null })
        }

        // 3. localStorage の self-like を merge (RLS で隠れた自分の like を補完)
        if (currentUserId) {
          const lsTable = postType === 'tweet' ? 'tweet' : 'village'
          const lsMap = getSelfLikes(currentUserId, lsTable)
          const lsAt = lsMap.get(postId)
          if (lsAt && !seen.has(currentUserId)) {
            seen.add(currentUserId)
            uniqRows.push({ user_id: currentUserId, created_at: lsAt })
          }
        }

        if (cancelled) return

        if (uniqRows.length === 0) {
          setReactors([])
          setLoading(false)
          return
        }

        // 4. profiles を別 query で取得 (PostgREST embed 禁止 / CLAUDE.md 準拠)
        const userIds = uniqRows.map(r => r.user_id)
        const { data: profRows, error: profErr } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, nowjp_id')
          .in('id', userIds)
        if (profErr) throw profErr

        const profMap = new Map<string, any>()
        for (const p of ((profRows ?? []) as any[])) profMap.set(p.id, p)

        // 5. likes.created_at DESC で並び替え
        const merged: ReactorRow[] = uniqRows.map(r => ({
          user_id: r.user_id,
          created_at: r.created_at,
          profile: profMap.get(r.user_id) ?? null,
        }))
        merged.sort((a, b) => {
          const ta = new Date(a.created_at ?? 0).getTime()
          const tb = new Date(b.created_at ?? 0).getTime()
          return tb - ta
        })

        if (cancelled) return
        setReactors(merged)
        setLoading(false)
      } catch (e: any) {
        if (cancelled) return
        console.error('[LikedUsersSheet] load error:', e)
        setError(e?.message ?? 'unknown error')
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, postId, postType, currentUserId])

  if (!open) return null

  function handleUserTap(userId: string) {
    onClose()
    if (userId === currentUserId) {
      router.push('/mypage')
    } else {
      router.push(`/profile/${userId}`)
    }
  }

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[90]"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      />
      {/* bottom sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[91] rounded-t-2xl"
        style={{
          background: '#0d0b1f',
          borderTop: '1px solid rgba(157,92,255,0.25)',
          maxHeight: '75vh',
          paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)',
        }}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(234,242,255,0.2)' }} />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-extrabold" style={{ color: '#F0EEFF' }}>
            いいねしたユーザー
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center active:bg-white/5"
            style={{ color: 'rgba(240,238,255,0.5)' }}
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 80px)' }}>
          {loading && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'rgba(240,238,255,0.5)' }}>
              読み込み中...
            </div>
          )}
          {!loading && error && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: '#FF7D7D' }}>
              いいねしたユーザーを取得できませんでした
            </div>
          )}
          {!loading && !error && reactors.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-3xl mb-2">❤️</p>
              <p className="text-sm font-bold" style={{ color: 'rgba(240,238,255,0.55)' }}>
                まだいいねはありません
              </p>
            </div>
          )}
          {!loading && !error && reactors.length > 0 && (
            <ul className="px-2 pb-3">
              {reactors.map(r => {
                const name = getUserDisplayName(r.profile)
                return (
                  <li key={r.user_id}>
                    <button
                      type="button"
                      onClick={() => handleUserTap(r.user_id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-white/5 transition-colors"
                    >
                      <Avatar src={r.profile?.avatar_url} name={name} size="sm" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-bold truncate" style={{ color: '#F0EEFF' }}>
                          {name}
                          {r.user_id === currentUserId && (
                            <span className="ml-2 text-[10px] font-medium" style={{ color: 'rgba(240,238,255,0.4)' }}>
                              (あなた)
                            </span>
                          )}
                        </p>
                        {r.profile?.nowjp_id && (
                          <p className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(240,238,255,0.4)' }}>
                            #{r.profile.nowjp_id}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
