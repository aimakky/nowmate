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
  { id: 'FPS・TPS',       emoji: '🎯', color: '#ef4444' },
  { id: 'RPG',            emoji: '⚔️', color: '#8b5cf6' },
  { id: 'アクション',     emoji: '🔥', color: '#f97316' },
  { id: 'スポーツ',       emoji: '⚽', color: '#10b981' },
  { id: 'スマホゲーム',   emoji: '📱', color: '#ec4899' },
  { id: 'シミュレーション',emoji: '🧠', color: '#0891b2' },
  { id: 'パズル',         emoji: '🧩', color: '#f59e0b' },
  { id: 'インディー',     emoji: '🌱', color: '#059669' },
  { id: 'レトロ',         emoji: '🕹️', color: '#6366f1' },
  { id: '雑談',           emoji: '💬', color: '#64748b' },
]

export default async function TopPage() {
  const supabase = createClient()
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  const userCount = Math.max(count ?? 0, 1)

  return (
    <div className="min-h-screen flex flex-col max-w-[430px] mx-auto" style={{ background: '#0a0a0f' }}>

      {/* ── ヘッダー ── */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 z-10 border-b border-white/10"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
            <span className="text-white font-black text-sm">s</span>
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">samee</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
            20歳以上
          </span>
        </div>
        <Link href="/login"
          className="text-sm font-bold px-4 py-1.5 rounded-xl border transition"
          style={{ color: '#a78bfa', borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.1)' }}>
          ログイン
        </Link>
      </header>

      {/* ── ヒーロー ── */}
      <section className="px-5 pt-10 pb-10 text-center flex flex-col items-center relative overflow-hidden">
        {/* 背景グロー */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(139,92,246,0.25) 0%,transparent 70%)' }} />

        {/* ライブバッジ */}
        <div className="relative inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
          style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)' }}>
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ background: '#a78bfa' }} />
            <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: '#8b5cf6' }} />
          </span>
          <span className="text-xs font-bold" style={{ color: '#c4b5fd' }}>
            {userCount.toLocaleString()}人のゲーマーがいま在籍
          </span>
        </div>

        <h1 className="font-black leading-[1.15] mb-4 tracking-tight"
          style={{ fontSize: '2.1rem', color: 'white' }}>
          民度の高い<br />
          <span style={{
            background: 'linear-gradient(135deg,#a78bfa 0%,#7c3aed 50%,#ec4899 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>大人のゲーム村</span>、<br />
          ここにある。
        </h1>

        <p className="text-sm leading-relaxed mb-2 max-w-[290px]" style={{ color: '#94a3b8' }}>
          荒らしがいない。煽りがいない。<br />
          <strong style={{ color: '#cbd5e1' }}>それだけで、全部違う。</strong>
        </p>
        <p className="text-xs font-bold mb-8" style={{ color: '#6366f1' }}>
          電話認証必須 · Trust Tier制度 · 20歳以上限定
        </p>

        <Link href="/signup"
          className="w-full py-4 rounded-2xl font-extrabold text-base text-center active:scale-[0.98] transition-all mb-3"
          style={{ background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)', color: 'white',
            boxShadow: '0 4px 24px rgba(139,92,246,0.5)' }}>
          無料で始める — 30秒 →
        </Link>
        <Link href="/login"
          className="w-full py-3 rounded-2xl font-semibold text-sm text-center active:scale-[0.98] transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8',
            background: 'rgba(255,255,255,0.04)' }}>
          すでにアカウントがある
        </Link>
        <p className="text-xs mt-3" style={{ color: '#475569' }}>無料 · クレジットカード不要 · 18歳以上</p>
      </section>

      {/* ── ジャンル一覧 ── */}
      <section className="px-5 pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-4"
          style={{ color: '#475569' }}>
          10ジャンルのゲームギルド
        </p>
        <div className="grid grid-cols-5 gap-2">
          {GENRES.map(g => (
            <div key={g.id}
              className="flex flex-col items-center gap-1.5 rounded-2xl py-3 px-1"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xl">{g.emoji}</span>
              <span className="text-[8px] font-bold text-center leading-tight"
                style={{ color: '#94a3b8' }}>
                {g.id}
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs mt-4" style={{ color: '#475569' }}>
          同じゲームを語れる仲間が、ジャンルごとに集まっている
        </p>
      </section>

      {/* ── Discord との違い ── */}
      <section className="px-5 pb-10">
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)',
            border: '1px solid rgba(139,92,246,0.2)' }}>
          <div className="px-5 pt-6 pb-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color: 'rgba(139,92,246,0.6)' }}>vs Discord</p>
            <h2 className="text-base font-extrabold text-white leading-snug">
              Discordじゃダメな理由、わかる？
            </h2>
          </div>
          <div className="px-4 pb-6 space-y-3">
            {[
              { problem: '中学生・荒らしが普通にいる',         solution: '20歳以上 + 電話認証必須',   icon: '🔞' },
              { problem: '匿名すぎて誰を信じていいか謎',       solution: '信頼ティアで実績が見える',   icon: '🏅' },
              { problem: 'サーバー乱立でどこ行けばいいか迷う', solution: 'ジャンル別ギルドで即マッチ', icon: '🎮' },
              { problem: '仲間募集が埋もれてどこか不明',       solution: '仲間募集カテゴリ専用フォーム', icon: '🤝' },
            ].map(item => (
              <div key={item.icon} className="rounded-2xl px-3 py-3 flex items-start gap-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] line-through mb-1" style={{ color: '#475569' }}>
                    ❌ {item.problem}
                  </p>
                  <p className="text-xs font-bold" style={{ color: '#a78bfa' }}>
                    ✓ {item.solution}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 機能ハイライト ── */}
      <section className="px-5 pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-5"
          style={{ color: '#475569' }}>sameeでできること</p>
        <div className="space-y-3">
          {[
            {
              emoji: '🎮', title: 'ゲームギルド（村）',
              desc: 'FPS・RPG・スマホゲームなど10ジャンル。同じゲームを語れる仲間とだけ話せる専用スペース。',
              color: '#8b5cf6',
            },
            {
              emoji: '🤝', title: '仲間募集（LFG）',
              desc: 'ゲームタイトル・機種・活動時間を入力して仲間を募集。ランク上げ・フレンド集め・初心者歓迎など。',
              color: '#ec4899',
            },
            {
              emoji: '📊', title: '村内投票',
              desc: '「今夜どのゲームやる？」をギルド内で投票。リアルタイムで棒グラフ表示。',
              color: '#06b6d4',
            },
            {
              emoji: '🏆', title: 'ジャンルマスター称号',
              desc: '同ジャンルのギルドに3つ以上参加すると称号が解除。プロフィールに表示される。',
              color: '#f59e0b',
            },
            {
              emoji: '🧊', title: 'ストリーク＆凍結',
              desc: '毎日ログインでストリークが続く。7日連続で凍結アイテム獲得 — 1日空いても自動でストリーク維持。',
              color: '#10b981',
            },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-4 rounded-2xl px-4 py-4"
              style={{ background: `${f.color}10`, border: `1px solid ${f.color}25` }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${f.color}20`, border: `1px solid ${f.color}30` }}>
                <span className="text-xl">{f.emoji}</span>
              </div>
              <div>
                <p className="font-extrabold text-sm mb-1" style={{ color: 'white' }}>{f.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/signup"
          className="mt-8 w-full py-4 rounded-2xl font-extrabold text-base text-center active:scale-[0.98] transition-all block"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: 'white',
            boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}>
          無料で始める →
        </Link>
      </section>

      {/* ── 信頼ティア ── */}
      <section className="px-5 pb-10">
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#111827 0%,#1f2937 100%)',
            border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-5 pt-6 pb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color: '#6b7280' }}>Trust Tier</p>
            <h2 className="text-base font-extrabold text-white mb-4">
              活動するほど、できることが増える
            </h2>
            <div className="space-y-2">
              {[
                { icon: '🪴', label: '見習い',     desc: '登録直後。村を覗ける',          color: '#94a3b8' },
                { icon: '🏡', label: '住民',       desc: '電話認証後。投稿・通話が使える', color: '#60a5fa' },
                { icon: '🌿', label: '常連',       desc: '通話部屋を作れる',               color: '#34d399' },
                { icon: '🌳', label: '信頼の住民', desc: '村・ギルドを作れる',             color: '#86efac' },
                { icon: '✨', label: '村の柱',     desc: '金フレーム・全機能解放',         color: '#fbbf24' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-base w-7 text-center flex-shrink-0">{t.icon}</span>
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold flex-shrink-0"
                      style={{ color: t.color }}>{t.label}</span>
                    <span className="text-[10px] truncate"
                      style={{ color: '#6b7280' }}>{t.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[11px] leading-relaxed" style={{ color: '#6b7280' }}>
              電話認証必須 + Trust Tier制度により、荒らし・未成年・業者を構造的に排除。
              大人のゲーマーだけが残る。
            </p>
          </div>
        </div>
      </section>

      {/* ── ユーザーの声 ── */}
      <section className="px-5 pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-5"
          style={{ color: '#475569' }}>実際の声</p>
        <div className="space-y-3">
          {[
            {
              text: 'Discordのサーバーって結局荒らしが来るじゃないですか。ここは電話認証あるから、明らかに雰囲気違う。',
              name: '社会人・29歳・FPSメイン',
            },
            {
              text: 'ジャンルマスター称号が解除されたとき、地味にテンション上がった笑。ゲームの実績みたいで好き。',
              name: 'フリーランス・33歳・RPG好き',
            },
            {
              text: '仲間募集フォームがちゃんと機能ごとに分かれてるから見つけやすい。他のSNSだと投稿が流れちゃう。',
              name: '会社員・26歳・スマホゲームメイン',
            },
          ].map((v, i) => (
            <div key={i} className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm leading-relaxed mb-3" style={{ color: '#cbd5e1' }}>
                「{v.text}」
              </p>
              <p className="text-xs font-semibold" style={{ color: '#475569' }}>{v.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── こんな人に ── */}
      <section className="px-5 pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-5"
          style={{ color: '#475569' }}>こんなゲーマーに</p>
        <div className="space-y-2">
          {[
            { emoji: '🎮', text: '荒らしがいないゲームコミュニティで話したい' },
            { emoji: '🤝', text: '固定パーティー・フレンドを真剣に探している' },
            { emoji: '🏆', text: 'ゲームの話を大人同士でできる場所がほしい' },
            { emoji: '🌙', text: '夜中に一緒にやれる仲間が欲しい' },
            { emoji: '💬', text: 'Discordは荒れすぎ、Twitterは拡散が怖い' },
            { emoji: '🌱', text: '初心者だけど、馬鹿にされない場所で始めたい' },
          ].map(item => (
            <div key={item.text}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-lg flex-shrink-0">{item.emoji}</span>
              <p className="text-sm font-medium" style={{ color: '#cbd5e1' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 最終CTA ── */}
      <section className="px-5 pb-14">
        <div className="rounded-3xl p-8 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg,#1e0a3c 0%,#2d1b69 50%,#1e3a5f 100%)',
            border: '1px solid rgba(139,92,246,0.3)',
            boxShadow: '0 0 60px rgba(139,92,246,0.2)',
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(139,92,246,0.2) 0%,transparent 60%)' }} />
          <div className="relative">
            <p className="text-xs mb-4" style={{ color: 'rgba(167,139,250,0.6)' }}>
              電話認証必須 · 20歳以上 · 荒らし構造排除
            </p>
            <h2 className="text-2xl font-extrabold text-white mb-2 leading-snug">
              民度の高い仲間と、<br />
              本気でゲームを語ろう。
            </h2>
            <p className="text-xs mb-7" style={{ color: 'rgba(148,163,184,0.7)' }}>
              大人のゲームコミュニティ、samee
            </p>
            <Link href="/signup"
              className="w-full py-4 rounded-2xl font-extrabold text-base text-center active:scale-[0.98] transition-all block mb-3"
              style={{
                background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: 'white',
                boxShadow: '0 4px 24px rgba(139,92,246,0.6)',
              }}>
              無料で始める →
            </Link>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>30秒で登録 · 永久無料</p>
          </div>
        </div>
      </section>

      {/* ── B2B ── */}
      <section className="px-5 pb-6">
        <Link href="/for-business"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-2xl">🏢</span>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: '#e2e8f0' }}>samee for Business</p>
            <p className="text-xs" style={{ color: '#64748b' }}>
              ゲーム企業・コミュニティ運営向けプラン →
            </p>
          </div>
          <span style={{ color: '#475569' }}>→</span>
        </Link>
      </section>

      {/* ── フッター ── */}
      <footer className="border-t px-5 py-6 text-center"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0a0a0f' }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
            <span className="text-white font-black text-xs">s</span>
          </div>
          <span className="font-bold" style={{ color: '#94a3b8' }}>samee</span>
        </div>
        <p className="text-xs mb-3" style={{ color: '#475569' }}>
          20歳以上限定の大人ゲームコミュニティ
        </p>
        <div className="flex justify-center gap-5 text-xs" style={{ color: '#475569' }}>
          <Link href="/terms"   className="hover:text-slate-300 transition">利用規約</Link>
          <Link href="/privacy" className="hover:text-slate-300 transition">プライバシー</Link>
          <Link href="/safety"  className="hover:text-slate-300 transition">Safety Center</Link>
          <Link href="/contact" className="hover:text-slate-300 transition">お問い合わせ</Link>
        </div>
        <p className="text-xs mt-3" style={{ color: '#334155' }}>© 2026 samee</p>
      </footer>

    </div>
  )
}
