import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'samee — 20歳以上限定の大人ゲームコミュニティ',
  description: '民度が高い。荒らしがいない。電話認証必須・信頼ティア制度で守られた、ゲーマーのための大人コミュニティ。FPS・RPG・スマホゲームなど10ジャンルのギルドがある。',
  openGraph: {
    title: 'samee — 20歳以上限定の大人ゲームコミュニティ',
    description: '民度が高い。荒らしがいない。それだけで、全部違う。',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

const GENRES = [
  { id: 'FPS・TPS',        emoji: '🎯', color: '#ef4444', gradient: 'linear-gradient(135deg,#ef444420,#ef444408)' },
  { id: 'RPG',             emoji: '⚔️', color: '#8b5cf6', gradient: 'linear-gradient(135deg,#8b5cf620,#8b5cf608)' },
  { id: 'アクション',      emoji: '🔥', color: '#f97316', gradient: 'linear-gradient(135deg,#f9731620,#f9731608)' },
  { id: 'スポーツ',        emoji: '⚽', color: '#10b981', gradient: 'linear-gradient(135deg,#10b98120,#10b98108)' },
  { id: 'スマホゲーム',    emoji: '📱', color: '#ec4899', gradient: 'linear-gradient(135deg,#ec489920,#ec489908)' },
  { id: 'シミュ',          emoji: '🧠', color: '#0891b2', gradient: 'linear-gradient(135deg,#0891b220,#0891b208)' },
  { id: 'パズル',          emoji: '🧩', color: '#f59e0b', gradient: 'linear-gradient(135deg,#f59e0b20,#f59e0b08)' },
  { id: 'インディー',      emoji: '🌱', color: '#059669', gradient: 'linear-gradient(135deg,#05966920,#05966908)' },
  { id: 'レトロ',          emoji: '🕹️', color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f120,#6366f108)' },
  { id: '雑談',            emoji: '💬', color: '#64748b', gradient: 'linear-gradient(135deg,#64748b20,#64748b08)' },
]

export default async function TopPage() {
  const supabase = createClient()
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  const userCount = Math.max(count ?? 0, 1)

  return (
    <div className="min-h-screen flex flex-col max-w-[430px] mx-auto" style={{ background: '#080810' }}>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HEADER
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header
        className="flex items-center justify-between px-5 h-14 sticky top-0 z-20"
        style={{
          background: 'rgba(8,8,16,0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', boxShadow: '0 0 16px rgba(139,92,246,0.5)' }}
          >
            <span className="text-white font-black text-sm">s</span>
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">samee</span>
          <span
            className="text-[9px] font-extrabold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(139,92,246,0.18)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.35)' }}
          >
            20歳以上
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all active:scale-95"
            style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: 'white', boxShadow: '0 2px 12px rgba(139,92,246,0.4)' }}
          >
            登録
          </Link>
        </div>
      </header>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative px-5 pt-12 pb-10 overflow-hidden">
        {/* 背景グロー */}
        <div
          className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[80px] pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(139,92,246,0.28) 0%,transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-[-40px] w-48 h-48 rounded-full blur-[60px] pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(236,72,153,0.12) 0%,transparent 70%)' }}
        />

        {/* 在籍バッジ */}
        <div className="flex justify-center mb-6">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}
          >
            <span className="relative flex w-2 h-2 flex-shrink-0">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ background: '#a78bfa' }}
              />
              <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: '#8b5cf6' }} />
            </span>
            <span className="text-xs font-bold" style={{ color: '#c4b5fd' }}>
              {userCount.toLocaleString()}人のゲーマーが在籍中
            </span>
          </div>
        </div>

        {/* メインコピー */}
        <h1
          className="font-black text-center leading-[1.12] mb-4 tracking-tight"
          style={{ fontSize: '2.05rem', color: 'white' }}
        >
          Discordに<br />
          <span
            style={{
              background: 'linear-gradient(135deg,#a78bfa 0%,#7c3aed 40%,#ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            疲れた大人のための
          </span>
          <br />
          ゲームの居場所。
        </h1>

        {/* サブコピー */}
        <p className="text-sm text-center leading-loose mb-2 mx-auto max-w-[300px]" style={{ color: '#94a3b8' }}>
          荒らしがいない。煽りがいない。中学生がいない。
        </p>
        <p className="text-xs text-center font-bold mb-8" style={{ color: '#6366f1' }}>
          電話認証必須 · 20歳以上限定 · 信頼ティア制度
        </p>

        {/* CTA */}
        <Link
          href="/signup"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-extrabold text-base active:scale-[0.98] transition-all mb-3"
          style={{
            background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
            color: 'white',
            boxShadow: '0 6px 28px rgba(139,92,246,0.55)',
          }}
        >
          無料で始める
          <span className="text-sm opacity-80">— 30秒 →</span>
        </Link>
        <Link
          href="/login"
          className="flex items-center justify-center w-full py-3 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', background: 'rgba(255,255,255,0.03)' }}
        >
          アカウントがある → ログイン
        </Link>
        <p className="text-center text-xs mt-3" style={{ color: '#334155' }}>無料 · クレジットカード不要 · 20歳以上</p>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          アプリモックアップ（Discord スタイル風）
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-5 pb-10">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#0f0f1a',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(139,92,246,0.15)',
          }}
        >
          {/* アプリバー */}
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ background: 'rgba(15,15,26,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
              <span className="text-white font-black text-[10px]">s</span>
            </div>
            <span className="text-xs font-bold text-white">samee</span>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold">42人オンライン</span>
            </div>
          </div>
          {/* チャンネルリスト風 */}
          <div className="flex">
            {/* サイドバー */}
            <div className="w-[52px] flex-shrink-0 py-3 flex flex-col items-center gap-2"
              style={{ background: 'rgba(0,0,0,0.3)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              {['🎯','⚔️','🔥','📱','🎮'].map((e, i) => (
                <div key={i}
                  className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg transition-all"
                  style={i === 0
                    ? { background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.4)' }
                    : { background: 'rgba(255,255,255,0.05)' }
                  }>
                  {e}
                </div>
              ))}
            </div>
            {/* メインチャット */}
            <div className="flex-1 py-3 px-3 space-y-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs" style={{ color: 'rgba(139,92,246,0.7)' }}>#</span>
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>FPS雑談</span>
                <span className="ml-auto flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />LIVE
                </span>
              </div>
              {/* メッセージ行 */}
              {[
                { name: 'Ryota_29', msg: 'ヴァロ今夜やる人いる？', tier: '常連', tierColor: '#60a5fa', online: true },
                { name: 'Mai_gamer', msg: '参加します！ダイヤ帯です', tier: 'エース', tierColor: '#a78bfa', online: true },
                { name: 'Kenji_FPS', msg: 'もう1人募集！', tier: '常連', tierColor: '#60a5fa', online: false },
              ].map((m, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg,#${['8b5cf6','ec4899','6366f1'][i]},#${['6d28d9','db2777','4f46e5'][i]})` }}
                    >
                      {m.name[0]}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                      style={{ background: m.online ? '#22c55e' : '#44475a', border: '1.5px solid #0f0f1a' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-[11px] font-extrabold text-white">{m.name}</span>
                      <span className="text-[8px] font-bold px-1 py-px rounded-full leading-none"
                        style={{ color: m.tierColor, background: `${m.tierColor}18`, border: `1px solid ${m.tierColor}35` }}>
                        {m.tier}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.75)' }}>{m.msg}</p>
                  </div>
                </div>
              ))}
              {/* 入力欄 */}
              <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <span className="text-[10px] flex-1" style={{ color: 'rgba(255,255,255,0.25)' }}>#FPS雑談 にメッセージを送信</span>
                <span className="text-base">🎮</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] mt-2.5" style={{ color: '#334155' }}>
          ※ イメージ画面です
        </p>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          THE PROBLEM → SOLUTION
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-5 pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-5" style={{ color: '#475569' }}>
          なぜ samee か
        </p>
        <div className="space-y-2.5">
          {[
            {
              before: 'Discord：中学生・荒らしが普通にいる',
              after:  '20歳以上 + 電話認証で構造ブロック',
              icon: '🔞', color: '#ef4444',
            },
            {
              before: '匿名すぎて誰を信じていいか不明',
              after:  'Trust Tier制度で実績が丸見え',
              icon: '🏅', color: '#f59e0b',
            },
            {
              before: 'ゲームの話がしたいのに雑談に埋もれる',
              after:  '10ジャンル別ギルドで即マッチ',
              icon: '🎮', color: '#8b5cf6',
            },
            {
              before: '仲間募集を投稿しても誰も来ない',
              after:  '通話ルームで今すぐ一緒にプレイ',
              icon: '🤝', color: '#10b981',
            },
          ].map(item => (
            <div
              key={item.icon}
              className="rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${item.color}25`, background: `${item.color}08` }}
            >
              <div className="flex items-center gap-2 px-3.5 py-2.5">
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[10px] leading-snug" style={{ color: '#475569' }}>
                    ❌ {item.before}
                  </p>
                  <p className="text-xs font-bold leading-snug" style={{ color: item.color }}>
                    ✓ {item.after}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HOW IT WORKS（3ステップ）
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-5 pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-5" style={{ color: '#475569' }}>
          はじめ方
        </p>
        <div className="relative">
          {/* 縦ライン */}
          <div className="absolute left-[22px] top-8 bottom-8 w-px"
            style={{ background: 'linear-gradient(to bottom,rgba(139,92,246,0.4),rgba(139,92,246,0.1))' }} />
          <div className="space-y-4">
            {[
              {
                step: '01', icon: '📱', title: '30秒で登録',
                desc: 'メールアドレスだけで今すぐ開始。',
                color: '#8b5cf6',
              },
              {
                step: '02', icon: '🔐', title: '電話番号を認証',
                desc: '1回だけ。これだけで荒らしが来なくなる。',
                color: '#6366f1',
              },
              {
                step: '03', icon: '🎮', title: 'ギルドに入る',
                desc: 'ジャンルを選んで仲間に挨拶するだけ。',
                color: '#ec4899',
              },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-4">
                <div
                  className="relative z-10 w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                  style={{
                    background: `${s.color}20`,
                    border: `2px solid ${s.color}50`,
                    boxShadow: `0 0 16px ${s.color}30`,
                  }}
                >
                  {s.icon}
                </div>
                <div className="pt-1.5 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-extrabold" style={{ color: s.color }}>STEP {s.step}</span>
                  </div>
                  <p className="text-sm font-extrabold text-white mb-0.5">{s.title}</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Link
          href="/signup"
          className="mt-8 flex items-center justify-center w-full py-4 rounded-2xl font-extrabold text-sm active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: 'white', boxShadow: '0 4px 20px rgba(139,92,246,0.45)' }}
        >
          今すぐ無料で始める →
        </Link>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          GENRES
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-4" style={{ color: '#475569' }}>
          10ジャンルのゲームギルド
        </p>
        <div className="grid grid-cols-5 gap-2 px-5">
          {GENRES.map(g => (
            <div
              key={g.id}
              className="flex flex-col items-center gap-1.5 rounded-2xl py-3 px-1"
              style={{ background: g.gradient, border: `1px solid ${g.color}30` }}
            >
              <span className="text-xl">{g.emoji}</span>
              <span className="text-[7px] font-extrabold text-center leading-tight" style={{ color: g.color }}>
                {g.id}
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs mt-4 px-5" style={{ color: '#475569' }}>
          同じゲームを語れる仲間が、ジャンルごとに集まっている
        </p>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TRUST TIER
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-5 pb-10">
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg,#0f0f1a 0%,#1a0a2e 100%)',
            border: '1px solid rgba(139,92,246,0.2)',
          }}
        >
          <div className="px-5 pt-6 pb-4">
            <p className="text-[10px] font-extrabold uppercase tracking-widest mb-1" style={{ color: 'rgba(139,92,246,0.5)' }}>
              Trust Tier
            </p>
            <h2 className="text-base font-extrabold text-white mb-1 leading-snug">
              活動するほど、できることが増える
            </h2>
            <p className="text-xs mb-5" style={{ color: '#475569' }}>
              荒らしは「見習い」止まり。常連になれば、通話・ギルド作成が解禁される。
            </p>
            <div className="space-y-2">
              {[
                { icon: '🪴', label: '見習い',     desc: '登録直後 — 閲覧のみ',             color: '#9ca3af' },
                { icon: '🏡', label: '住民',       desc: '電話認証後 — 投稿・通話OK',        color: '#60a5fa' },
                { icon: '🌿', label: '常連',       desc: '活動継続 — 通話部屋を作れる',       color: '#34d399' },
                { icon: '🌳', label: '信頼の住民', desc: '実績あり — ギルドを作れる',         color: '#86efac' },
                { icon: '✨', label: '村の柱',     desc: '最高ランク — 全機能 + 金フレーム', color: '#fbbf24' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-base w-7 text-center flex-shrink-0">{t.icon}</span>
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold flex-shrink-0" style={{ color: t.color }}>{t.label}</span>
                    <span className="text-[10px] text-right" style={{ color: '#4b5563' }}>{t.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t px-5 py-3.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[11px] leading-relaxed text-center" style={{ color: '#4b5563' }}>
              電話認証 + Trust Tier で荒らし・未成年・業者を構造的に排除
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FEATURES
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-5 pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-5" style={{ color: '#475569' }}>
          sameeでできること
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { emoji: '🎮', title: 'ゲームギルド',    desc: 'ジャンル別の専用チャット空間',      color: '#8b5cf6' },
            { emoji: '🎙️', title: '通話ルーム',      desc: '今すぐボイチャで仲間と遊ぶ',         color: '#ec4899' },
            { emoji: '🤝', title: '仲間募集 LFG',   desc: 'ランク・機種・時間帯で絞り込み',     color: '#10b981' },
            { emoji: '📊', title: 'ギルド投票',      desc: '「今夜何やる？」をリアルタイム集計', color: '#06b6d4' },
            { emoji: '🏆', title: 'ジャンル称号',    desc: '3ジャンル制覇で称号が解除',          color: '#f59e0b' },
            { emoji: '🧊', title: 'ストリーク',      desc: '毎日ログインで継続ボーナス',          color: '#6366f1' },
          ].map(f => (
            <div
              key={f.title}
              className="rounded-2xl p-4"
              style={{ background: `${f.color}10`, border: `1px solid ${f.color}25` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${f.color}20` }}
              >
                <span className="text-xl">{f.emoji}</span>
              </div>
              <p className="font-extrabold text-sm text-white mb-1">{f.title}</p>
              <p className="text-[11px] leading-snug" style={{ color: '#64748b' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TESTIMONIALS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-5 pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-5" style={{ color: '#475569' }}>
          実際の声
        </p>
        <div className="space-y-3">
          {[
            {
              text: 'Discordはサーバー作っても結局荒らしが来る。ここは電話認証あるから空気が全然違う。',
              name: '社会人 · 29歳 · FPSメイン',
              tier: '常連', tierColor: '#60a5fa',
            },
            {
              text: 'ランクもゲーム時間も似た人が集まるから、誘いやすいし誘われやすい。',
              name: 'フリーランス · 33歳 · RPG',
              tier: 'エース', tierColor: '#a78bfa',
            },
            {
              text: 'ジャンルマスター称号が解除されたとき地味にテンション上がった笑。ゲームみたいで好き。',
              name: '会社員 · 26歳 · スマホゲームメイン',
              tier: '住民', tierColor: '#4ade80',
            },
          ].map((v, i) => (
            <div
              key={i}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-sm leading-relaxed mb-3" style={{ color: '#cbd5e1' }}>「{v.text}」</p>
              <div className="flex items-center gap-2">
                <p className="text-xs flex-1" style={{ color: '#475569' }}>{v.name}</p>
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: v.tierColor, background: `${v.tierColor}15`, border: `1px solid ${v.tierColor}35` }}
                >
                  {v.tier}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TARGET PERSONA
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-5 pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-4" style={{ color: '#475569' }}>
          こんなゲーマーに
        </p>
        <div className="space-y-2">
          {[
            { emoji: '🎮', text: '荒らし・煽りなしのゲームコミュニティで話したい' },
            { emoji: '🤝', text: '固定パーティー・フレンドを本気で探している' },
            { emoji: '🏆', text: 'ゲームの話を、同世代の大人同士でしたい' },
            { emoji: '🌙', text: '夜中に一緒にやれる仲間が欲しい' },
            { emoji: '💬', text: 'TwitterもDiscordも荒れすぎて疲れた' },
            { emoji: '🌱', text: '初心者でも馬鹿にされない場所で始めたい' },
          ].map(item => (
            <div
              key={item.text}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-lg flex-shrink-0">{item.emoji}</span>
              <p className="text-sm font-medium" style={{ color: '#cbd5e1' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FINAL CTA
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-5 pb-14">
        <div
          className="rounded-3xl p-8 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg,#1e0a3c 0%,#2d1b69 50%,#1e3a5f 100%)',
            border: '1px solid rgba(139,92,246,0.35)',
            boxShadow: '0 0 60px rgba(139,92,246,0.2)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(139,92,246,0.25) 0%,transparent 60%)' }}
          />
          {/* 星 */}
          <div className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(1px 1px at 15% 25%,white,transparent),radial-gradient(1.5px 1.5px at 75% 15%,white,transparent),radial-gradient(1px 1px at 85% 70%,white,transparent),radial-gradient(1px 1px at 35% 80%,white,transparent)' }} />

          <div className="relative">
            <p className="text-xs font-bold mb-5" style={{ color: 'rgba(167,139,250,0.6)' }}>
              電話認証必須 · 20歳以上 · 荒らし構造排除
            </p>
            <h2 className="text-2xl font-extrabold text-white mb-2 leading-snug">
              民度の高い仲間と、<br />
              本気でゲームを語ろう。
            </h2>
            <p className="text-xs mb-7" style={{ color: 'rgba(148,163,184,0.6)' }}>
              大人のゲームコミュニティ、samee
            </p>
            <Link
              href="/signup"
              className="w-full py-4 rounded-2xl font-extrabold text-base text-center active:scale-[0.98] transition-all block mb-3"
              style={{
                background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                color: 'white',
                boxShadow: '0 4px 28px rgba(139,92,246,0.65)',
              }}
            >
              無料で始める →
            </Link>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>30秒で登録 · 永久無料</p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          B2B
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-5 pb-6">
        <Link
          href="/for-business"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-all"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="text-2xl">🏢</span>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: '#e2e8f0' }}>samee for Business</p>
            <p className="text-xs" style={{ color: '#475569' }}>ゲーム企業・コミュニティ運営向けプラン →</p>
          </div>
          <span style={{ color: '#334155' }}>→</span>
        </Link>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FOOTER
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer
        className="border-t px-5 py-6 text-center"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#080810' }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
            <span className="text-white font-black text-xs">s</span>
          </div>
          <span className="font-bold" style={{ color: '#94a3b8' }}>samee</span>
        </div>
        <p className="text-xs mb-3" style={{ color: '#334155' }}>
          20歳以上限定の大人ゲームコミュニティ
        </p>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs" style={{ color: '#334155' }}>
          <Link href="/terms"        className="hover:text-slate-400 transition">利用規約</Link>
          <Link href="/privacy"      className="hover:text-slate-400 transition">プライバシー</Link>
          <Link href="/safety"       className="hover:text-slate-400 transition">Safety Center</Link>
          <Link href="/contact"      className="hover:text-slate-400 transition">お問い合わせ</Link>
        </div>
        <p className="text-xs mt-3" style={{ color: '#1e293b' }}>© 2026 samee</p>
      </footer>

    </div>
  )
}
