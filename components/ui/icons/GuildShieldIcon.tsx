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
        <linearGradient id="sh-border" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#C8D8E8" />
          <stop offset="60%" stopColor="#9AB0C8" />
          <stop offset="100%" stopColor="#7090A8" />
        </linearGradient>
        <linearGradient id="sh-left" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#70CCED" />
          <stop offset="100%" stopColor="#3AAAD5" />
        </linearGradient>
        <linearGradient id="sh-right" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2E8EC8" />
          <stop offset="100%" stopColor="#1A6AAE" />
        </linearGradient>
        <filter id="sh-glow">
          <feGaussianBlur stdDeviation={active ? "1.4" : "0.5"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Metallic border */}
      <path
        d="M12 2L3 5.8V12C3 17.2 7 21.6 12 23C17 21.6 21 17.2 21 12V5.8L12 2Z"
        fill="url(#sh-border)"
        filter="url(#sh-glow)"
      />

      {/* Left half — light blue */}
      <path
        d="M12 3.6L4.5 6.9V12C4.5 16.5 7.8 20.3 12 21.6V3.6Z"
        fill="url(#sh-left)"
      />

      {/* Right half — dark blue */}
      <path
        d="M12 3.6L19.5 6.9V12C19.5 16.5 16.2 20.3 12 21.6V3.6Z"
        fill="url(#sh-right)"
      />

      {/* Center divider */}
      <line
        x1="12" y1="3.6" x2="12" y2="21.6"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.7"
      />

      {/* Top highlight shimmer */}
      <path
        d="M7 7.4L12 5.1L17 7.4"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="0.7"
        strokeLinecap="round"
        fill="none"
      />

      {/* Inner border glow edge */}
      <path
        d="M12 4.2L5.2 7.3V12C5.2 16 8.2 19.6 12 21"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.5"
        fill="none"
      />
    </svg>
  )
}
