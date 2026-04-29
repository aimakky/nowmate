interface Props {
  size?: number
  active?: boolean
}

export default function GamepadIcon({ size = 22, active = false }: Props) {
  const opacity = active ? 1 : 0.5
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      <defs>
        <linearGradient id="gp-body" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#9B6EF5" />
          <stop offset="60%" stopColor="#6B3DD4" />
          <stop offset="100%" stopColor="#3D1E90" />
        </linearGradient>
        <linearGradient id="gp-bump-l" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#8A5EE8" />
          <stop offset="100%" stopColor="#4A28A0" />
        </linearGradient>
        <linearGradient id="gp-bump-r" x1="1" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#8A5EE8" />
          <stop offset="100%" stopColor="#4A28A0" />
        </linearGradient>
        <radialGradient id="gp-highlight" cx="0.4" cy="0.2" r="0.6">
          <stop offset="0%" stopColor="rgba(200,170,255,0.35)" />
          <stop offset="100%" stopColor="rgba(200,170,255,0)" />
        </radialGradient>
        <filter id="gp-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={active ? "6" : "2"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="gp-outer-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={active ? "10" : "3"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow base (invisible fill for glow) */}
      {active && (
        <ellipse cx="50" cy="55" rx="42" ry="24"
          fill="#7B3FF5" opacity="0.3"
          filter="url(#gp-outer-glow)" />
      )}

      {/* Left bumper */}
      <path
        d="M10 42 C10 24 18 18 30 18 L50 18 L50 30 L16 30 C12 30 10 35 10 42Z"
        fill="url(#gp-bump-l)"
        filter="url(#gp-glow)"
      />

      {/* Right bumper */}
      <path
        d="M90 42 C90 24 82 18 70 18 L50 18 L50 30 L84 30 C88 30 90 35 90 42Z"
        fill="url(#gp-bump-r)"
        filter="url(#gp-glow)"
      />

      {/* Main body */}
      <path
        d="M10 42 L10 60 C10 70 18 76 28 76 C36 76 42 71 44 65 L56 65 C58 71 64 76 72 76 C82 76 90 70 90 60 L90 42 C90 35 88 30 84 30 L16 30 C12 30 10 35 10 42Z"
        fill="url(#gp-body)"
        filter="url(#gp-glow)"
      />

      {/* Highlight overlay */}
      <path
        d="M10 42 L10 60 C10 70 18 76 28 76 C36 76 42 71 44 65 L56 65 C58 71 64 76 72 76 C82 76 90 70 90 60 L90 42 C90 35 88 30 84 30 L16 30 C12 30 10 35 10 42Z"
        fill="url(#gp-highlight)"
      />

      {/* Top highlight shimmer */}
      <path
        d="M22 32 Q50 28 78 32"
        stroke="rgba(220,190,255,0.25)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* D-pad horizontal */}
      <rect x="22" y="46" width="16" height="6" rx="2.5" fill="rgba(255,255,255,0.18)" />
      {/* D-pad vertical */}
      <rect x="27" y="41" width="6" height="16" rx="2.5" fill="rgba(255,255,255,0.18)" />

      {/* Analog stick left */}
      <circle cx="33" cy="62" r="6" fill="rgba(50,20,120,0.7)" stroke="rgba(180,140,255,0.3)" strokeWidth="1.5" />
      <circle cx="33" cy="62" r="2.5" fill="rgba(255,255,255,0.1)" />

      {/* Analog stick right */}
      <circle cx="63" cy="62" r="6" fill="rgba(50,20,120,0.7)" stroke="rgba(180,140,255,0.3)" strokeWidth="1.5" />
      <circle cx="63" cy="62" r="2.5" fill="rgba(255,255,255,0.1)" />

      {/* Face buttons */}
      {/* Top — yellow */}
      <circle cx="68" cy="42" r="5" fill="#F5C518" />
      <circle cx="68" cy="42" r="2" fill="rgba(255,255,255,0.3)" />
      {/* Right — blue */}
      <circle cx="78" cy="52" r="5" fill="#4B9EF5" />
      <circle cx="78" cy="52" r="2" fill="rgba(255,255,255,0.3)" />
      {/* Bottom — green */}
      <circle cx="68" cy="62" r="5" fill="#48D560" />
      <circle cx="68" cy="62" r="2" fill="rgba(255,255,255,0.3)" />
      {/* Left — red/orange */}
      <circle cx="58" cy="52" r="5" fill="#F04848" />
      <circle cx="58" cy="52" r="2" fill="rgba(255,255,255,0.3)" />

      {/* Center button */}
      <circle cx="50" cy="48" r="5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />

      {/* Select / Start mini */}
      <rect x="38" y="44" width="6" height="4" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="56" y="44" width="6" height="4" rx="2" fill="rgba(255,255,255,0.22)" />
    </svg>
  )
}
