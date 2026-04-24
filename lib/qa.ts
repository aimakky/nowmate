// ─── Q&A カテゴリ ─────────────────────────────────────────────
export const QA_CATEGORIES = [
  {
    id:      '恋愛・人間関係',
    emoji:   '💕',
    color:   '#e11d48',
    bg:      '#fff1f2',
    border:  '#fecdd3',
    gradient:'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
  },
  {
    id:      '仕事・キャリア',
    emoji:   '💼',
    color:   '#4338ca',
    bg:      '#eef2ff',
    border:  '#c7d2fe',
    gradient:'linear-gradient(135deg, #818cf8 0%, #4338ca 100%)',
  },
  {
    id:      '健康・メンタル',
    emoji:   '🏥',
    color:   '#059669',
    bg:      '#ecfdf5',
    border:  '#a7f3d0',
    gradient:'linear-gradient(135deg, #34d399 0%, #059669 100%)',
  },
  {
    id:      'お金・生活',
    emoji:   '💰',
    color:   '#d97706',
    bg:      '#fffbeb',
    border:  '#fde68a',
    gradient:'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
  },
  {
    id:      '趣味・エンタメ',
    emoji:   '🎮',
    color:   '#7c3aed',
    bg:      '#f5f3ff',
    border:  '#ddd6fe',
    gradient:'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
  },
  {
    id:      'なんでも相談',
    emoji:   '🌿',
    color:   '#57534e',
    bg:      '#fafaf9',
    border:  '#d6d3d1',
    gradient:'linear-gradient(135deg, #a8a29e 0%, #57534e 100%)',
  },
]

export function getCategoryStyle(id: string) {
  return QA_CATEGORIES.find(c => c.id === id) ?? QA_CATEGORIES[5]
}

// ─── 称号マップ ────────────────────────────────────────────────
export const QA_TITLE_MAP: Record<string, Record<string, string>> = {
  '恋愛・人間関係': { bronze: '恋愛アドバイザー',   silver: '恋愛カウンセラー',     gold: '💕 恋愛マスター'   },
  '仕事・キャリア': { bronze: '仕事の先輩',         silver: 'キャリアアドバイザー',  gold: '💼 仕事の達人'     },
  '健康・メンタル': { bronze: '健康の味方',         silver: 'メンタルサポーター',    gold: '🏥 心の守護者'     },
  'お金・生活':     { bronze: '節約上手',           silver: 'マネーアドバイザー',    gold: '💰 お金の賢人'     },
  '趣味・エンタメ': { bronze: '趣味人',             silver: '趣味マイスター',        gold: '🎮 趣味の神'       },
  'なんでも相談':   { bronze: '親切な住民',         silver: '頼れる住民',            gold: '✨ 村の知恵袋'     },
}

export const TITLE_LEVEL_STYLE: Record<string, { badge: string; label: string }> = {
  bronze: { badge: '🥉', label: '銅' },
  silver: { badge: '🥈', label: '銀' },
  gold:   { badge: '🥇', label: '金' },
}

export function getTitleName(category: string, level: string): string {
  return QA_TITLE_MAP[category]?.[level] ?? '村の相談役'
}

// ─── ベストアンサー閾値 ────────────────────────────────────────
export const BA_THRESHOLDS = { bronze: 5, silver: 20, gold: 50 }

// ─── 匿名表示名（Tierアイコン + ロール） ──────────────────────
export const ANON_DISPLAY: Record<string, string> = {
  visitor:  '🪴 見習い',
  resident: '🏡 住民',
  regular:  '🌿 常連',
  trusted:  '🌳 信頼の住民',
  pillar:   '✨ 村の柱',
}

export function getAnonDisplay(tier: string): string {
  return ANON_DISPLAY[tier] ?? '🌿 住民'
}
