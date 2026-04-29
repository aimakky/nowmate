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
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      <defs>
        <linearGradient id="gp-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A3A3A" />
          <stop offset="100%" stopColor="#1C1C1C" />
        </linearGradient>
        <linearGradient id="gp-bump" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A4A4A" />
          <stop offset="100%" stopColor="#2A2A2A" />
        </linearGradient>
        <linearGradient id="gp-grip-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E2E2E" />
          <stop offset="100%" stopColor="#141414" />
        </linearGradient>
        <linearGradient id="gp-grip-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E2E2E" />
          <stop offset="100%" stopColor="#141414" />
        </linearGradient>
        {active && (
          <filter id="gp-glow">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Bumpers */}
      <rect x="3.5" y="6" width="6.5" height="2" rx="1" fill="url(#gp-bump)" />
      <rect x="14" y="6" width="6.5" height="2" rx="1" fill="url(#gp-bump)" />

      {/* Main body */}
      <path
        d="M5 8C3.3 8 2 9.5 2 11.5C2 13.8 3.2 15.6 5 17L7 19.2C7.8 20.1 8.9 20.5 10 20.5C11.1 20.5 11.8 19.6 12 18.8C12.2 19.6 12.9 20.5 14 20.5C15.1 20.5 16.2 20.1 17 19.2L19 17C20.8 15.6 22 13.8 22 11.5C22 9.5 20.7 8 19 8H5Z"
        fill="url(#gp-body)"
        filter={active ? 'url(#gp-glow)' : undefined}
      />

      {/* Body highlight top edge */}
      <path
        d="M6 8.5C7.5 8.2 9.5 8 12 8C14.5 8 16.5 8.2 18 8.5"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.7"
        strokeLinecap="round"
        fill="none"
      />

      {/* D-pad — left side */}
      {/* horizontal */}
      <rect x="5.2" y="11.4" width="4.2" height="1.6" rx="0.6" fill="#555555" />
      {/* vertical */}
      <rect x="6.7" y="9.9" width="1.6" height="4.6" rx="0.6" fill="#555555" />

      {/* Analog stick left */}
      <circle cx="8.5" cy="15.5" r="1.4" fill="#404040" stroke="#2A2A2A" strokeWidth="0.5" />

      {/* Analog stick right */}
      <circle cx="15.5" cy="15.5" r="1.4" fill="#404040" stroke="#2A2A2A" strokeWidth="0.5" />

      {/* Face buttons (right side) — orange/amber */}
      {/* Top */}
      <circle cx="17.2" cy="10.2" r="1.05" fill="#E87820" />
      {/* Right */}
      <circle cx="18.9" cy="11.9" r="1.05" fill="#E87820" />
      {/* Bottom */}
      <circle cx="17.2" cy="13.6" r="1.05" fill="#D06010" />
      {/* Left */}
      <circle cx="15.5" cy="11.9" r="1.05" fill="#E87820" />

      {/* Center logo button */}
      <circle cx="12" cy="12" r="1.3" fill="#303030" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

      {/* Menu buttons */}
      <rect x="9.8" y="11.5" width="1.3" height="0.9" rx="0.45" fill="rgba(255,255,255,0.2)" />
      <rect x="12.9" y="11.5" width="1.3" height="0.9" rx="0.45" fill="rgba(255,255,255,0.2)" />
    </svg>
  )
}
