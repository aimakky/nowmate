// 安心ガイド（ルールブック）— データ層
//
// 設計：
//  - rules テーブル → Rule[] へ正規化（display_locations は string[]）
//  - sessionStorage キャッシュ（bundle_version 変化時のみ再フェッチ）
//  - displayLocations を引数にフィルタ + importance/order 順ソート

import { createClient } from '@/lib/supabase/client'

export type RuleCategory = 'critical' | 'voice' | 'community' | 'safety' | 'system'
export type RuleLocation = 'onboarding' | 'mypage' | 'voiceModal'

export interface Rule {
  id: string
  title: string
  description: string
  shortLabel: string
  category: RuleCategory
  importance: 1 | 2 | 3 | 4 | 5
  displayLocations: RuleLocation[]
  enabled: boolean
  order: number
  icon: string
  color: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface RulesBundle {
  bundleVersion: number
  rules: Rule[]
  fetchedAt: number
}

const CACHE_KEY = 'samee_rules_bundle_v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24h soft TTL（version 不変なら使い回す）

// ───────────────────────────────────────────────────────
// internal helpers
// ───────────────────────────────────────────────────────

function readCache(): RulesBundle | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RulesBundle
    if (!parsed?.rules || !Array.isArray(parsed.rules)) return null
    return parsed
  } catch { return null }
}

function writeCache(b: RulesBundle) {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(b)) } catch {}
}

function rowToRule(row: Record<string, unknown>): Rule {
  const locs = (row.display_locations as string[] | null) ?? []
  return {
    id:               String(row.id),
    title:            String(row.title),
    description:      String(row.description),
    shortLabel:       String(row.short_label),
    category:         row.category as RuleCategory,
    importance:       Number(row.importance) as Rule['importance'],
    displayLocations: locs.filter((l): l is RuleLocation =>
      l === 'onboarding' || l === 'mypage' || l === 'voiceModal'),
    enabled:          Boolean(row.enabled),
    order:            Number(row.order),
    icon:             String(row.icon),
    color:            String(row.color),
    version:          Number(row.version),
    createdAt:        String(row.created_at),
    updatedAt:        String(row.updated_at),
  }
}

// ───────────────────────────────────────────────────────
// public API
// ───────────────────────────────────────────────────────

export async function fetchRulesBundle(force = false): Promise<RulesBundle> {
  const supabase = createClient()

  // 1) bundle_version を先に読み、キャッシュと比較
  const { data: meta } = await supabase
    .from('rules_meta')
    .select('bundle_version')
    .eq('singleton', true)
    .maybeSingle()
  const remoteVersion = (meta?.bundle_version as number | undefined) ?? 1

  if (!force) {
    const cached = readCache()
    if (cached && cached.bundleVersion === remoteVersion
        && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached
    }
  }

  // 2) ルール本体を再取得
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('enabled', true)
    .order('importance', { ascending: false })
    .order('order',      { ascending: true  })
  if (error) throw error

  const rules = (data ?? []).map(rowToRule)
  const bundle: RulesBundle = { bundleVersion: remoteVersion, rules, fetchedAt: Date.now() }
  writeCache(bundle)
  return bundle
}

/** displayLocation でフィルタ */
export function filterByLocation(rules: Rule[], location: RuleLocation): Rule[] {
  return rules
    .filter(r => r.enabled && r.displayLocations.includes(location))
    .sort((a, b) => b.importance - a.importance || a.order - b.order)
}

/** 通話開始前モーダル用：critical + voice のみを 5 件に絞る */
export function pickVoiceModalRules(rules: Rule[], max = 5): Rule[] {
  return rules
    .filter(r => r.enabled
      && r.displayLocations.includes('voiceModal')
      && (r.category === 'critical' || r.category === 'voice'))
    .sort((a, b) => b.importance - a.importance || a.order - b.order)
    .slice(0, max)
}

/** カテゴリ別グルーピング */
export function groupByCategory(rules: Rule[]): Record<RuleCategory, Rule[]> {
  const out: Record<RuleCategory, Rule[]> = {
    critical: [], voice: [], community: [], safety: [], system: [],
  }
  for (const r of rules) out[r.category].push(r)
  return out
}

// ───────────────────────────────────────────────────────
// 同意管理
// ───────────────────────────────────────────────────────

export interface AgreementStatus {
  agreedVersion: number | null
  bundleVersion: number
  needsAgreement: boolean
}

export async function getAgreementStatus(userId: string): Promise<AgreementStatus> {
  const supabase = createClient()
  const [{ data: meta }, { data: ag }] = await Promise.all([
    supabase.from('rules_meta').select('bundle_version').eq('singleton', true).maybeSingle(),
    supabase.from('user_rule_agreements').select('agreed_version').eq('user_id', userId).maybeSingle(),
  ])
  const bundleVersion = (meta?.bundle_version as number | undefined) ?? 1
  const agreedVersion = (ag?.agreed_version as number | null | undefined) ?? null
  return {
    agreedVersion,
    bundleVersion,
    needsAgreement: agreedVersion === null || agreedVersion < bundleVersion,
  }
}

export async function recordAgreement(userId: string, bundleVersion: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('user_rule_agreements')
    .upsert({ user_id: userId, agreed_version: bundleVersion, agreed_at: new Date().toISOString() })
  if (error) throw error
}

// 通話開始前の「理解した」記録は同意とは別概念なので sessionStorage で保持
const VOICE_ACK_KEY = 'samee_voice_rules_ack_v1'
export function hasVoiceRulesAck(version: number): boolean {
  if (typeof window === 'undefined') return false
  try { return Number(sessionStorage.getItem(VOICE_ACK_KEY)) === version } catch { return false }
}
export function setVoiceRulesAck(version: number): void {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(VOICE_ACK_KEY, String(version)) } catch {}
}
