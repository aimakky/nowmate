'use client'

// /users — ユーザー検索ページ（Phase 1）
// 既存テーブルだけで動く：
//  - profiles (display_name / bio / VILLIA_id を ilike 検索)
//  - user_follows (フォロー状態の取得・トグル)
//  - matches    (フレンド申請＝is_request,request_status の既存仕様に合わせる)
// startDM() を再利用してフレンド申請（=DM 開始）を作成。dm_privacy に応じて
// 自動で is_request: true/false を切り替える既存ロジックがそのまま使われる。

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Users, Check, UserPlus, Mail, X, Headphones } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { startDM } from '@/lib/dm'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import { lastSeenLabelJP } from '@/lib/utils'

// フレンド一覧用 (FriendRail の「もっと見る」遷移先)。/users は元々ユーザー
// 検索画面なので、検索結果の上に「あなたのフレンド」セクションを追加して
// 全フレンド一覧を兼ねる。フレンド = 自分が follow しているユーザー。
type FriendRow = {
  id: string
  display_name: string | null
  avatar_url: string | null
  VILLIA_id: string | null
  age_verified: boolean | null
  last_seen_at: string | null
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000
function isOnline(last: string | null): boolean {
  if (!last) return false
  return Date.now() - new Date(last).getTime() < ONLINE_WINDOW_MS
}

interface UserResult {
  id:           string
  display_name: string | null
  avatar_url:   string | null
  bio:          string | null
  VILLIA_id:    string | null
  age_verified?: boolean | null
  followState:  'none' | 'following'
  friendState:  'none' | 'sent' | 'received' | 'friends'
  matchId?:     string
}

export default function UsersPage() {
  const router = useRouter()
  const [me,        setMe]        = useState<string | null>(null)
  const [keyword,   setKeyword]   = useState('')
  const [results,   setResults]   = useState<UserResult[]>([])
  const [loading,   setLoading]   = useState(true)
  const [busyMap,   setBusyMap]   = useState<Record<string, boolean>>({})
  const [errorMap,  setErrorMap]  = useState<Record<string, string>>({})
  const [friends,   setFriends]   = useState<FriendRow[] | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 認証チェック
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setMe(user.id)
      else router.push('/login')
    })
  }, [router])

  const fetchResults = useCallback(async (kw: string) => {
    if (!me) return
    setLoading(true)
    const supabase = createClient()

    // 入力サニタイズ：% _ , \ ( ) は ilike / .or 構文を壊すので除去
    const sanitized = kw.trim().replace(/[%_,\\()]/g, '')

    let q = supabase
      .from('profiles')
      .select('id, display_name, avatar_url, bio, VILLIA_id, age_verified')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(40)

    if (sanitized) {
      q = q.or(
        `display_name.ilike.%${sanitized}%,bio.ilike.%${sanitized}%,VILLIA_id.ilike.%${sanitized}%`
      )
    }

    const { data: profilesData, error } = await q
    if (error) {
      console.error('[users] search error:', error)
      setResults([])
      setLoading(false)
      return
    }

    const ids = (profilesData ?? []).map((p: any) => p.id)
    if (ids.length === 0) {
      setResults([])
      setLoading(false)
      return
    }

    // 自分のフォロー状態 + 自分が関与する matches を並列取得
    const [followRes, matchRes] = await Promise.all([
      supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', me)
        .in('following_id', ids),
      supabase
        .from('matches')
        .select('id, user1_id, user2_id, is_request, request_status')
        .or(`user1_id.eq.${me},user2_id.eq.${me}`)
        .not('request_status', 'eq', 'declined'),
    ])

    if (followRes.error) console.error('[users] follow fetch error:', followRes.error)
    if (matchRes.error)  console.error('[users] match fetch error:',  matchRes.error)

    const followingSet = new Set((followRes.data ?? []).map((f: any) => f.following_id))

    // 受信者は user2_id 基準（chat/page.tsx:97 と同じロジック）
    const matchByOther = new Map<
      string,
      { id: string; iAmReceiver: boolean; status: string; isRequest: boolean }
    >()
    for (const m of (matchRes.data ?? []) as any[]) {
      const other = m.user1_id === me ? m.user2_id : m.user1_id
      matchByOther.set(other, {
        id:         m.id,
        iAmReceiver: m.user2_id === me,
        status:      m.request_status,
        isRequest:   m.is_request,
      })
    }

    const enriched: UserResult[] = (profilesData ?? []).map((p: any) => {
      let friendState: UserResult['friendState'] = 'none'
      let matchId: string | undefined
      const m = matchByOther.get(p.id)
      if (m) {
        matchId = m.id
        if (m.status === 'accepted') {
          friendState = 'friends'
        } else if (m.status === 'pending') {
          friendState = m.iAmReceiver ? 'received' : 'sent'
        }
      }
      return {
        id:           p.id,
        display_name: p.display_name,
        avatar_url:   p.avatar_url,
        bio:          p.bio,
        VILLIA_id:    p.VILLIA_id,
        age_verified: (p as { age_verified?: boolean | null }).age_verified ?? null,
        followState:  followingSet.has(p.id) ? 'following' : 'none',
        friendState,
        matchId,
      }
    })

    setResults(enriched)
    setLoading(false)
  }, [me])

  // デバウンス検索（入力 300ms 後に発火）
  useEffect(() => {
    if (!me) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchResults(keyword), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [me, keyword, fetchResults])

  // フレンド一覧 (= 自分が follow しているユーザー) の取得。
  // FriendAvatarRail と同じ user_follows → profiles の 2 段 fetch + 部分欠落
  // 時のプレースホルダー保証パターン。オンライン上→オフラインは last_seen
  // 降順で並べる。
  useEffect(() => {
    if (!me) return
    let cancelled = false
    async function loadFriends() {
      const supabase = createClient()
      const { data: rows, error: fErr } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', me)
      if (fErr) {
        console.error('[users] friends fetch error:', fErr)
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
        .select('id, display_name, avatar_url, VILLIA_id, age_verified, last_seen_at')
        .in('id', ids)
      if (pErr) console.error('[users] friend profiles fetch error:', pErr, { ids })
      const profMap = new Map<string, FriendRow>(
        (profs ?? []).map((p: any) => [p.id as string, p as FriendRow])
      )
      const list: FriendRow[] = ids.map(id => profMap.get(id) ?? {
        id,
        display_name: '名無し',
        avatar_url: null,
        VILLIA_id: null,
        age_verified: null,
        last_seen_at: null,
      })
      // オンライン上、その内で last_seen 新しい順
      list.sort((a, b) => {
        const oa = isOnline(a.last_seen_at) ? 0 : 1
        const ob = isOnline(b.last_seen_at) ? 0 : 1
        if (oa !== ob) return oa - ob
        const ta = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0
        const tb = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0
        return tb - ta
      })
      if (!cancelled) setFriends(list)
    }
    loadFriends()
    return () => { cancelled = true }
  }, [me])

  async function toggleFollow(otherId: string) {
    if (!me || busyMap[otherId]) return
    setBusyMap(b => ({ ...b, [otherId]: true }))
    setErrorMap(e => ({ ...e, [otherId]: '' }))
    const supabase = createClient()
    const cur = results.find(r => r.id === otherId)
    if (!cur) {
      setBusyMap(b => ({ ...b, [otherId]: false }))
      return
    }

    if (cur.followState === 'following') {
      const { error } = await supabase
        .from('user_follows').delete()
        .eq('follower_id', me).eq('following_id', otherId)
      if (error) {
        console.error('[users] unfollow error:', error)
        setErrorMap(e => ({ ...e, [otherId]: 'フォロー解除に失敗' }))
      } else {
        setResults(prev => prev.map(r => r.id === otherId ? { ...r, followState: 'none' } : r))
      }
    } else {
      const { error } = await supabase
        .from('user_follows')
        .insert({ follower_id: me, following_id: otherId })
      if (error) {
        console.error('[users] follow error:', error)
        setErrorMap(e => ({ ...e, [otherId]: 'フォロー失敗' }))
      } else {
        setResults(prev => prev.map(r => r.id === otherId ? { ...r, followState: 'following' } : r))
      }
    }
    setBusyMap(b => ({ ...b, [otherId]: false }))
  }

  // 申請 / 承認の単一ハンドラ
  async function sendOrAcceptFriend(otherId: string) {
    if (!me || busyMap[otherId]) return
    const cur = results.find(r => r.id === otherId)
    if (!cur) return
    setBusyMap(b => ({ ...b, [otherId]: true }))
    setErrorMap(e => ({ ...e, [otherId]: '' }))

    if (cur.friendState === 'received' && cur.matchId) {
      // 承認：chat/page.tsx:132 と完全一致のロジック
      const supabase = createClient()
      const { error } = await supabase
        .from('matches')
        .update({ is_request: false, request_status: 'accepted' })
        .eq('id', cur.matchId)
      if (error) {
        console.error('[users] accept error:', error)
        setErrorMap(e => ({ ...e, [otherId]: '承認に失敗' }))
      } else {
        setResults(prev => prev.map(r => r.id === otherId ? { ...r, friendState: 'friends' } : r))
      }
    } else if (cur.friendState === 'none') {
      // 申請：既存の startDM() を再利用（dm_privacy に応じた is_request 振り分け）
      const result = await startDM(me, otherId)
      if (result.status === 'request') {
        setResults(prev => prev.map(r => r.id === otherId
          ? { ...r, friendState: 'sent', matchId: result.matchId } : r))
      } else if (result.status === 'ok' || result.status === 'exists') {
        setResults(prev => prev.map(r => r.id === otherId
          ? { ...r, friendState: 'friends', matchId: result.matchId } : r))
      } else if (result.status === 'age_required') {
        setErrorMap(e => ({ ...e, [otherId]: 'フレンド申請には年齢確認が必要です' }))
      } else {
        setErrorMap(e => ({ ...e, [otherId]: '申請できません' }))
      }
    }
    setBusyMap(b => ({ ...b, [otherId]: false }))
  }

  return (
    <div className="max-w-md mx-auto min-h-screen pb-28" style={{ background: '#080812' }}>

      {/* ── ヘッダー ── */}
      <div
        className="sticky top-0 z-10 px-4 pt-12 pb-3 backdrop-blur-md"
        style={{
          background: 'rgba(8,8,18,0.94)',
          borderBottom: '1px solid rgba(255,77,144,0.18)',
        }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 rounded-full active:bg-white/5 transition-colors"
          >
            <ArrowLeft size={20} style={{ color: 'rgba(240,238,255,0.7)' }} />
          </button>
          <p className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: 'rgba(255,77,144,0.7)' }}>FIND PEOPLE</p>
        </div>
        <h1 className="font-extrabold text-2xl flex items-center gap-2 mb-3"
          style={{ color: '#F0EEFF' }}>
          <Users size={22} strokeWidth={2.2} style={{ color: '#FF4D90' }} />
          ユーザーを探す
        </h1>

        <div className="relative">
          <Search size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: 'rgba(240,238,255,0.4)' }} />
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="名前・自己紹介・IDで検索"
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl text-sm focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,77,144,0.25)',
              color: '#F0EEFF',
              caretColor: '#FF4D90',
            }}
          />
          {keyword && (
            <button onClick={() => setKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 active:opacity-60">
              <X size={14} style={{ color: 'rgba(240,238,255,0.4)' }} />
            </button>
          )}
        </div>
      </div>

      {/* ── あなたのフレンド (FriendRail の「もっと見る」遷移先) ── */}
      {!keyword.trim() && friends && friends.length > 0 && (
        <div className="px-4 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: 'rgba(57,255,136,0.7)' }}>
            あなたのフレンド ({friends.length})
          </p>
          <div className="space-y-2 mb-4">
            {friends.map(f => {
              const online = isOnline(f.last_seen_at)
              const lastLabel = lastSeenLabelJP(f.last_seen_at)
              return (
                <div key={f.id}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: online
                      ? '1px solid rgba(57,255,136,0.35)'
                      : '1px solid rgba(255,255,255,0.08)',
                  }}>
                  <Link
                    href={`/profile/${f.id}`}
                    className="block px-3 py-3 active:opacity-70 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        {/* オンライン時のグロー (FriendRail と同じ色味) */}
                        {online && (
                          <span aria-hidden
                            className="absolute inset-0 rounded-full"
                            style={{ boxShadow: '0 0 0 2px #39FF88, 0 0 12px rgba(57,255,136,0.4)' }}
                          />
                        )}
                        <div
                          className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white relative"
                          style={{
                            background: online
                              ? 'linear-gradient(135deg, #39FF88, #27DFFF)'
                              : 'linear-gradient(135deg,#FF4D90,#9D5CFF)',
                            border: online ? '2px solid #080812' : 'none',
                            opacity: online ? 1 : 0.85,
                          }}
                        >
                          {f.avatar_url
                            ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                            : <span>{(f.display_name ?? '?').charAt(0).toUpperCase()}</span>}
                        </div>
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                          style={{
                            background: online ? '#39FF88' : '#475569',
                            border: '2px solid #080812',
                            boxShadow: online ? '0 0 4px rgba(57,255,136,0.7)' : 'none',
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold truncate" style={{ color: '#F0EEFF' }}>
                            {f.display_name ?? '名無し'}
                          </p>
                          <VerifiedBadge verified={f.age_verified} size="sm" />
                        </div>
                        <p className="text-[11px] mt-0.5"
                          style={{ color: online ? '#39FF88' : 'rgba(240,238,255,0.45)' }}>
                          {online
                            ? '🟢 オンライン中'
                            : (lastLabel ? `最終ログイン ${lastLabel}` : '最終ログイン不明')}
                        </p>
                      </div>
                      {/* 通話招待 (グループ通話画面へ) と DM (既存 startDM) を 2 ボタン並列 */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Link
                          href="/group"
                          onClick={e => e.stopPropagation()}
                          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all"
                          style={{
                            background: 'rgba(39,223,255,0.15)',
                            border: '1px solid rgba(39,223,255,0.35)',
                          }}
                          aria-label="グループ通話に誘う"
                          title="グループ通話に誘う"
                        >
                          <Headphones size={13} style={{ color: '#27DFFF' }} />
                        </Link>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (!me) return
                            const result = await startDM(me, f.id)
                            if (result.status === 'ok' || result.status === 'exists') {
                              router.push(`/chat/${result.matchId}`)
                            } else if (result.status === 'request' && 'matchId' in result) {
                              router.push(`/chat/${result.matchId}`)
                            }
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all"
                          style={{
                            background: 'rgba(255,77,144,0.15)',
                            border: '1px solid rgba(255,77,144,0.35)',
                          }}
                          aria-label="DMを送る"
                          title="DMを送る"
                        >
                          <Mail size={12} style={{ color: '#FF4D90' }} />
                        </button>
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 結果リスト (検索) ── */}
      <div className="px-4 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
          style={{ color: 'rgba(240,238,255,0.3)' }}>
          {keyword.trim() ? '一致するユーザー' : '最近のユーザー'}
        </p>

        <div className="space-y-2">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i}
                className="rounded-2xl p-3 animate-pulse"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,77,144,0.1)',
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full"
                    style={{ background: 'rgba(255,77,144,0.12)' }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 rounded w-1/3"
                      style={{ background: 'rgba(255,77,144,0.1)' }} />
                    <div className="h-2.5 rounded w-2/3"
                      style={{ background: 'rgba(255,77,144,0.07)' }} />
                  </div>
                </div>
              </div>
            ))
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">🔍</p>
              <p className="text-sm font-bold"
                style={{ color: 'rgba(240,238,255,0.55)' }}>
                {keyword.trim() ? 'ユーザーが見つかりません' : 'まだユーザーがいません'}
              </p>
              <p className="text-xs mt-1"
                style={{ color: 'rgba(240,238,255,0.3)' }}>
                {keyword.trim()
                  ? '別のキーワードで試してみてください'
                  : 'ギルドやゲーム村で出会った人を検索できます'}
              </p>
            </div>
          ) : results.map(u => {
            const isMe = u.id === me
            const busy = !!busyMap[u.id]
            const err  = errorMap[u.id]
            return (
              <div key={u.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,77,144,0.18)',
                }}>
                {/* タップ範囲：プロフィールへ遷移 */}
                <Link
                  href={`/profile/${u.id}`}
                  className="block px-3 py-3 active:opacity-70 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#FF4D90,#9D5CFF)' }}
                    >
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span>{u.display_name?.[0] ?? '?'}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold truncate"
                          style={{ color: '#F0EEFF' }}>
                          {u.display_name ?? '名無し'}
                        </p>
                        <VerifiedBadge verified={u.age_verified} size="sm" />
                        {isMe && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{
                              background: 'rgba(157,92,255,0.15)',
                              color:      '#9D5CFF',
                              border:     '1px solid rgba(157,92,255,0.3)',
                            }}>
                            あなた
                          </span>
                        )}
                      </div>
                      {u.VILLIA_id && (
                        <p className="text-[10px] font-mono mt-0.5"
                          style={{ color: 'rgba(240,238,255,0.3)' }}>
                          #{u.VILLIA_id}
                        </p>
                      )}
                      {u.bio && (
                        <p className="text-[11px] truncate mt-0.5"
                          style={{ color: 'rgba(240,238,255,0.45)' }}>
                          {u.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>

                {/* アクション：自分以外のみ */}
                {!isMe && (
                  <div
                    className="grid grid-cols-2 gap-px"
                    style={{
                      borderTop: '1px solid rgba(255,77,144,0.1)',
                      background: 'rgba(255,77,144,0.08)',
                    }}>
                    <button
                      onClick={() => toggleFollow(u.id)}
                      disabled={busy}
                      className="py-2.5 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                      style={u.followState === 'following'
                        ? { background: 'rgba(8,8,18,0.95)', color: 'rgba(240,238,255,0.55)' }
                        : { background: 'rgba(8,8,18,0.95)', color: '#39FF88' }}>
                      {u.followState === 'following'
                        ? <><Check size={11} /> フォロー中</>
                        : <><UserPlus size={11} /> フォロー</>}
                    </button>
                    <button
                      onClick={() => sendOrAcceptFriend(u.id)}
                      disabled={busy || u.friendState === 'sent' || u.friendState === 'friends'}
                      className="py-2.5 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-60"
                      style={u.friendState === 'friends'
                        ? { background: 'rgba(8,8,18,0.95)', color: '#c4b5fd' }
                        : u.friendState === 'sent'
                        ? { background: 'rgba(8,8,18,0.95)', color: 'rgba(240,238,255,0.4)' }
                        : u.friendState === 'received'
                        ? { background: 'rgba(8,8,18,0.95)', color: '#FFC928' }
                        : { background: 'rgba(8,8,18,0.95)', color: '#FF4D90' }}>
                      {u.friendState === 'friends'  ? <><Check size={11} /> フレンド</>
                        : u.friendState === 'sent'    ? '申請中'
                        : u.friendState === 'received'? <><Check size={11} /> 承認する</>
                        : <><Mail size={11} /> 申請</>}
                    </button>
                  </div>
                )}

                {/* エラー表示 */}
                {err && (
                  <p className="px-3 py-1.5 text-[10px] text-red-400"
                    style={{ borderTop: '1px solid rgba(255,77,144,0.12)' }}>
                    ⚠️ {err}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
