'use client'

// 全ページ上部に表示するフレンドアイコン横スクロール。
// 「フレンド」= 自分が follow しているユーザー。user_follows テーブル
// (follower_id = me, following_id = フレンド) を参照する。DB 変更なし。
//
// オンライン判定は profiles.last_seen_at が直近 5 分以内かどうかで決定。
// 既存の guilds/[id]/page.tsx と同じロジックを採用しているため挙動が
// プロジェクト全体で一貫する。
//
// マウント先: app/(app)/layout.tsx の whitelist パスのみ。
// /chat/[matchId]、/voice/[roomId]、/profile/[userId] などの詳細画面では
// 邪魔になるため非表示。

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Friend = {
  id: string
  display_name: string | null
  avatar_url: string | null
  last_seen_at: string | null
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS
}

export default function FriendAvatarRail() {
  const [friends, setFriends] = useState<Friend[] | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: rows, error: fErr } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)
      if (fErr) {
        console.error('[FriendRail] follows fetch error:', fErr)
        if (!cancelled) setFriends([])
        return
      }
      const ids = (rows ?? [])
        .map((r: any) => r.following_id)
        .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
      if (ids.length === 0) {
        if (!cancelled) setFriends([])
        return
      }

      const { data: profs, error: pErr } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, last_seen_at')
        .in('id', ids)
      if (pErr) console.error('[FriendRail] profiles fetch error:', pErr)

      // ids ベースで列を作り、profile が取れなかった分はプレースホルダーで補う
      // ことで「フォロー中 N」と一覧の件数を必ず揃える。前回 mypage で
      // 採用した方針と同じ。
      const profMap = new Map<string, Friend>(
        (profs ?? []).map((p: any) => [p.id as string, p as Friend])
      )
      const list: Friend[] = ids.map(id => profMap.get(id) ?? {
        id,
        display_name: '名無し',
        avatar_url: null,
        last_seen_at: null,
      })

      // オンラインを上に並び替え
      list.sort((a, b) => {
        const oa = isOnline(a.last_seen_at) ? 0 : 1
        const ob = isOnline(b.last_seen_at) ? 0 : 1
        if (oa !== ob) return oa - ob
        // 同じ状態内では last_seen_at の新しい順
        const ta = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0
        const tb = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0
        return tb - ta
      })

      if (!cancelled) setFriends(list)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // フォロー 0 件は丸ごと非表示 (画面のスペース節約)
  if (friends === null) {
    // 読み込み中はスケルトン (高さは確保して、後から friend rail が出てきたときに
    // 下のページが飛ばないように)
    return (
      <div
        className="sticky top-0 z-30 px-3 py-2 flex gap-2.5 overflow-x-hidden"
        style={{
          background: 'rgba(8,8,18,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 'max(8px, env(safe-area-inset-top, 8px))',
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-12 h-12 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="w-10 h-2 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        ))}
      </div>
    )
  }
  if (friends.length === 0) return null

  return (
    <div
      className="sticky top-0 z-30 flex gap-2.5 overflow-x-auto scrollbar-none"
      style={{
        background: 'rgba(8,8,18,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 'max(8px, env(safe-area-inset-top, 8px))',
        paddingBottom: '8px',
        paddingLeft: '12px',
        paddingRight: '12px',
      }}
    >
      {friends.map(f => {
        const online = isOnline(f.last_seen_at)
        return (
          <Link
            key={f.id}
            href={`/profile/${f.id}`}
            className="flex flex-col items-center gap-1 flex-shrink-0 active:scale-95 transition-transform"
            style={{ width: 56 }}
          >
            <div className="relative">
              {/* オンライン時のグロー (薄め、強すぎず) */}
              {online && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow: '0 0 0 2px #39FF88, 0 0 14px rgba(57,255,136,0.45)',
                  }}
                />
              )}
              {/* アバター本体 */}
              <div
                className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-extrabold text-white relative"
                style={{
                  background: online
                    ? 'linear-gradient(135deg, #39FF88, #27DFFF)'
                    : 'rgba(255,255,255,0.08)',
                  border: online
                    ? '2px solid #0d0b1f'
                    : '1px solid rgba(255,255,255,0.12)',
                  opacity: online ? 1 : 0.65,
                }}
              >
                {f.avatar_url ? (
                  <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{(f.display_name ?? '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
              {/* オンライン状態ドット */}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                style={{
                  background: online ? '#39FF88' : '#475569',
                  border: '2px solid #080812',
                  boxShadow: online ? '0 0 4px rgba(57,255,136,0.7)' : 'none',
                }}
              />
            </div>
            <span
              className="text-[10px] font-bold leading-tight truncate w-full text-center"
              style={{
                color: online ? 'rgba(240,238,255,0.92)' : 'rgba(240,238,255,0.45)',
                maxWidth: 56,
              }}
            >
              {f.display_name ?? '名無し'}
            </span>
          </Link>
        )
      })}

      {/* もっと見る — 既存の /users (ユーザー検索) ページに遷移して全フレンド一覧として再利用 */}
      <Link
        href="/users"
        className="flex flex-col items-center gap-1 flex-shrink-0 active:scale-95 transition-transform"
        style={{ width: 56 }}
        aria-label="すべてのフレンドを見る"
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(157,92,255,0.12)',
            border: '1.5px dashed rgba(157,92,255,0.45)',
          }}
        >
          <ChevronRight size={18} style={{ color: '#c4b5fd' }} />
        </div>
        <span
          className="text-[10px] font-bold leading-tight truncate w-full text-center"
          style={{ color: 'rgba(196,181,253,0.85)' }}
        >
          もっと見る
        </span>
      </Link>
    </div>
  )
}
