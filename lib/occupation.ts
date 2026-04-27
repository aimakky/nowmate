// ─── 大カテゴリマップ（詳細職種 → 大カテゴリ）────────────────
export const OCCUPATION_CATEGORY_MAP: Record<string, { label: string; emoji: string }> = {
  // 医療・福祉系
  '看護師':       { label: '医療・福祉系', emoji: '🏥' },
  '医師':         { label: '医療・福祉系', emoji: '🏥' },
  '薬剤師':       { label: '医療・福祉系', emoji: '🏥' },
  '歯科':         { label: '医療・福祉系', emoji: '🏥' },
  '介護士':       { label: '医療・福祉系', emoji: '🏥' },
  // 教育・研究系
  '教師':         { label: '教育・研究系', emoji: '📚' },
  '研究者':       { label: '教育・研究系', emoji: '📚' },
  // IT・クリエイター系
  'エンジニア':   { label: 'IT・クリエイター系', emoji: '💻' },
  'デザイナー':   { label: 'IT・クリエイター系', emoji: '💻' },
  'クリエイター': { label: 'IT・クリエイター系', emoji: '💻' },
  'マーケター':   { label: 'IT・クリエイター系', emoji: '💻' },
  // ビジネス・オフィス系
  '営業':         { label: 'ビジネス・オフィス系', emoji: '💼' },
  '経理':         { label: 'ビジネス・オフィス系', emoji: '💼' },
  '法律職':       { label: 'ビジネス・オフィス系', emoji: '💼' },
  'コンサル':     { label: 'ビジネス・オフィス系', emoji: '💼' },
  '金融':         { label: 'ビジネス・オフィス系', emoji: '💼' },
  '人事':         { label: 'ビジネス・オフィス系', emoji: '💼' },
  // 公共・インフラ系
  '公務員':       { label: '公共・インフラ系', emoji: '🏛️' },
  '警察消防':     { label: '公共・インフラ系', emoji: '🏛️' },
  '建築士':       { label: '公共・インフラ系', emoji: '🏛️' },
  '航空交通':     { label: '公共・インフラ系', emoji: '🏛️' },
  '物流':         { label: '公共・インフラ系', emoji: '🏛️' },
  // サービス・現場系
  '飲食':         { label: 'サービス・現場系', emoji: '🛒' },
  'サービス業':   { label: 'サービス・現場系', emoji: '🛒' },
  '農林水産':     { label: 'サービス・現場系', emoji: '🛒' },
  '製造業':       { label: 'サービス・現場系', emoji: '🛒' },
  '不動産':       { label: 'サービス・現場系', emoji: '🛒' },
  // その他・フリー
  '経営者':       { label: 'その他・フリー', emoji: '🌀' },
  '転職活動中':   { label: 'その他・フリー', emoji: '🌀' },
  'その他':       { label: 'その他・フリー', emoji: '🌀' },
  // 大カテゴリ自体が選択された場合のフォールバック
  '医療・福祉系':       { label: '医療・福祉系',       emoji: '🏥' },
  '教育・研究系':       { label: '教育・研究系',       emoji: '📚' },
  'IT・クリエイター系': { label: 'IT・クリエイター系', emoji: '💻' },
  'ビジネス・オフィス系':{ label: 'ビジネス・オフィス系', emoji: '💼' },
  '公共・インフラ系':   { label: '公共・インフラ系',   emoji: '🏛️' },
  'サービス・現場系':   { label: 'サービス・現場系',   emoji: '🛒' },
  'その他・フリー':     { label: 'その他・フリー',     emoji: '🌀' },
}

export function getBigCategory(occupation: string | null | undefined): { label: string; emoji: string } | null {
  if (!occupation) return null
  return OCCUPATION_CATEGORY_MAP[occupation] ?? null
}

// 職業 → 絵文字マップ（サービス全体で共有）
export const OCCUPATION_EMOJI: Record<string, string> = {
  '看護師':      '🏥',
  '医師':        '👨‍⚕️',
  '薬剤師':      '💊',
  '歯科':        '🦷',
  '介護士':      '🤲',
  '教師':        '📚',
  'エンジニア':  '💻',
  'デザイナー':  '🎨',
  '営業':        '📊',
  '経理':        '💰',
  'マーケター':  '📣',
  '法律職':      '⚖️',
  '公務員':      '🏛️',
  '警察消防':    '👮',
  '建築士':      '🏗️',
  '航空交通':    '✈️',
  '飲食':        '🍳',
  'サービス業':  '🛒',
  'クリエイター':'🎬',
  '農林水産':    '🌾',
  '製造業':      '🏭',
  '物流':        '📦',
  '不動産':      '🏠',
  'コンサル':    '💼',
  '金融':        '🏦',
  '人事':        '👤',
  '研究者':      '🔬',
  '経営者':      '🚀',
  '転職活動中':  '🔄',
  'その他':      '💼',
}

export function getOccupationEmoji(occupation: string | null | undefined): string {
  if (!occupation) return '💼'
  return OCCUPATION_EMOJI[occupation] ?? '💼'
}

// アバター下に表示するバッジ用（短縮ラベル付き）
export function getOccupationBadge(occupation: string | null | undefined): { emoji: string; label: string } | null {
  if (!occupation || occupation === 'その他') return null
  return {
    emoji: getOccupationEmoji(occupation),
    label: occupation,
  }
}
