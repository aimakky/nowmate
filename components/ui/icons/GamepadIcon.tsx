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
      viewBox="0 0 100 82"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      <defs>
        <linearGradient id="gp-body" x1="0.25" y1="0" x2="0.75" y2="1">
          <stop offset="0%" stopColor="#9B72F5" />
          <stop offset="50%" stopColor="#6B38D4" />
          <stop offset="100%" stopColor="#3D1A90" />
        </linearGradient>
        <linearGradient id="gp-top" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#B090FF" />
          <stop offset="100%" stopColor="#7848E0" />
        </linearGradient>
        <radialGradient id="gp-shine" cx="0.38" cy="0.22" r="0.55">
          <stop offset="0%" stopColor="rgba(220,195,255,0.32)" />
          <stop offset="100%" stopColor="rgba(220,195,255,0)" />
        </radialGradient>
        <filter id="gp-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={active ? "7" : "2.5"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="gp-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={active ? "4" : "1.5"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Controller body — Xbox-style with two grips */}
      <path
        d="
          M 14 22
          Q 14 12 22 12
          L 40 12
          Q 46 10 50 10
          Q 54 10 60 12
          L 78 12
          Q 86 12 86 22
          L 86 50
          Q 86 58 80 60
          L 74 62
          Q 73 68 72 73
          Q 70 80 63 80
          Q 56 80 54 73
          L 51 64
          L 49 64
          L 46 73
          Q 44 80 37 80
          Q 30 80 28 73
          Q 27 68 26 62
          L 20 60
          Q 14 58 14 50
          Z
        "
        fill="url(#gp-body)"
        filter="url(#gp-glow)"
      />

      {/* Bumpers */}
      <path
        d="M 14 22 Q 14 14 20 13 L 40 12 Q 46 10 50 10 L 14 10 Q 8 10 8 18 L 8 24 Z"
        fill="url(#gp-top)"
        opacity="0.7"
      />
      <path
        d="M 86 22 Q 86 14 80 13 L 60 12 Q 54 10 50 10 L 86 10 Q 92 10 92 18 L 92 24 Z"
        fill="url(#gp-top)"
        opacity="0.7"
      />

      {/* Shine overlay */}
      <path
        d="
          M 14 22 Q 14 12 22 12 L 40 12 Q 46 10 50 10 Q 54 10 60 12 L 78 12
          Q 86 12 86 22 L 86 50 Q 86 58 80 60 L 74 62 Q 73 68 72 73
          Q 70 80 63 80 Q 56 80 54 73 L 51 64 L 49 64 L 46 73 Q 44 80 37 80
          Q 30 80 28 73 Q 27 68 26 62 L 20 60 Q 14 58 14 50 Z
        "
        fill="url(#gp-shine)"
      />

      {/* Top edge highlight */}
      <path
        d="M 24 14 Q 50 10 76 14"
        stroke="rgba(210,185,255,0.28)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* D-pad */}
      <rect x="23" y="31" width="14" height="5.5" rx="2.2" fill="rgba(255,255,255,0.18)" />
      <rect x="27.5" y="26.5" width="5.5" height="14" rx="2.2" fill="rgba(255,255,255,0.18)" />

      {/* Left analog stick */}
      <circle cx="30" cy="50" r="6" fill="rgba(40,15,110,0.75)" stroke="rgba(180,145,255,0.28)" strokeWidth="1.2" />
      <circle cx="30" cy="50" r="2.2" fill="rgba(255,255,255,0.1)" />

      {/* Right analog stick */}
      <circle cx="60" cy="50" r="6" fill="rgba(40,15,110,0.75)" stroke="rgba(180,145,255,0.28)" strokeWidth="1.2" />
      <circle cx="60" cy="50" r="2.2" fill="rgba(255,255,255,0.1)" />

      {/* Face buttons (diamond) */}
      {/* Top — yellow */}
      <circle cx="70" cy="28" r="4.5" fill="#F5C518" filter="url(#gp-soft-glow)" />
      <circle cx="70" cy="28" r="1.8" fill="rgba(255,255,255,0.3)" />
      {/* Right — blue */}
      <circle cx="79" cy="37" r="4.5" fill="#4B9EF5" filter="url(#gp-soft-glow)" />
      <circle cx="79" cy="37" r="1.8" fill="rgba(255,255,255,0.3)" />
      {/* Bottom — green */}
      <circle cx="70" cy="46" r="4.5" fill="#48D560" filter="url(#gp-soft-glow)" />
      <circle cx="70" cy="46" r="1.8" fill="rgba(255,255,255,0.3)" />
      {/* Left — red */}
      <circle cx="61" cy="37" r="4.5" fill="#F04848" filter="url(#gp-soft-glow)" />
      <circle cx="61" cy="37" r="1.8" fill="rgba(255,255,255,0.3)" />

      {/* Center / home button */}
      <circle cx="50" cy="37" r="4.8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />

      {/* Select / Start mini */}
      <rect x="41" y="35" width="5" height="3.5" rx="1.75" fill="rgba(255,255,255,0.25)" />
      <rect x="54" y="35" width="5" height="3.5" rx="1.75" fill="rgba(255,255,255,0.25)" />
    </svg>
  )
}
