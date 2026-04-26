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
