import { ImageResponse } from 'next/og'

// ルートの OGP 画像。SNS シェア・Google 検索結果サムネイルに表示される
// ため YVOICE ブランディングに統一。旧コンテンツ (自由村 + 英語 expat
// コピー) は完全に削除済み。
export const runtime = 'edge'
export const alt = 'YVOICE — Your Voice Online｜大人のゲーム通話コミュニティ'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0d0b1f 0%, #1a1235 50%, #2a1655 100%)',
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
        {/* 紫グロー */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 600, height: 600,
          background: 'radial-gradient(circle at 80% 20%, rgba(157,92,255,0.35) 0%, transparent 60%)',
          display: 'flex',
        }} />
        {/* ピンクグロー */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: 600, height: 600,
          background: 'radial-gradient(circle at 20% 80%, rgba(255,77,144,0.22) 0%, transparent 60%)',
          display: 'flex',
        }} />

        {/* "YOUR VOICE ONLINE" 小見出し */}
        <div style={{
          color: 'rgba(196,181,253,0.85)',
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '0.32em',
          marginBottom: 28,
        }}>
          YOUR VOICE ONLINE
        </div>

        {/* YVOICE ロゴ */}
        <div style={{
          color: 'white',
          fontWeight: 900,
          fontSize: 168,
          letterSpacing: -6,
          lineHeight: 1,
          marginBottom: 36,
          textShadow: '0 4px 40px rgba(157,92,255,0.4)',
          background: 'linear-gradient(135deg, #ffffff 0%, #e0d4ff 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          YVOICE
        </div>

        {/* タグライン */}
        <div style={{
          color: 'rgba(255,255,255,0.92)',
          fontSize: 40,
          fontWeight: 800,
          textAlign: 'center',
          lineHeight: 1.3,
          marginBottom: 18,
        }}>
          大人のゲーム通話コミュニティ
        </div>

        {/* サブテキスト */}
        <div style={{
          color: 'rgba(196,181,253,0.7)',
          fontSize: 22,
          fontWeight: 600,
          textAlign: 'center',
          marginBottom: 40,
        }}>
          20歳以上限定 ・ 電話番号認証 ・ Trust Tier 制度
        </div>

        {/* URL */}
        <div style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: 22,
          fontWeight: 700,
          background: 'rgba(157,92,255,0.16)',
          paddingLeft: 28,
          paddingRight: 28,
          paddingTop: 10,
          paddingBottom: 10,
          borderRadius: 50,
          border: '1px solid rgba(157,92,255,0.32)',
        }}>
          nowmatejapan.com
        </div>
      </div>
    ),
    { ...size }
  )
}
