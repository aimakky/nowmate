'use client'

import {
  Users, Cake, Briefcase, Ear, DoorOpen, Lock, Phone, Monitor,
  Gamepad2, Shield, List, MessageSquare, Sparkles, ShieldX, Wand2,
  HelpCircle, type LucideIcon,
} from 'lucide-react'
import type { FeatureGuide, FeatureLockReason } from '@/lib/feature-guides'

const ICON_MAP: Record<string, LucideIcon> = {
  users:         Users,
  cake:          Cake,
  briefcase:     Briefcase,
  ear:           Ear,
  'door-open':   DoorOpen,
  lock:          Lock,
  phone:         Phone,
  monitor:       Monitor,
  gamepad:       Gamepad2,
  shield:        Shield,
  list:          List,
  'message-square': MessageSquare,
  sparkles:      Sparkles,
  'shield-x':    ShieldX,
  wand:          Wand2,
}

function hexA(hex: string, a: number): string {
  const m = hex.replace('#', '').match(/^([0-9a-fA-F]{6})$/)
  if (!m) return `rgba(139,92,246,${a})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function lockLabel(reason: FeatureLockReason, f: FeatureGuide): string | null {
  if (!reason) return null
  if (reason === 'verified') return '本人確認で解放'
  if (reason === 'age')      return `${f.requiredAge ?? 20}歳以上で解放`
  if (reason === 'tier')     return `Tier ${f.minTrustTier} で解放`
  return null
}

interface Props {
  feature: FeatureGuide
  lockReason?: FeatureLockReason
  onAction?: () => void
}

export default function FeatureCard({ feature, lockReason = null, onAction }: Props) {
  const Icon = ICON_MAP[feature.icon] ?? HelpCircle
  const locked = !!lockReason
  const label = lockLabel(lockReason, feature)

  return (
    <div
      className="rounded-2xl transition-all"
      style={{
        padding: 18,
        background: hexA(feature.color, locked ? 0.06 : 0.10),
        border:     `1px solid ${hexA(feature.color, locked ? 0.16 : 0.28)}`,
        opacity:    locked ? 0.7 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 rounded-xl flex items-center justify-center"
          style={{
            width: 42, height: 42,
            background: hexA(feature.color, 0.18),
            border: `1px solid ${hexA(feature.color, 0.35)}`,
          }}
        >
          <Icon size={22} color={feature.color} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold leading-tight" style={{ fontSize: 16, color: '#F0EEFF' }}>
              {feature.title}
            </h3>
            {label && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: hexA(feature.color, 0.18),
                  color: feature.color,
                  border: `1px solid ${hexA(feature.color, 0.4)}`,
                }}>
                {label}
              </span>
            )}
          </div>
          <p className="mt-1.5 leading-relaxed"
            style={{ fontSize: 13, color: 'rgba(240,238,255,0.65)' }}>
            {feature.description}
          </p>
          {feature.example && (
            <p className="mt-2 leading-relaxed"
              style={{
                fontSize: 12,
                color: 'rgba(240,238,255,0.45)',
                paddingLeft: 10,
                borderLeft: `2px solid ${hexA(feature.color, 0.4)}`,
              }}>
              {feature.example}
            </p>
          )}
          {!locked && feature.firstAction && onAction && (
            <button
              onClick={onAction}
              className="mt-3 px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-all"
              style={{
                background: hexA(feature.color, 0.20),
                color:      feature.color,
                border:     `1px solid ${hexA(feature.color, 0.45)}`,
              }}
            >
              {feature.firstAction} →
            </button>
          )}
          {!locked && feature.firstAction && !onAction && (
            <p className="mt-2.5 text-[11px]"
              style={{ color: 'rgba(240,238,255,0.45)' }}>
              ↳ {feature.firstAction}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
