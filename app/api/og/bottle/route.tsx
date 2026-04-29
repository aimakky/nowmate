import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reply   = searchParams.get('reply')   ?? '...'
  const village = searchParams.get('village') ?? '自由村村'
  const tier    = searchParams.get('tier')    ?? 'resident'

  const TIER_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    visitor:  { label: '見習い',     icon: '🪴', color: '#78716c' },
    resident: { label: '住民',       icon: '🏡', color: '#2563eb' },
    regular:  { label: '常連',       icon: '🌿', color: '#16a34a' },
    trusted:  { label: '信頼の住民', icon: '🌳', color: '#059669' },
    pillar:   { label: '村の柱',     icon: '✨', color: '#d97706' },
  }
  const t = TIER_LABELS[tier] ?? TIER_LABELS.resident

  // 長すぎる文字を切る
  const replyText  = reply.length  > 80 ? reply.slice(0, 80)   + '…' : reply
  const villageText = village.length > 20 ? village.slice(0, 20) + '…' : village

  return new ImageResponse(
    (
      <div
        style={{
          width:   '1200px',
          height:  '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg,#060d1f 0%,#0a1e3d 50%,#0c2d50 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* 波の背景 */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '160px',
          background: 'linear-gradient(transparent, rgba(10,60,120,0.4))',
          display: 'flex',
        }} />

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
          <div style={{ fontSize: '48px' }}>🍶</div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px', fontWeight: 700, letterSpacing: '0.1em' }}>
              自由村 — 漂流瓶
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', marginTop: '4px' }}>
              {villageText} の住民が答えました
            </div>
          </div>
        </div>

        {/* 回答本文 */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '24px',
          padding: '40px 48px',
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '36px',
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.92)',
            fontSize: '32px',
            lineHeight: 1.6,
            fontWeight: 600,
          }}>
            {replyText}
          </div>
        </div>

        {/* フッター */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(255,255,255,0.08)', borderRadius: '100px',
            padding: '10px 20px', border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: '20px' }}>{t.icon}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', fontWeight: 700 }}>
              {t.label}
            </span>
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '16px', fontWeight: 700, letterSpacing: '0.05em',
          }}>
            nowmatejapan.com / villia
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
