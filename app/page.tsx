import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import YVoiceIcon from '@/components/ui/icons/YVoiceIcon'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'YVOICE — 20歳以上限定の大人ゲーム通話コミュニティ',
  description: '野良VCに疲れた大人へ。20歳以上限定・聞き専OK・電話番号は非公開。落ち着いて話せるゲーム通話コミュニティ。FPS・RPG・スマホゲームなど10ジャンルのギルド。',
  openGraph: {
    title: 'YVOICE — 20歳以上限定の大人ゲーム通話コミュニティ',
    description: '野良VCに疲れた大人へ。落ち着いて話せるゲーム通話コミュニティ。',
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

  // 2026-05-08 マッキーさん指示「一度ログインしたら 90 日維持。タスクキル後も
  // 再アクセス時にログイン後の画面が表示されること」への根本対応。
  //
  // 真因: 旧実装は root LP が全ユーザー (ログイン済み・未ログイン共通) に LP を
  // 表示しており、ログイン済み user を /timeline へ redirect する処理が無かった。
  // そのため Cookie が 90 日有効でも、root にアクセスするたびに「ログインボタン
  // のある LP」が出て「毎回ログイン画面」と体感されていた。
  //
  // 修正: 既存 /auth/callback と同じパターンで、ログイン済みなら server-side
  // redirect する。
  //   - profile 有り → /timeline (タイムライン本体)
  //   - profile 無し → /onboarding (新規登録途中)
  // Server Component の redirect なので Cookie 復元前の flash が起きない。
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    redirect(profile ? '/timeline' : '/onboarding')
  }

  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  const userCount = Math.max(count ?? 0, 1)

  // Google Knowledge Graph 等にブランド名 (YVOICE / Your Voice Online) と
  // 公式 URL を伝える structured data。旧名 (Samee / 自由村) からの遷移を
  // 検索エンジン側で早めに認識させるため、ルート LP にだけ埋める。
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'YVOICE',
    alternateName: ['Your Voice Online', 'ワイボイス', 'ワイボ'],
    url: SITE_URL,
    logo: `${SITE_URL}/opengraph-image`,
    description: 'YVOICE (Your Voice Online) は 20 歳以上限定の大人向けゲーム通話コミュニティ。電話番号認証・本人確認・Trust Tier 制度で民度を守る。',
  }
  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'YVOICE',
    alternateName: 'Your Voice Online',
    url: SITE_URL,
    inLanguage: 'ja-JP',
  }

  return (
    <div className="min-h-screen flex flex-col max-w-[430px] mx-auto" style={{ background: '#080810' }}>
      {/* JSON-LD for Knowledge Graph branding */}
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }} />

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
          <YVoiceIcon size={32} rounded={10} />
          <span className="font-extrabold text-lg tracking-tight" style={{ color: '#F0EEFF' }}>
            <span style={{ color: '#9D5CFF' }}>Y</span>VOICE
          </span>
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
            style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
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

        {/* 価値バッジ：20歳以上限定 / 聞き専OK / 電話番号は非公開 */}
        <div className="flex flex-wrap justify-center gap-2 mb-7 relative">
          {[
            { icon: '🔞', text: '20歳以上限定' },
            { icon: '🎧', text: '聞き専OK' },
            { icon: '🔒', text: '電話番号は非公開' },
          ].map(b => (
            <div
              key={b.text}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}
            >
              <span className="text-xs">{b.icon}</span>
              <span className="text-[11px] font-bold" style={{ color: '#c4b5fd' }}>{b.text}</span>
            </div>
          ))}
        </div>

        {/* メインコピー — 「野良VCに疲れた大人へ」 */}
        <h1
          className="font-black text-center leading-[1.18] mb-4 tracking-tight relative"
          style={{ fontSize: '1.95rem', color: 'white' }}
        >
          野良VCに<br />
          <span
            style={{
              background: 'linear-gradient(135deg,#a78bfa 0%,#7c3aed 40%,#ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            疲れた大人へ。
          </span>
        </h1>

        {/* サブコピー — Your Voice Online の意味づけを併記 */}
        <p className="text-[10px] text-center font-bold tracking-[0.18em] uppercase mb-1.5 mx-auto relative" style={{ color: 'rgba(167,139,250,0.7)' }}>
          Your Voice Online
        </p>
        <p className="text-sm text-center leading-relaxed mb-8 mx-auto max-w-[320px] relative" style={{ color: '#cbd5e1' }}>
          ゲーム仲間と声でつながる、<br />
          20歳以上限定の大人向けゲーム通話コミュニティ。
        </p>

        {/* CTA — LP 全体で統一 */}
        <Link
          href="/signup"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-extrabold text-base active:scale-[0.98] transition-all mb-3 relative"
          style={{
            background: 'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
            color: 'white',
            boxShadow: '0 6px 28px rgba(139,92,246,0.55)',
          }}
        >
          無料で参加する <span className="text-sm opacity-80">— 30秒 →</span>
        </Link>
        <Link
          href="/login"
          className="flex items-center justify-center w-full py-3 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all relative"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', background: 'rgba(255,255,255,0.03)' }}
        >
          アカウントがある → ログイン
        </Link>
        <p className="text-center text-xs mt-3 relative" style={{ color: '#94a3b8' }}>
          無料・クレジットカード不要・電話番号は非公開
        </p>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          APP PREVIEW MOCKUP
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
            <YVoiceIcon size={24} rounded={8} />
            <span className="text-xs font-bold" style={{ color: '#F0EEFF' }}>
              <span style={{ color: '#9D5CFF' }}>Y</span>VOICE
            </span>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold">42人オンライン</span>
            </div>
          </div>
          {/* チャンネルリスト風 */}
          <div className="flex">
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
            <div className="flex-1 py-3 px-3 space-y-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs" style={{ color: 'rgba(139,92,246,0.7)' }}>#</span>
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>FPS雑談</span>
                <span className="ml-auto flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />LIVE
                </span>
              </div>
              {[
                { name: 'Ryota_29', msg: 'ヴァロ今夜やる人いる？', tier: '常連', tierColor: '#60a5fa', online: true },
                { name: 'Mai_gamer', msg: '参加します！ダイヤ帯です', tier: '信頼の村人', tierColor: '#a78bfa', online: true },
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
                    <p className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.85)' }}>{m.msg}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <span className="text-[10px] flex-1" style={{ color: 'rgba(255,255,255,0.35)' }}>#FPS雑談 にメッセージを送信</span>
                <span className="text-base">🎮</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] mt-2.5" style={{ color: '#64748b' }}>
          ※ イメージ画面です
        </p>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          WHY YVOICE — 攻撃的でない比較
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-5 pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-5"
          style={{ color: '#94a3b8' }}>
          なぜ YVOICE か
        </p>
        <div className="space-y-2.5">
          {[
            {
              concern: 'よくある野良VC：年齢層や雰囲気が合わないことがある',
              answer:  '20歳以上限定 + 電話認証で安心',
              icon: '🔞', color: '#a78bfa',
            },
            {
              concern: 'よくある悩み：匿名すぎて誰を信じていいか分からない',
              answer:  'Trust Tier制度で安心度が見える',
              icon: '🏅', color: '#fbbf24',
            },
            {
              concern: 'よくある悩み：ゲームの話がしたいのに雑談に埋もれる',
              answer:  'ジャンル別ギルドで探しやすい',
              icon: '🎮', color: '#ec4899',
            },
            {
              concern: 'よくある悩み：仲間募集してもなかなか集まらない',
              answer:  '通話ルームで今すぐ一緒に遊べる',
              icon: '🤝', color: '#10b981',
            },
          ].map(item => (
            <div
              key={item.icon}
              className="rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${item.color}30`, background: `${item.color}0c` }}
            >
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-[11px] leading-relaxed" style={{ color: '#94a3b8' }}>
                    {item.concern}
                  </p>
                  <p className="text-xs font-bold leading-snug" style={{ color: item.color }}>
                    → YVOICE：{item.answer}
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
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-5"
          style={{ color: '#94a3b8' }}>
          はじめ方
        </p>
        <div className="relative">
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
                desc: '1回だけ。荒らしや複数アカウント対策になります。電話番号は公開されません。',
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
                  <p className="text-sm font-extrabold text-white mb-1">{s.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#cbd5e1' }}>{s.desc}</p>
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
          無料で参加する — 30秒 →
        </Link>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          GENRES
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-4"
          style={{ color: '#94a3b8' }}>
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
        <p className="text-center text-xs mt-4 px-5" style={{ color: '#94a3b8' }}>
          同じゲームを語れる仲間が、ジャンルごとに集まっている
        </p>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TRUST TIER — 安心感を前面に
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
            <p className="text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: 'rgba(167,139,250,0.7)' }}>
              Trust Tier
            </p>
            <h2 className="text-base font-extrabold text-white mb-2 leading-snug">
              信頼が見えるから、安心してつながれる
            </h2>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: '#cbd5e1' }}>
              活動するほどできることが増える、YVOICE 独自の信頼度システム。
            </p>
            <div className="space-y-2">
              {[
                { icon: '🪴', label: '見習い',     desc: '登録直後 — まずは雰囲気を見学',     color: '#94a3b8' },
                { icon: '🏡', label: '村人',       desc: '電話認証後 — 投稿・通話に参加',     color: '#60a5fa' },
                { icon: '🌿', label: '常連',       desc: '活動継続 — 通話ルームを作れる',     color: '#34d399' },
                { icon: '🌳', label: '信頼の村人', desc: '実績あり — ギルドを作れる',         color: '#86efac' },
                { icon: '✨', label: '村の柱',     desc: '最高ランク — 全機能 + 金フレーム', color: '#fbbf24' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-base w-7 text-center flex-shrink-0">{t.icon}</span>
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold flex-shrink-0" style={{ color: t.color }}>{t.label}</span>
                    <span className="text-[10px] text-right leading-relaxed" style={{ color: '#cbd5e1' }}>{t.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t px-5 py-3.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[11px] leading-relaxed text-center" style={{ color: '#94a3b8' }}>
              電話認証 + Trust Tier で、安心して話せる環境を作っています
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FEATURES
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-5 pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-5"
          style={{ color: '#94a3b8' }}>
          YVOICEでできること
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
              <p className="text-[11px] leading-relaxed" style={{ color: '#cbd5e1' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          想定ユーザーの声（仮文言なので「実際の声」とは名乗らない）
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-5 pb-10">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-1"
          style={{ color: '#94a3b8' }}>
          想定ユーザーの声
        </p>
        <p className="text-[10px] text-center mb-5" style={{ color: '#64748b' }}>
          ※ こんな人に使ってほしい、という代表例です
        </p>
        <div className="space-y-3">
          {[
            {
              text: '野良VCで荒らしに会うたびに萎えてた。電話認証ある場所だと空気が違うかも。',
              name: '社会人 · 29歳 · FPSメイン',
              tier: '常連', tierColor: '#60a5fa',
            },
            {
              text: 'ランクもプレイ時間も似た人と集まれるなら、誘いやすいし誘われやすそう。',
              name: 'フリーランス · 33歳 · RPG',
              tier: '信頼の村人', tierColor: '#a78bfa',
            },
            {
              text: 'ジャンルマスター称号って楽しそう。ゲームみたいで好き。',
              name: '会社員 · 26歳 · スマホゲームメイン',
              tier: '村人', tierColor: '#4ade80',
            },
          ].map((v, i) => (
            <div
              key={i}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-sm leading-relaxed mb-3" style={{ color: '#e2e8f0' }}>「{v.text}」</p>
              <div className="flex items-center gap-2">
                <p className="text-xs flex-1" style={{ color: '#94a3b8' }}>{v.name}</p>
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
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-center mb-4"
          style={{ color: '#94a3b8' }}>
          こんな人に使ってほしい
        </p>
        <div className="space-y-2">
          {[
            { emoji: '🎮', text: '荒らし・煽りなしのゲームコミュニティで話したい' },
            { emoji: '🤝', text: '固定パーティー・フレンドを本気で探している' },
            { emoji: '🏆', text: 'ゲームの話を、同世代の大人同士でしたい' },
            { emoji: '🌙', text: '夜中に一緒にやれる仲間が欲しい' },
            { emoji: '💬', text: '野良VCも一般チャットも、もう少し落ち着いた場所がいい' },
            { emoji: '🌱', text: '初心者でも馬鹿にされない場所で始めたい' },
          ].map(item => (
            <div
              key={item.text}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span className="text-lg flex-shrink-0">{item.emoji}</span>
              <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{item.text}</p>
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
          <div className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(1px 1px at 15% 25%,white,transparent),radial-gradient(1.5px 1.5px at 75% 15%,white,transparent),radial-gradient(1px 1px at 85% 70%,white,transparent),radial-gradient(1px 1px at 35% 80%,white,transparent)' }} />

          <div className="relative">
            <p className="text-xs font-bold mb-5" style={{ color: 'rgba(196,181,253,0.85)' }}>
              20歳以上限定 · 聞き専OK · 電話番号は非公開
            </p>
            <h2 className="text-2xl font-extrabold text-white mb-3 leading-snug">
              落ち着いて話せる仲間と、<br />
              ゲームを楽しもう。
            </h2>
            <p className="text-xs mb-7" style={{ color: 'rgba(203,213,225,0.7)' }}>
              YVOICE — Your Voice Online<br />大人のゲーム通話コミュニティ
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
              無料で参加する →
            </Link>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              30秒で登録 · 無料 · クレジットカード不要
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FOOTER — Business リンクはここに格下げ
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer
        className="border-t px-5 py-6 text-center"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#080810' }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <YVoiceIcon size={24} rounded={8} />
          <span className="font-bold" style={{ color: '#cbd5e1' }}>
            <span style={{ color: '#9D5CFF' }}>Y</span>VOICE
          </span>
        </div>
        <p className="text-[10px] mb-1 tracking-widest uppercase font-bold" style={{ color: 'rgba(167,139,250,0.7)' }}>
          Your Voice Online
        </p>
        <p className="text-xs mb-3" style={{ color: '#94a3b8' }}>
          20歳以上限定の大人ゲーム通話コミュニティ
        </p>
        {/* 在籍数：控えめにフッターで表記。Hero では出さない（少なく見えるリスク回避） */}
        <p className="text-[10px] mb-4" style={{ color: '#64748b' }}>
          現在 {userCount.toLocaleString()} 人が登録中
        </p>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs" style={{ color: '#94a3b8' }}>
          <Link href="/terms"        className="hover:text-white transition">利用規約</Link>
          <Link href="/privacy"      className="hover:text-white transition">プライバシー</Link>
          <Link href="/safety"       className="hover:text-white transition">Safety Center</Link>
          <Link href="/contact"      className="hover:text-white transition">お問い合わせ</Link>
          <Link href="/for-business" className="hover:text-white transition">企業向け</Link>
        </div>
        <p className="text-xs mt-4" style={{ color: '#475569' }}>© 2026 YVOICE</p>
      </footer>

    </div>
  )
}
