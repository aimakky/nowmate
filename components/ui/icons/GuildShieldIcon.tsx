interface Props {
  size?: number
  active?: boolean
}

export default function GuildShieldIcon({ size = 22, active = false }: Props) {
  const opacity = active ? 1 : 0.5
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
        <linearGradient id="sg-border" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D8D0C8" />
          <stop offset="100%" stopColor="#9A9090" />
        </linearGradient>
        <linearGradient id="sg-left" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E85530" />
          <stop offset="100%" stopColor="#C03818" />
        </linearGradient>
        <linearGradient id="sg-right" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5F0EA" />
          <stop offset="100%" stopColor="#D8D0C8" />
        </linearGradient>
        {active && (
          <filter id="sg-glow">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Outer metallic border */}
      <path
        d="M12 2L3 5.8V12C3 17.1 7 21.5 12 23C17 21.5 21 17.1 21 12V5.8L12 2Z"
        fill="url(#sg-border)"
        filter={active ? 'url(#sg-glow)' : undefined}
      />

      {/* Left half — red/orange */}
      <path
        d="M12 3.5L4.5 6.8V12C4.5 16.4 7.8 20.2 12 21.5V3.5Z"
        fill="url(#sg-left)"
      />

      {/* Right half — white/silver */}
      <path
        d="M12 3.5L19.5 6.8V12C19.5 16.4 16.2 20.2 12 21.5V3.5Z"
        fill="url(#sg-right)"
      />

      {/* Chevron / W pattern — dark outline */}
      <path
        d="M5.5 10.5L8.5 14L12 10.5L15.5 14L18.5 10.5"
        stroke="rgba(40,20,10,0.55)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Center divider */}
      <line
        x1="12" y1="3.5" x2="12" y2="21.5"
        stroke="rgba(60,30,20,0.22)"
        strokeWidth="0.7"
      />

      {/* Top highlight */}
      <path
        d="M7 7.2L12 5L17 7.2"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="0.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
