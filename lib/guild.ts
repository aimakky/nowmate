// ─── ゲームジャンルマスタ ───────────────────────────────────────
export const INDUSTRIES = [
  { id: 'FPS・TPS',       emoji: '🎯', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', gradient: 'linear-gradient(135deg,#f87171 0%,#ef4444 100%)' },
  { id: 'RPG',            emoji: '⚔️', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', gradient: 'linear-gradient(135deg,#a78bfa 0%,#8b5cf6 100%)' },
  { id: 'アクション',     emoji: '🔥', color: '#f97316', bg: '#fff7ed', border: '#fed7aa', gradient: 'linear-gradient(135deg,#fb923c 0%,#f97316 100%)' },
  { id: 'スポーツ',       emoji: '⚽', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', gradient: 'linear-gradient(135deg,#34d399 0%,#10b981 100%)' },
  { id: 'スマホゲーム',   emoji: '📱', color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8', gradient: 'linear-gradient(135deg,#f472b6 0%,#ec4899 100%)' },
  { id: 'シミュレーション',emoji: '🧠', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', gradient: 'linear-gradient(135deg,#22d3ee 0%,#0891b2 100%)' },
  { id: 'パズル・カジュアル',emoji: '🧩',color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', gradient: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)' },
  { id: 'インディー',     emoji: '🌱', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', gradient: 'linear-gradient(135deg,#34d399 0%,#059669 100%)' },
  { id: 'レトロゲーム',   emoji: '🕹️', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', gradient: 'linear-gradient(135deg,#818cf8 0%,#6366f1 100%)' },
  { id: '雑談・その他',   emoji: '💬', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', gradient: 'linear-gradient(135deg,#94a3b8 0%,#64748b 100%)' },
]

// ─── トピックタグ ───────────────────────────────────────────────
export const TOPIC_TAGS = [
  { id: '攻略',     emoji: '📖' },
  { id: '雑談',     emoji: '☕' },
  { id: '仲間募集', emoji: '🤝' },
  { id: '日記',     emoji: '📝' },
  { id: '質問',     emoji: '❓' },
  { id: 'ネタ',     emoji: '😂' },
  { id: '愚痴',     emoji: '😤' },
]

// ─── リアクション ───────────────────────────────────────────────
export const REACTIONS = [
  { id: 'gg',      emoji: '🎮', label: 'GG'       },
  { id: 'tsuyoi',  emoji: '💪', label: 'つよい'   },
  { id: 'wakaru',  emoji: '👍', label: 'わかる'   },
  { id: 'kusa',    emoji: '🌿', label: '草'        },
  { id: 'helpful', emoji: '💡', label: '参考になった' },
]

// ─── ジャンルマスター称号 ────────────────────────────────────────
export const GENRE_MASTER_THRESHOLD = 3  // 同ジャンル村に3つ参加で称号付与

/** 村参加後に呼ぶ。新たに取得した称号を返す（空配列なら未達成） */
export async function checkGenreMastery(userId: string): Promise<{ genre: string; is_new: boolean }[]> {
  const { createClient } = await import('./supabase/client')
  const supabase = createClient()
  const { data, error } = await supabase.rpc('check_genre_mastery', { p_user_id: userId })
  if (error || !data) return []
  return data as { genre: string; is_new: boolean }[]
}

/** ユーザーの全称号を取得 */
export async function getGenreTitles(userId: string) {
  const { createClient } = await import('./supabase/client')
  const supabase = createClient()
  const { data } = await supabase
    .from('genre_titles')
    .select('genre, awarded_at')
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false })
  return data ?? []
}

// ─── ヘルパー ───────────────────────────────────────────────────
export function getIndustry(id: string) {
  return INDUSTRIES.find(i => i.id === id) ?? INDUSTRIES[9]
}

export function getTopicTag(id: string) {
  return TOPIC_TAGS.find(t => t.id === id) ?? TOPIC_TAGS[1]
}

export function getTotalReactions(counts: Record<string, number> | null): number {
  if (!counts) return 0
  return Object.values(counts).reduce((s, v) => s + v, 0)
}
