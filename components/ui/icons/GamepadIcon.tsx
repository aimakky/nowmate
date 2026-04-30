interface Props {
  size?: number
  active?: boolean
}

export default function GamepadIcon({ size = 22, active = false }: Props) {
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
        <linearGradient id="pad-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9B6FE8" />
          <stop offset="100%" stopColor="#5B2EA0" />
        </linearGradient>
        <linearGradient id="pad-grip-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A50CC" />
          <stop offset="100%" stopColor="#4A1E8A" />
        </linearGradient>
        <linearGradient id="pad-grip-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A50CC" />
          <stop offset="100%" stopColor="#4A1E8A" />
        </linearGradient>
        {active && (
          <filter id="pad-glow">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Main body */}
      <path
        d="M5 8.5C3.5 8.5 2 10 2 12C2 14 3 15.5 4.5 16.5L6.5 19C7.2 20 8.3 20.5 9.5 20.5C10.7 20.5 11.5 19.5 12 18.5C12.5 19.5 13.3 20.5 14.5 20.5C15.7 20.5 16.8 20 17.5 19L19.5 16.5C21 15.5 22 14 22 12C22 10 20.5 8.5 19 8.5H5Z"
        fill="url(#pad-body)"
        filter={active ? 'url(#pad-glow)' : undefined}
      />

      {/* Bumper left */}
      <rect x="4" y="6.5" width="6" height="2.5" rx="1.2" fill="#8B5CD8" />
      {/* Bumper right */}
      <rect x="14" y="6.5" width="6" height="2.5" rx="1.2" fill="#8B5CD8" />

      {/* D-pad (left side) */}
      {/* horizontal bar */}
      <rect x="5.5" y="11.5" width="4" height="1.5" rx="0.5" fill="rgba(255,255,255,0.55)" />
      {/* vertical bar */}
      <rect x="6.9" y="10" width="1.5" height="4.5" rx="0.5" fill="rgba(255,255,255,0.55)" />

      {/* Face buttons (right side) — colored circles */}
      {/* Top — yellow */}
      <circle cx="17.2" cy="10.5" r="1" fill="#F5C518" />
      {/* Right — blue */}
      <circle cx="18.7" cy="12.2" r="1" fill="#4B9EF5" />
      {/* Bottom — red */}
      <circle cx="17.2" cy="13.9" r="1" fill="#F54B4B" />
      {/* Left — green */}
      <circle cx="15.7" cy="12.2" r="1" fill="#4BF578" />

      {/* Center home button */}
      <circle cx="12" cy="12.2" r="1.2" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />

      {/* Menu/start buttons */}
      <rect x="9.8" y="11.6" width="1.4" height="0.8" rx="0.4" fill="rgba(255,255,255,0.35)" />
      <rect x="12.8" y="11.6" width="1.4" height="0.8" rx="0.4" fill="rgba(255,255,255,0.35)" />

      {/* Top highlight */}
      <path
        d="M6 9C7 8.7 9 8.5 12 8.5C15 8.5 17 8.7 18 9"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="0.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
