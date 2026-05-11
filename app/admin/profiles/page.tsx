'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────
// 実在カラムのみ（supabase/migrations/001_initial.sql + 既存コード使用箇所で確認）
interface ProfileRow {
  id:           string
  display_name: string
  VILLIA_id:    string | null
  avatar_url:   string | null
  created_at:   string | null
  updated_at:   string
}

const PAGE_SIZE = 50

// ─── ヘルパー ─────────────────────────────────────────────────
function fmt(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function shortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

// ─── メインページ ──────────────────────────────────────────────
export default function AdminProfilesPage() {
  const [authed,      setAuthed]      = useState(false)
  const [adminSecret, setAdminSecret] = useState('')

  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const [query,    setQuery]    = useState('')
  const [page,     setPage]     = useState(0)
  const [hasMore,  setHasMore]  = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchProfiles = useCallback(async (p: number) => {
    setLoading(true)
    setError('')
    const from = p * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1
    const { data, error } = await createClient()
      .from('profiles')
      .select('id, display_name, VILLIA_id, avatar_url, created_at, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .range(from, to)
    if (error) {
      setError(error.message)
      setProfiles([])
      setHasMore(false)
    } else {
      setProfiles((data ?? []) as ProfileRow[])
      setHasMore((data?.length ?? 0) === PAGE_SIZE)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchProfiles(page)
  }, [authed, page, fetchProfiles])

  // クライアントサイドでの簡易フィルタ（取得済み行を display_name / VILLIA_id / id で検索）
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter(p =>
      (p.display_name ?? '').toLowerCase().includes(q) ||
      (p.VILLIA_id    ?? '').toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    )
  }, [profiles, query])

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1200)
    } catch {}
  }

  // ── ログイン画面 ─────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">👥</div>
            <div className="font-extrabold text-white text-xl">ユーザー一覧</div>
            <div className="text-xs text-white/40 mt-1">Profiles Admin</div>
          </div>
          <input
            type="password"
            value={adminSecret}
            onChange={e => setAdminSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adminSecret && setAuthed(true)}
            placeholder="管理者パスワード"
            autoFocus
            className="w-full px-4 py-3 rounded-2xl bg-white/10 text-white placeholder-white/30 border border-white/20 text-sm focus:outline-none focus:border-brand-400 mb-3"
          />
          <button
            onClick={() => adminSecret && setAuthed(true)}
            className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
          >
            ログイン →
          </button>
          <Link
            href="/admin"
            className="block text-center text-xs text-white/40 mt-4 hover:text-white/60 transition"
          >
            ← Moderation Dashboard に戻る
          </Link>
        </div>
      </div>
    )
  }

  // ── 一覧画面 ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-white">👥 ユーザー一覧</h1>
            <p className="text-xs text-white/40 mt-0.5">
              Profiles Admin · is_active = true のみ
            </p>
          </div>
          <Link
            href="/admin"
            className="flex-shrink-0 text-[11px] px-3 py-2 rounded-xl bg-white/10 text-white/70 border border-white/10 font-bold hover:bg-white/15 transition active:scale-95"
          >
            ← Moderation
          </Link>
        </div>

        {/* 検索 + ページング */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="display_name / VILLIA_id / id で絞り込み（取得済みのみ）"
            className="flex-1 px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/10 text-xs focus:outline-none focus:border-brand-400"
          />
          <button
            onClick={() => fetchProfiles(page)}
            disabled={loading}
            className="text-[11px] px-3 py-2 rounded-xl bg-white/10 text-white/70 border border-white/10 font-bold disabled:opacity-40 active:scale-95 transition"
            title="再取得"
          >
            🔄
          </button>
        </div>

        {/* エラー */}
        {error && (
          <div className="bg-red-950/40 border border-red-900/50 rounded-2xl p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* テーブル */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {/* ヘッダ行 */}
          <div className="hidden sm:grid grid-cols-[40px_minmax(0,1fr)_110px_110px_140px_140px] gap-2 px-3 py-2 bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40 font-bold">
            <div></div>
            <div>display_name</div>
            <div>VILLIA_id</div>
            <div>id</div>
            <div>created_at</div>
            <div>updated_at</div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-white/40">読み込み中…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm text-white/40 font-medium">
                {profiles.length === 0
                  ? 'プロフィールが取得できませんでした'
                  : '検索条件に一致するユーザーがいません'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {filtered.map(p => (
                <li
                  key={p.id}
                  className="px-3 py-2.5 sm:grid sm:grid-cols-[40px_minmax(0,1fr)_110px_110px_140px_140px] sm:gap-2 sm:items-center flex flex-col gap-2 text-xs"
                >
                  {/* アバター */}
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <span className="text-sm font-bold text-white/50">
                        {p.display_name?.[0] ?? '?'}
                      </span>
                    )}
                  </div>

                  {/* display_name */}
                  <div className="min-w-0">
                    <div className="sm:hidden text-[10px] text-white/40 uppercase tracking-wider">display_name</div>
                    <div className="text-white font-bold truncate">{p.display_name ?? '—'}</div>
                  </div>

                  {/* VILLIA_id */}
                  <div className="min-w-0">
                    <div className="sm:hidden text-[10px] text-white/40 uppercase tracking-wider">VILLIA_id</div>
                    <div className="text-white/70 font-mono truncate">{p.VILLIA_id ?? '—'}</div>
                  </div>

                  {/* id (短縮 + コピー) */}
                  <div className="min-w-0">
                    <div className="sm:hidden text-[10px] text-white/40 uppercase tracking-wider">id</div>
                    <button
                      onClick={() => copyId(p.id)}
                      className="text-white/50 font-mono truncate hover:text-white transition text-left"
                      title={p.id}
                    >
                      {copiedId === p.id ? '✓ copied' : shortId(p.id)}
                    </button>
                  </div>

                  {/* created_at */}
                  <div className="min-w-0">
                    <div className="sm:hidden text-[10px] text-white/40 uppercase tracking-wider">created_at</div>
                    <div className="text-white/50">{fmt(p.created_at)}</div>
                  </div>

                  {/* updated_at */}
                  <div className="min-w-0">
                    <div className="sm:hidden text-[10px] text-white/40 uppercase tracking-wider">updated_at</div>
                    <div className="text-white/50">{fmt(p.updated_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ページング */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-white/40">
            ページ <span className="text-white font-bold">{page + 1}</span>
            <span className="mx-1">·</span>
            表示 <span className="text-white font-bold">{filtered.length}</span> / 取得 <span className="text-white font-bold">{profiles.length}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="text-[11px] px-3 py-1.5 rounded-xl bg-white/10 text-white/70 border border-white/10 font-bold disabled:opacity-30 active:scale-95 transition"
            >
              ← 前へ
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || loading}
              className="text-[11px] px-3 py-1.5 rounded-xl bg-white/10 text-white/70 border border-white/10 font-bold disabled:opacity-30 active:scale-95 transition"
            >
              次へ →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
