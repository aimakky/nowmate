import Link from 'next/link'

const MEASURES = [
  {
    icon: '📱',
    title: '電話番号認証（必須）',
    desc: '全ユーザーが電話番号で本人認証。匿名アカウントや使い捨てアカウントによる荒らしを根本から防ぎます。',
    badge: '実装済み',
  },
  {
    icon: '🛡️',
    title: 'AutoMod（自動NGワード検出）',
    desc: '誹謗中傷・スパム・勧誘ワードを投稿前に自動検出。表記ゆれ・半角全角・スペース挿入にも対応した高精度フィルタリング。',
    badge: '実装済み',
  },
  {
    icon: '🆘',
    title: '危機介入システム',
    desc: '「死にたい」などのキーワードを検知すると、よりそいホットライン（0120-279-338）を即座に表示。投稿はブロックせず、まず繋がりを優先します。',
    badge: '実装済み',
  },
  {
    icon: '🚨',
    title: 'シャドウバン制度',
    desc: '通報が一定数を超えると自動的に投稿の表示が制限されます（5件：7日 / 10件：30日 / 20件：永久）。アカウント停止ではないため、異議申し立ても可能。',
    badge: '実装済み',
  },
  {
    icon: '🔁',
    title: '集団通報防止',
    desc: '同一ユーザーからの重複通報は1票としてカウント。組織的な嫌がらせによる不当なBANを防ぎます。',
    badge: '実装済み',
  },
  {
    icon: '⏱️',
    title: 'スローモード（投稿間隔制限）',
    desc: '連続投稿を防ぐため、投稿間に2分のクールダウンを設定。荒らし行為・スパムを物理的に抑制します。',
    badge: '実装済み',
  },
  {
    icon: '🎯',
    title: 'Trust Tier（信頼スコア制度）',
    desc: 'ユーザーの行動実績（投稿数・参加日数・通報受信数）に基づくtier制度。高ティアユーザーだけが特定機能を利用でき、荒らしは自然に排除されます。',
    badge: '実装済み',
  },
  {
    icon: '🌊',
    title: '漂流瓶の民度対策',
    desc: '匿名相談機能「漂流瓶」に8層の保護を実装。返信者をregular以上に限定・返信にもAutoMod適用・1日3通制限・SNSシェア時は内容を非表示。',
    badge: '実装済み',
  },
  {
    icon: '🎙️',
    title: 'ボイスルーム録音禁止',
    desc: '参加前に録音・録画禁止への同意を確認。会話内容は一切録音・保存しません（参加記録のみ保持）。',
    badge: '実装済み',
  },
  {
    icon: '🗄️',
    title: 'コンテンツログ保全',
    desc: '削除されたコンテンツも180日間バックアップとして保持。裁判所・捜査機関からの発信者情報開示請求に適法に対応できる体制を整えています。',
    badge: '実装済み',
  },
  {
    icon: '⚖️',
    title: '発信者情報開示対応',
    desc: 'プロバイダ責任制限法に準拠。被害者からの開示請求・捜査機関からの令状に対して、適法な手続きに従い対応します。',
    badge: '法的整備済み',
  },
  {
    icon: '🏛️',
    title: '管理者優先スコアリング',
    desc: '通報を危険度・悪質度で自動スコアリング（重大度・通報数・報告者ティア等）。管理者が最も深刻な案件から対応できる優先キューを構築。',
    badge: '実装済み',
  },
]

const CRISIS_LINES = [
  { name: 'よりそいホットライン', number: '0120-279-338', hours: '24時間365日', note: '無料・全国対応' },
  { name: 'いのちの電話', number: '0120-783-556', hours: '毎日16時〜21時', note: '無料' },
  { name: '子どもの人権110番', number: '0120-007-110', hours: '平日8:30〜17:15', note: '18歳以下向け' },
  { name: '警察相談専用電話', number: '#9110', hours: '24時間', note: '緊急でない相談' },
  { name: '緊急（警察・救急）', number: '110 / 119', hours: '24時間', note: '生命の危機の場合' },
]

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* ヘッダー */}
      <div className="bg-white px-5 py-4 border-b border-stone-100 flex items-center gap-3">
        <Link href="/" className="text-sm text-brand-500">← Back</Link>
        <span className="text-stone-300">|</span>
        <h1 className="text-sm font-bold text-stone-700">Safety Center — 安心・安全への取り組み</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* ヒーロー */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-3xl p-6 text-white text-center shadow-lg">
          <p className="text-4xl mb-3">🛡️</p>
          <h2 className="text-xl font-extrabold mb-2">villiaは「民度」を設計します</h2>
          <p className="text-sm text-brand-100 leading-relaxed">
            コミュニティの質は、ルールではなく設計で決まります。<br />
            villiaは技術・法律・コミュニティデザインの3層で、<br />
            日本最高水準の安全なコミュニティを目指しています。
          </p>
        </div>

        {/* 対策一覧 */}
        <div>
          <h2 className="text-base font-extrabold text-stone-800 mb-3 px-1">✅ 実装している安全対策</h2>
          <div className="space-y-3">
            {MEASURES.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl px-4 py-4 border border-stone-100 shadow-sm flex gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-stone-900">{m.title}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 危機相談窓口 */}
        <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm">
          <h2 className="text-base font-extrabold text-stone-800 mb-1">🆘 相談窓口</h2>
          <p className="text-xs text-stone-500 mb-4">辛いとき・助けが必要なときは、ひとりで抱え込まないでください。</p>
          <div className="space-y-3">
            {CRISIS_LINES.map((line, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-2.5 border-b border-stone-100 last:border-0">
                <div>
                  <p className="text-sm font-bold text-stone-800">{line.name}</p>
                  <p className="text-[11px] text-stone-400">{line.hours}　{line.note}</p>
                </div>
                <a
                  href={`tel:${line.number.replace(/[^0-9#]/g, '')}`}
                  className="flex-shrink-0 px-3 py-1.5 bg-red-50 text-red-600 font-bold text-xs rounded-xl border border-red-100 active:scale-95 transition-all"
                >
                  {line.number}
                </a>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-stone-400 mt-3 leading-relaxed">
            ※ villiaはコミュニティサービスであり、精神的健康サポートの専門機関ではありません。危機状態の方は必ず上記の専門機関にご相談ください。
          </p>
        </div>

        {/* 通報の仕方 */}
        <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm">
          <h2 className="text-base font-extrabold text-stone-800 mb-3">🚩 問題を報告する</h2>
          <div className="space-y-3">
            {[
              { step: '1', title: '投稿・メッセージの右上のメニューを開く', icon: '⋯' },
              { step: '2', title: '「通報する」を選択', icon: '🚩' },
              { step: '3', title: '理由を選んで送信', icon: '📤' },
              { step: '4', title: '運営が確認し、必要に応じて対処します', icon: '👁️' },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                  {s.step}
                </span>
                <p className="text-sm text-stone-700">{s.icon} {s.title}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-700">
              <strong>集団通報・嫌がらせ通報は無効です。</strong>同一ユーザーからの複数通報は1票、過度な通報はペナルティの対象となります。
            </p>
          </div>
        </div>

        {/* 関連リンク */}
        <div className="flex flex-col gap-2">
          <Link href="/terms" className="flex items-center justify-between bg-white rounded-2xl px-4 py-3.5 border border-stone-100 shadow-sm">
            <span className="text-sm font-bold text-stone-700">📄 利用規約</span>
            <span className="text-stone-300 text-sm">→</span>
          </Link>
          <Link href="/privacy" className="flex items-center justify-between bg-white rounded-2xl px-4 py-3.5 border border-stone-100 shadow-sm">
            <span className="text-sm font-bold text-stone-700">🔒 プライバシーポリシー</span>
            <span className="text-stone-300 text-sm">→</span>
          </Link>
          <Link href="/contact" className="flex items-center justify-between bg-white rounded-2xl px-4 py-3.5 border border-stone-100 shadow-sm">
            <span className="text-sm font-bold text-stone-700">✉️ 運営へ問い合わせ</span>
            <span className="text-stone-300 text-sm">→</span>
          </Link>
        </div>

        <p className="text-center text-xs text-stone-400 pb-8">
          villiaは日本の民度ある大人コミュニティを目指しています。<br />
          ご意見・ご提案はいつでも歓迎します。
        </p>
      </div>
    </div>
  )
}
