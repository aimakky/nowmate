// /chat 専用ローディング。ピンクの brand 色で skeleton。

export default function ChatLoading() {
  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>
      {/* ヘッダー風プレースホルダ */}
      <div
        className="px-4 pt-12 pb-3"
        style={{
          background: 'rgba(8,8,18,0.96)',
          borderBottom: '1px solid rgba(255,79,216,0.2)',
        }}
      >
        <div className="h-2.5 w-20 rounded mb-2 animate-pulse"
          style={{ background: 'rgba(255,79,216,0.25)' }} />
        <div className="h-7 w-32 rounded mb-3 animate-pulse"
          style={{ background: 'rgba(255,79,216,0.30)' }} />
        {/* タブ風 */}
        <div className="flex gap-4">
          <div className="h-3 w-20 rounded animate-pulse"
            style={{ background: 'rgba(255,79,216,0.20)' }} />
          <div className="h-3 w-20 rounded animate-pulse"
            style={{ background: 'rgba(255,79,216,0.10)' }} />
        </div>
      </div>

      {/* チャット行 skeleton */}
      <div className="pt-2">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="px-4 py-3 flex items-center gap-3 animate-pulse"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className="w-12 h-12 rounded-full flex-shrink-0"
              style={{ background: 'rgba(255,79,216,0.14)' }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 rounded" style={{ background: 'rgba(255,79,216,0.18)' }} />
              <div className="h-2.5 w-48 rounded" style={{ background: 'rgba(255,79,216,0.08)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
