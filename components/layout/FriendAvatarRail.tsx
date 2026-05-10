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
import { lastSeenLabelJP } from '@/lib/utils'
import { getUserDisplayName, getAvatarInitial } from '@/lib/user-display'

type Friend = {
  id: string
  display_name: string | null
  avatar_url: string | null
  last_seen_at: string | null
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000

// 2026-05-09 マッキーさん指示「下部ナビ切替時にページが一瞬下にズレるバグ修正」対応。
// 3 状態 (loading / empty / loaded) で高さが揃わず、
// 特に empty 状態で `return null` していたためページ切替時に rail が急に
// 0px に潰れてコンテンツが上にジャンプする現象を起こしていた。
// 全 3 状態で同じ高さを minHeight で確保する。
//
// 2026-05-10 (rev2): RAIL_MIN_HEIGHT を 80 → 100 に引き上げ。
// 旧 80px は loaded 状態の自然高 (~95px = avatar 48 + gap 4 + name 12 + gap 4
// + 最終ログイン 11 + py-2 16) を下回っており、
// skeleton (76 → minHeight 80 が勝つ) → loaded (95) で 15px ジャンプが
// 残っていた (= マッキーさん「まだずれます」報告の原因)。
// 100 に引き上げることで loaded 95 < 100 となり、3 状態すべて 100px に揃う。
const RAIL_MIN_HEIGHT = 100 // px - loaded 自然高 ~95 を上回る安全マージン

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

  // ── 表示ルール ──────────────────────────────────────────────────
  // 本 component は AppLayout の「2 段目」として呼ばれる前提に変更。
  // sticky / 背景 / safe-area-top は親 (AppLayout sticky wrapper) が制御
  // するため、ここではロジック (data fetch + 横スクロール表示) だけに専念。
  // 旧版は自身も sticky + paddingLeft 80 (= 1 段目アイコンを横に避ける)
  // を持っており、結果的に 1 段目と 2 段目が同じ行に重なって見える原因
  // だった。親の sticky wrapper 内で「縦に並ぶ別の行」として描画される
  // ことで参考画像のような明確な 2 段構成を実現する。

  // 2026-05-09 マッキーさん指示「下部ナビ切替時にページが一瞬下にズレるバグ修正」対応。
  // 旧仕様: friends === null は skeleton (~76px)、friends.length === 0 は return null (0px)。
  //          ページ切替直後は loading → empty に状態が遷移しコンテンツが ~76px 上にジャンプ。
  // 新仕様: 3 状態すべてで minHeight: RAIL_MIN_HEIGHT (80px) を確保。
  //          - loading: 既存スケルトン (高さ揃え)
  //          - empty (friends.length === 0): 「フレンドを増やそう」CTA を 1 個表示して高さ確保
  //          - loaded: 既存横スクロール表示 (loaded 側にも minHeight 適用、4px ズレ解消)
  if (friends === null) {
    return (
      <div
        className="py-2 flex gap-2.5 overflow-x-hidden"
        style={{
          paddingLeft: 12,
          paddingRight: 12,
          minHeight: RAIL_MIN_HEIGHT,
        }}
      >
        {/* 2026-05-10: skeleton item を 2 段 placeholder に変更。
            旧: avatar + 1 段 (h-2)。loaded item (avatar + name 12 + status 11) との
                高さ差 ~16px が skeleton→loaded ジャンプの原因。
            新: avatar + name placeholder + status placeholder。loaded と同じ縦構造。 */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-12 h-12 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="w-10 h-3 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <div className="w-8 h-2.5 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        ))}
      </div>
    )
  }
  // フォロー 0 件: 高さを RAIL_MIN_HEIGHT で確保しつつ、フレンド追加 CTA を 1 個表示
  if (friends.length === 0) {
    return (
      <div
        className="py-2 flex gap-2.5 overflow-x-hidden items-center"
        style={{
          paddingLeft: 12,
          paddingRight: 12,
          minHeight: RAIL_MIN_HEIGHT,
        }}
      >
        <Link
          href="/users"
          className="flex flex-col items-center gap-1 flex-shrink-0 active:scale-95 transition-transform"
          style={{ width: 56 }}
          aria-label="フレンドを探す"
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(157,92,255,0.12)',
              border: '1.5px dashed rgba(157,92,255,0.45)',
            }}
          >
            <Users size={18} style={{ color: '#c4b5fd' }} />
          </div>
          <span
            className="text-[10px] font-bold leading-tight truncate w-full text-center"
            style={{ color: 'rgba(196,181,253,0.85)' }}
          >
            フレンド
          </span>
        </Link>
        <span
          className="text-[11px] font-bold"
          style={{ color: 'rgba(240,238,255,0.45)' }}
        >
          フレンドを探そう
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex gap-2.5 overflow-x-auto scrollbar-none"
      style={{
        paddingTop: '8px',
        paddingBottom: '8px',
        paddingLeft: 12,
        paddingRight: 12,
        minHeight: RAIL_MIN_HEIGHT,
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
                  <span>{getAvatarInitial(f)}</span>
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
              {getUserDisplayName(f)}
            </span>
            {/* オンライン中 / 最終ログイン時間。1 行 truncate でセル幅 56px に
                収める。last_seen_at が null の場合は「不明」と短く表示し、
                行が空欄になって「何も書いてない」状態を回避する。 */}
            <span
              className="text-[9px] leading-tight truncate w-full text-center"
              style={{
                color: online ? '#39FF88' : 'rgba(240,238,255,0.32)',
                maxWidth: 56,
              }}
            >
              {online ? 'オンライン中' : (lastSeenLabelJP(f.last_seen_at) ?? '不明')}
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
