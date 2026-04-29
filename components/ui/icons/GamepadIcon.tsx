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
      viewBox="0 0 100 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      <defs>
        <linearGradient id="gp-body" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#A07AFF" />
          <stop offset="55%" stopColor="#6B38D4" />
          <stop offset="100%" stopColor="#3B1888" />
        </linearGradient>
        <radialGradient id="gp-shine" cx="0.38" cy="0.18" r="0.52">
          <stop offset="0%" stopColor="rgba(210,185,255,0.38)" />
          <stop offset="100%" stopColor="rgba(210,185,255,0)" />
        </radialGradient>
        <filter id="gp-glow" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation={active ? "8" : "3"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="btn-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/*
        Controller shape:
        Two bumper humps arching up from left and right,
        with a dip in the center top, then a wide rounded body.
      */}
      <path
        d="
          M 6 44
          C 6 26, 16 14, 30 13
          L 43 13
          Q 50 9, 57 13
          L 70 13
          C 84 14, 94 26, 94 44
          L 94 56
          Q 94 66, 84 66
          L 72 66
          Q 68 72, 66 72
          L 34 72
          Q 32 72, 28 66
          L 16 66
          Q 6 66, 6 56
          Z
        "
        fill="url(#gp-body)"
        filter="url(#gp-glow)"
      />

      {/* Shine overlay */}
      <path
        d="
          M 6 44 C 6 26, 16 14, 30 13 L 43 13 Q 50 9, 57 13 L 70 13
          C 84 14, 94 26, 94 44 L 94 56 Q 94 66, 84 66 L 72 66
          Q 68 72, 66 72 L 34 72 Q 32 72, 28 66 L 16 66 Q 6 66, 6 56 Z
        "
        fill="url(#gp-shine)"
      />

      {/* Top rim highlight */}
      <path
        d="M 22 18 C 26 14, 36 13, 43 13 Q 50 9, 57 13 C 64 13, 74 14, 78 18"
        stroke="rgba(215,190,255,0.30)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* D-pad */}
      <rect x="20" y="38" width="15" height="5.5" rx="2.2" fill="rgba(255,255,255,0.20)" />
      <rect x="25.2" y="33" width="5.5" height="15" rx="2.2" fill="rgba(255,255,255,0.20)" />

      {/* Left analog stick */}
      <circle cx="32" cy="55" r="7" fill="rgba(35,12,100,0.78)" stroke="rgba(175,140,255,0.30)" strokeWidth="1.5" />
      <circle cx="32" cy="55" r="2.8" fill="rgba(255,255,255,0.10)" />

      {/* Right analog stick */}
      <circle cx="62" cy="55" r="7" fill="rgba(35,12,100,0.78)" stroke="rgba(175,140,255,0.30)" strokeWidth="1.5" />
      <circle cx="62" cy="55" r="2.8" fill="rgba(255,255,255,0.10)" />

      {/* Face buttons — diamond */}
      {/* Top — yellow */}
      <circle cx="74" cy="33" r="5" fill="#F5C518" filter="url(#btn-glow)" />
      <circle cx="74" cy="33" r="2" fill="rgba(255,255,255,0.32)" />
      {/* Right — blue */}
      <circle cx="83" cy="42" r="5" fill="#4B9EF5" filter="url(#btn-glow)" />
      <circle cx="83" cy="42" r="2" fill="rgba(255,255,255,0.32)" />
      {/* Bottom — green */}
      <circle cx="74" cy="51" r="5" fill="#3DD660" filter="url(#btn-glow)" />
      <circle cx="74" cy="51" r="2" fill="rgba(255,255,255,0.32)" />
      {/* Left — red */}
      <circle cx="65" cy="42" r="5" fill="#F04848" filter="url(#btn-glow)" />
      <circle cx="65" cy="42" r="2" fill="rgba(255,255,255,0.32)" />

      {/* Center home button */}
      <circle cx="50" cy="40" r="5" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.4" />

      {/* Select / Start */}
      <rect x="40" y="38" width="5.5" height="3.5" rx="1.75" fill="rgba(255,255,255,0.26)" />
      <rect x="54.5" y="38" width="5.5" height="3.5" rx="1.75" fill="rgba(255,255,255,0.26)" />
    </svg>
  )
}
