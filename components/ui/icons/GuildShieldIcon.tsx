interface Props {
  size?: number
  active?: boolean
}

export default function GuildShieldIcon({ size = 22, active = false }: Props) {
  const opacity = active ? 1 : 0.45
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      <defs>
        <linearGradient id="shield-left" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7DD8FF" />
          <stop offset="100%" stopColor="#3AABF0" />
        </linearGradient>
        <linearGradient id="shield-right" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B9EE8" />
          <stop offset="100%" stopColor="#1A6EC8" />
        </linearGradient>
        <linearGradient id="shield-border" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D0E8F8" />
          <stop offset="50%" stopColor="#A8C8E8" />
          <stop offset="100%" stopColor="#7AAAC8" />
        </linearGradient>
        {active && (
          <filter id="shield-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Border/outline shield */}
      <path
        d="M12 2L3 6V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V6L12 2Z"
        fill="url(#shield-border)"
        filter={active ? 'url(#shield-glow)' : undefined}
      />
      {/* Left half — lighter blue */}
      <path
        d="M12 3.7L4.3 7.1V12C4.3 16.22 7.6 20.3 12 21.6V3.7Z"
        fill="url(#shield-left)"
      />
      {/* Right half — darker blue */}
      <path
        d="M12 3.7L19.7 7.1V12C19.7 16.22 16.4 20.3 12 21.6V3.7Z"
        fill="url(#shield-right)"
      />
      {/* Center divider highlight */}
      <line
        x1="12" y1="3.7" x2="12" y2="21.6"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="0.6"
      />
      {/* Top highlight shimmer */}
      <path
        d="M7 7.5L12 5.2L17 7.5"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
