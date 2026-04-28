// ─── 業界マスタ ────────────────────────────────────────────────
export const INDUSTRIES = [
  { id: 'IT・エンジニア',     emoji: '💻', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', gradient: 'linear-gradient(135deg,#60a5fa 0%,#2563eb 100%)' },
  { id: '医療・福祉',         emoji: '🏥', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', gradient: 'linear-gradient(135deg,#34d399 0%,#059669 100%)' },
  { id: '金融・保険',         emoji: '💰', color: '#d97706', bg: '#fffbeb', border: '#fde68a', gradient: 'linear-gradient(135deg,#fbbf24 0%,#d97706 100%)' },
  { id: '教育・学校',         emoji: '📚', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', gradient: 'linear-gradient(135deg,#a78bfa 0%,#7c3aed 100%)' },
  { id: '製造・メーカー',     emoji: '🏭', color: '#475569', bg: '#f8fafc', border: '#cbd5e1', gradient: 'linear-gradient(135deg,#94a3b8 0%,#475569 100%)' },
  { id: '小売・EC',           emoji: '🛍️', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', gradient: 'linear-gradient(135deg,#f472b6 0%,#db2777 100%)' },
  { id: '飲食・食品',         emoji: '🍽️', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', gradient: 'linear-gradient(135deg,#fb923c 0%,#ea580c 100%)' },
  { id: '建設・不動産',       emoji: '🏗️', color: '#92400e', bg: '#fef3c7', border: '#fde68a', gradient: 'linear-gradient(135deg,#fbbf24 0%,#92400e 100%)' },
  { id: 'メディア・広告',     emoji: '📣', color: '#be123c', bg: '#fff1f2', border: '#fecdd3', gradient: 'linear-gradient(135deg,#fb7185 0%,#be123c 100%)' },
  { id: 'コンサル・士業',     emoji: '🤝', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', gradient: 'linear-gradient(135deg,#60a5fa 0%,#1e40af 100%)' },
  { id: '物流・運輸',         emoji: '🚚', color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0', gradient: 'linear-gradient(135deg,#34d399 0%,#065f46 100%)' },
  { id: '公務員・行政',       emoji: '🏛️', color: '#374151', bg: '#f9fafb', border: '#e5e7eb', gradient: 'linear-gradient(135deg,#9ca3af 0%,#374151 100%)' },
  { id: 'サービス業',         emoji: '✂️', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', gradient: 'linear-gradient(135deg,#a78bfa 0%,#6d28d9 100%)' },
  { id: '経営・起業',         emoji: '💼', color: '#991b1b', bg: '#fef2f2', border: '#fecaca', gradient: 'linear-gradient(135deg,#f87171 0%,#991b1b 100%)' },
  { id: 'クリエイター',       emoji: '🎨', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', gradient: 'linear-gradient(135deg,#22d3ee 0%,#0891b2 100%)' },
  { id: 'フリーランス・副業', emoji: '🧑‍💻', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', gradient: 'linear-gradient(135deg,#818cf8 0%,#4f46e5 100%)' },
]

// ─── トピックタグ ───────────────────────────────────────────────
export const TOPIC_TAGS = [
  { id: '転職',         emoji: '🚀' },
  { id: '給与',         emoji: '💴' },
  { id: '職場の愚痴',   emoji: '😤' },
  { id: 'キャリア相談', emoji: '🧭' },
  { id: '副業',         emoji: '⚡' },
  { id: 'スキルアップ', emoji: '📈' },
  { id: '雑談',         emoji: '☕' },
]

// ─── リアクション ───────────────────────────────────────────────
export const REACTIONS = [
  { id: 'wakaru',  emoji: '👍', label: 'わかる'      },
  { id: 'tsurai',  emoji: '😢', label: 'つらいね'    },
  { id: 'hot',     emoji: '🔥', label: '熱い'        },
  { id: 'helpful', emoji: '💡', label: '参考になった' },
  { id: 'lol',     emoji: '😂', label: '笑った'      },
]

// ─── ヘルパー ───────────────────────────────────────────────────
export function getIndustry(id: string) {
  return INDUSTRIES.find(i => i.id === id) ?? INDUSTRIES[0]
}

export function getTopicTag(id: string) {
  return TOPIC_TAGS.find(t => t.id === id) ?? TOPIC_TAGS[6]
}

export function getTotalReactions(counts: Record<string, number> | null): number {
  if (!counts) return 0
  return Object.values(counts).reduce((s, v) => s + v, 0)
}
