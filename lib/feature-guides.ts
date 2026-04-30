// 機能ガイド（できること紹介）— データ層
//
// 安心ガイド（lib/rules.ts）と同じパターン:
//  - feature_guides + feature_guide_meta から fetch
//  - sessionStorage キャッシュ（bundle_version 不変なら使い回し）
//  - displayLocations フィルタ + 条件分岐（trust tier / verified / age）

import { createClient } from '@/lib/supabase/client'

export type FeatureCategory =
  | 'voice' | 'community' | 'fun' | 'safety' | 'system' | 'browse' | string

export type FeatureLocation =
  | 'onboarding' | 'mypage' | 'voiceModal' | 'home' | string

export interface FeatureGuide {
  id: string
  title: string
  shortLabel: string
  description: string
  example: string
  category: FeatureCategory
  icon: string
  color: string
  displayLocations: FeatureLocation[]
  enabled: boolean
  order: number
  minTrustTier: number | null
  requiredVerified: boolean
  requiredAge: number | null
  firstAction: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export interface AnxietyMessage {
  key: string
  title: string
  candidates: string[]
}
export interface StarterStep {
  step: number
  title: string
  hint: string
}

export interface FeatureGuideMeta {
  bundleVersion: number
  catchcopies: string[]
  anxietyMessages: AnxietyMessage[]
  starterFlow: StarterStep[]
}

export interface FeatureGuideBundle {
  meta: FeatureGuideMeta
  features: FeatureGuide[]
  fetchedAt: number
}

const CACHE_KEY = 'samee_feature_guides_v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24

// ───────────────────────────────────────────────
function readCache(): FeatureGuideBundle | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as FeatureGuideBundle
    if (!p?.features || !Array.isArray(p.features)) return null
    return p
  } catch { return null }
}
function writeCache(b: FeatureGuideBundle) {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(b)) } catch {}
}

function rowToFeature(row: Record<string, unknown>): FeatureGuide {
  const locs = (row.display_locations as string[] | null) ?? []
  return {
    id:               String(row.id),
    title:            String(row.title),
    shortLabel:       String(row.short_label),
    description:      String(row.description),
    example:          String(row.example ?? ''),
    category:         (row.category as string) ?? 'community',
    icon:             (row.icon as string) ?? 'sparkles',
    color:            (row.color as string) ?? '#8B5CF6',
    displayLocations: locs,
    enabled:          Boolean(row.enabled),
    order:            Number(row.order ?? 0),
    minTrustTier:     row.min_trust_tier === null || row.min_trust_tier === undefined
                        ? null : Number(row.min_trust_tier),
    requiredVerified: Boolean(row.required_verified),
    requiredAge:      row.required_age === null || row.required_age === undefined
                        ? null : Number(row.required_age),
    firstAction:      row.first_action === null || row.first_action === undefined
                        ? null : String(row.first_action),
    version:          Number(row.version ?? 1),
    createdAt:        String(row.created_at ?? ''),
    updatedAt:        String(row.updated_at ?? ''),
  }
}

// ───────────────────────────────────────────────
export async function fetchFeatureGuideBundle(force = false): Promise<FeatureGuideBundle> {
  const supabase = createClient()

  // version を先に確認してキャッシュ判定
  const { data: meta } = await supabase
    .from('feature_guide_meta')
    .select('bundle_version, catchcopies, anxiety_messages, starter_flow')
    .eq('singleton', true)
    .maybeSingle()
  const remoteVersion = (meta?.bundle_version as number | undefined) ?? 1

  if (!force) {
    const cached = readCache()
    if (cached
        && cached.meta.bundleVersion === remoteVersion
        && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached
    }
  }

  const { data, error } = await supabase
    .from('feature_guides')
    .select('*')
    .eq('enabled', true)
    .order('order', { ascending: true })
  if (error) throw error

  const features = (data ?? []).map(rowToFeature)
  const bundle: FeatureGuideBundle = {
    meta: {
      bundleVersion:   remoteVersion,
      catchcopies:     ((meta?.catchcopies as unknown[]) ?? []).map(s => String(s)),
      anxietyMessages: ((meta?.anxiety_messages as unknown[]) ?? []).map(m => {
        const o = m as Record<string, unknown>
        return {
          key: String(o.key ?? ''),
          title: String(o.title ?? ''),
          candidates: (o.candidates as string[] | undefined) ?? [],
        }
      }),
      starterFlow: ((meta?.starter_flow as unknown[]) ?? []).map(s => {
        const o = s as Record<string, unknown>
        return {
          step: Number(o.step ?? 0),
          title: String(o.title ?? ''),
          hint: String(o.hint ?? ''),
        }
      }),
    },
    features,
    fetchedAt: Date.now(),
  }
  writeCache(bundle)
  return bundle
}

// ───────────────────────────────────────────────
// 表示制御 / 条件分岐
// ───────────────────────────────────────────────

export interface UserGateContext {
  /** undefined = 未取得（保守的に最低条件で判定） */
  trustTier?: number
  verified?: boolean
  age?: number | null
}

export type FeatureLockReason =
  | 'tier'        // Trust Tier 不足
  | 'verified'    // 本人確認未完了
  | 'age'         // 年齢条件未満
  | null

/** 機能がそのユーザーに対して開放されているか */
export function evaluateLock(f: FeatureGuide, ctx: UserGateContext): FeatureLockReason {
  if (f.requiredVerified && ctx.verified !== true) return 'verified'
  if (f.requiredAge !== null && (ctx.age ?? 0) < f.requiredAge) return 'age'
  if (f.minTrustTier !== null && (ctx.trustTier ?? 0) < f.minTrustTier) return 'tier'
  return null
}

/** displayLocation でフィルタしつつ、locked も含めて返す */
export function pickByLocation(features: FeatureGuide[], location: FeatureLocation): FeatureGuide[] {
  return features
    .filter(f => f.enabled && f.displayLocations.includes(location))
    .sort((a, b) => a.order - b.order)
}

/** カテゴリ別に group。category 値が増えても自動で枠ができる */
export function groupByCategory(features: FeatureGuide[]): Record<string, FeatureGuide[]> {
  const out: Record<string, FeatureGuide[]> = {}
  for (const f of features) {
    if (!out[f.category]) out[f.category] = []
    out[f.category].push(f)
  }
  return out
}
