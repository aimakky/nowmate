'use client'

import {
  ShieldCheck, BadgeCheck, AlertOctagon, Mic, MicOff, DoorOpen, PlusCircle,
  Sparkles, Gauge, Home, Pencil, HelpCircle, Heart, Wine,
  Flag, UserX, EyeOff, LifeBuoy, ShieldX, MessageSquare, Phone,
  Eye, Ban, Shield as ShieldDefault,
  type LucideIcon,
} from 'lucide-react'
import type { Rule } from '@/lib/rules'

const ICON_MAP: Record<string, LucideIcon> = {
  'shield-check':  ShieldCheck,
  'id-card':       BadgeCheck,
  'alert-octagon': AlertOctagon,
  'mic':           Mic,
  'mic-off':       MicOff,
  'door-open':     DoorOpen,
  'plus-circle':   PlusCircle,
  'sparkles':      Sparkles,
  'gauge':         Gauge,
  'home-plus':     Home,
  'edit':          Pencil,
  'help-circle':   HelpCircle,
  'heart':         Heart,
  'bottle':        Wine,
  'flag':          Flag,
  'user-x':        UserX,
  'eye-off':       EyeOff,
  'life-buoy':     LifeBuoy,
  'shield-x':      ShieldX,
  'message-square': MessageSquare,
  'phone':         Phone,
  'eye':           Eye,
  'ban':           Ban,
  'shield':        ShieldDefault,
}

interface Props {
  rule: Rule
  /** コンパクト表示（voice modal の 3-5 カード用） */
  compact?: boolean
}

export default function RuleCard({ rule, compact = false }: Props) {
  const Icon = ICON_MAP[rule.icon] ?? ShieldDefault
  return (
    <div
      className="rounded-2xl flex items-start gap-3 transition-colors"
      style={{
        padding: compact ? 14 : 18,
        background: hexToRgba(rule.color, 0.10),
        border: `1px solid ${hexToRgba(rule.color, 0.28)}`,
      }}
    >
      <div
        className="flex-shrink-0 rounded-xl flex items-center justify-center"
        style={{
          width:  compact ? 36 : 42,
          height: compact ? 36 : 42,
          background: hexToRgba(rule.color, 0.18),
          border: `1px solid ${hexToRgba(rule.color, 0.35)}`,
        }}
      >
        <Icon size={compact ? 18 : 22} color={rule.color} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <h3
          className="font-semibold leading-tight"
          style={{
            fontSize: compact ? 14 : 16,
            color: '#F0EEFF',
          }}
        >
          {rule.title}
        </h3>
        <p
          className="mt-1 leading-relaxed"
          style={{
            fontSize: compact ? 11.5 : 13,
            color: 'rgba(240,238,255,0.65)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {rule.description}
        </p>
      </div>
    </div>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '').match(/^([0-9a-fA-F]{6})$/)
  if (!m) return `rgba(139,92,246,${alpha})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}
