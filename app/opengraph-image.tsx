import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Samee — Just landed? We\'ve got you.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Background pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.1,
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          marginBottom: 40,
        }}>
          <div style={{
            width: 64, height: 64, background: 'white', borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#0ea5e9', fontWeight: 900, fontSize: 32 }}>N</span>
          </div>
          <span style={{ color: 'white', fontWeight: 900, fontSize: 48, letterSpacing: -2 }}>Samee</span>
        </div>

        {/* Headline */}
        <div style={{
          color: 'white', fontSize: 64, fontWeight: 900,
          textAlign: 'center', lineHeight: 1.1, marginBottom: 24,
          textShadow: '0 2px 20px rgba(0,0,0,0.2)',
        }}>
          Just landed?<br />We've got you.
        </div>

        {/* Subtext */}
        <div style={{
          color: 'rgba(255,255,255,0.85)', fontSize: 28,
          textAlign: 'center', maxWidth: 700, lineHeight: 1.4,
          marginBottom: 48,
        }}>
          Making friends in Japan is hard. Samee makes it easy.
        </div>

        {/* Flags */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          {['🇺🇸','🇧🇷','🇨🇳','🇰🇷','🇻🇳','🇮🇳','🇵🇭','🇳🇵','🇮🇩','🇹🇭'].map((flag, i) => (
            <div key={i} style={{
              width: 56, height: 56, background: 'rgba(255,255,255,0.2)',
              borderRadius: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 30,
            }}>
              {flag}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          color: 'rgba(255,255,255,0.7)', fontSize: 22, fontWeight: 600,
          background: 'rgba(0,0,0,0.15)', paddingLeft: 24, paddingRight: 24,
          paddingTop: 10, paddingBottom: 10, borderRadius: 50,
        }}>
          sameejapan.com
        </div>
      </div>
    ),
    { ...size }
  )
}
