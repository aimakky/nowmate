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
        <linearGradient id="gp-body" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#7B52D4" />
          <stop offset="100%" stopColor="#4A2490" />
        </linearGradient>
        <linearGradient id="gp-bump" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6A44C0" />
          <stop offset="100%" stopColor="#3D1E80" />
        </linearGradient>
        <linearGradient id="gp-stick" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9880CC" />
          <stop offset="100%" stopColor="#6655A8" />
        </linearGradient>
        <filter id="gp-glow">
          <feGaussianBlur stdDeviation={active ? "1.5" : "0.6"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Bumper left */}
      <rect x="3.2" y="6" width="7" height="2.2" rx="1.1" fill="url(#gp-bump)" />
      {/* Bumper right */}
      <rect x="13.8" y="6" width="7" height="2.2" rx="1.1" fill="url(#gp-bump)" />

      {/* Main body */}
      <path
        d="M5 8.2C3.2 8.2 2 9.8 2 11.8C2 14 3.1 16 5 17.4L7.2 19.5C8 20.3 9.1 20.8 10.3 20.8C11.4 20.8 12 19.9 12 19.1C12 19.9 12.6 20.8 13.7 20.8C14.9 20.8 16 20.3 16.8 19.5L19 17.4C20.9 16 22 14 22 11.8C22 9.8 20.8 8.2 19 8.2H5Z"
        fill="url(#gp-body)"
        filter="url(#gp-glow)"
      />

      {/* Top body highlight */}
      <path
        d="M6.5 8.8C8 8.45 10 8.2 12 8.2C14 8.2 16 8.45 17.5 8.8"
        stroke="rgba(200,170,255,0.3)"
        strokeWidth="0.7"
        strokeLinecap="round"
        fill="none"
      />

      {/* D-pad horizontal */}
      <rect x="5.0" y="11.3" width="4.4" height="1.7" rx="0.65" fill="rgba(255,255,255,0.22)" />
      {/* D-pad vertical */}
      <rect x="6.5" y="9.8" width="1.7" height="4.7" rx="0.65" fill="rgba(255,255,255,0.22)" />

      {/* Analog stick left */}
      <circle cx="8.6" cy="15.8" r="1.5" fill="url(#gp-stick)" />
      <circle cx="8.6" cy="15.8" r="0.6" fill="rgba(255,255,255,0.15)" />

      {/* Analog stick right */}
      <circle cx="15.4" cy="15.8" r="1.5" fill="url(#gp-stick)" />
      <circle cx="15.4" cy="15.8" r="0.6" fill="rgba(255,255,255,0.15)" />

      {/* Face buttons */}
      {/* Top — yellow */}
      <circle cx="17.1" cy="10.1" r="1.05" fill="#F5C518" />
      {/* Right — blue */}
      <circle cx="18.75" cy="11.75" r="1.05" fill="#4B9EF5" />
      {/* Bottom — green */}
      <circle cx="17.1" cy="13.4" r="1.05" fill="#48D560" />
      {/* Left — red */}
      <circle cx="15.45" cy="11.75" r="1.05" fill="#F04848" />

      {/* Center button */}
      <circle cx="12" cy="11.75" r="1.25" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.28)" strokeWidth="0.5" />

      {/* Select / Start mini buttons */}
      <rect x="9.8" y="11.25" width="1.3" height="0.85" rx="0.42" fill="rgba(255,255,255,0.28)" />
      <rect x="12.9" y="11.25" width="1.3" height="0.85" rx="0.42" fill="rgba(255,255,255,0.28)" />
    </svg>
  )
}
