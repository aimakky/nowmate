'use client'
// v3 — lucide Gamepad2 wrapper
import { Gamepad2 } from 'lucide-react'

interface Props {
  size?: number
  active?: boolean
  color?: string
}

export default function GamepadIcon({ size = 22, active = false, color = '#8B5CF6' }: Props) {
  return (
    <Gamepad2
      size={size}
      strokeWidth={active ? 2.5 : 1.8}
      style={{ color: active ? color : `${color}59` }}
    />
  )
}
