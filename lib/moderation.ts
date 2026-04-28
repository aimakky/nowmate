// ─── villia 共通モデレーション関数 ────────────────────────────
// villages/[id] と DriftBottle の両方で使用

export const NG_WORDS = [
  '死ね', 'しね', '殺す', 'ころす', 'キモい', 'きもい', 'うざい', 'ウザい',
  'バカ', 'ばか', 'アホ', 'あほ', 'クズ', 'くず', 'ゴミ', 'ごみ',
  '消えろ', 'きえろ', 'カス', 'かす', 'ブス', 'ぶす',
  'LINE教えて', 'line教えて', '連絡先教えて', 'インスタ教えて',
  '副業', '稼げる', '儲かる', 'ビジネス紹介', 'MLM', 'ネットワーク',
]

// ─── 危機キーワード（送信前に相談窓口を表示）─────────────────
export const CRISIS_KEYWORDS = [
  '死にたい', 'しにたい', '消えたい', 'きえたい', '消えてしまいたい',
  '死んでしまいたい', '生きていたくない', '自殺', 'じさつ',
  'もう終わりにしたい', '限界です', 'もう無理', '助けてください',
]

// ─── テキスト正規化（表記ゆれ対策）──────────────────────────
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // 全角→半角
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    // スペース・空白・記号を除去
    .replace(/[\s　 ​‌‍﻿・。、！？!?　]/g, '')
    // 数字→読み替え（4ne → しね 等）
    .replace(/4/g, 'し').replace(/9/g, 'く').replace(/0/g, 'お')
    // よくある置き換え表記
    .replace(/ｼﾇ|ｼﾈ/g, 'しね')
    // カタカナ→ひらがな
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

// ─── NGワード検出 ─────────────────────────────────────────────
export function detectNgWords(text: string): string | null {
  const normalized = normalizeText(text)
  const found = NG_WORDS.find(w => normalized.includes(normalizeText(w)))
  return found ?? null
}

// ─── 危機キーワード検出 ───────────────────────────────────────
export function detectCrisisKeywords(text: string): boolean {
  const normalized = normalizeText(text)
  return CRISIS_KEYWORDS.some(k => normalized.includes(normalizeText(k)))
}

// ─── 1日の送信回数制限（localStorage）────────────────────────
const BOTTLE_SEND_KEY   = 'villia_bottle_sends'   // JSON: { date: "YYYY-MM-DD", count: n }
export const BOTTLE_DAILY_LIMIT = 3

export function getBottleSendCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(BOTTLE_SEND_KEY)
    if (!raw) return 0
    const { date, count } = JSON.parse(raw)
    const today = new Date().toISOString().slice(0, 10)
    return date === today ? count : 0
  } catch { return 0 }
}

export function incrementBottleSendCount() {
  if (typeof window === 'undefined') return
  const today = new Date().toISOString().slice(0, 10)
  const count = getBottleSendCount() + 1
  localStorage.setItem(BOTTLE_SEND_KEY, JSON.stringify({ date: today, count }))
}
