// /voice (通話ルーム一覧) 専用ローディング。紫の brand 色で skeleton。

export default function VoiceLoading() {
  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>
      {/* ヘッダー風プレースホルダ */}
      <div
        className="px-4 pt-12 pb-3"
        style={{
          background: 'rgba(8,8,18,0.96)',
          borderBottom: '1px solid rgba(157,92,255,0.18)',
        }}
      >
        <div className="h-2.5 w-20 rounded mb-2 animate-pulse"
          style={{ background: 'rgba(157,92,255,0.25)' }} />
        <div className="h-7 w-44 rounded mb-3 animate-pulse"
          style={{ background: 'rgba(157,92,255,0.30)' }} />
        {/* タブ風 */}
        <div className="flex gap-4">
          <div className="h-3 w-20 rounded animate-pulse"
            style={{ background: 'rgba(157,92,255,0.22)' }} />
          <div className="h-3 w-20 rounded animate-pulse"
            style={{ background: 'rgba(157,92,255,0.10)' }} />
        </div>
      </div>

      {/* ルームカード skeleton */}
      <div className="px-4 pt-4 pb-28 space-y-3">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="rounded-2xl p-4 animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.12)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded" style={{ background: 'rgba(157,92,255,0.18)' }} />
                <div className="h-3 w-44 rounded" style={{ background: 'rgba(157,92,255,0.10)' }} />
              </div>
              <div className="h-6 w-12 rounded-full" style={{ background: 'rgba(255,77,144,0.20)' }} />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full" style={{ background: 'rgba(157,92,255,0.14)' }} />
              <div className="w-8 h-8 rounded-full" style={{ background: 'rgba(157,92,255,0.14)' }} />
              <div className="w-8 h-8 rounded-full" style={{ background: 'rgba(157,92,255,0.14)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
