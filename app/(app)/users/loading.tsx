// /users (フレンド) 専用ローディング。ピンクの brand 色で skeleton を組む。

export default function UsersLoading() {
  return (
    <div className="max-w-md mx-auto min-h-screen pb-28" style={{ background: '#080812' }}>
      {/* ヘッダー風プレースホルダ */}
      <div
        className="px-4 pt-12 pb-3"
        style={{
          background: 'rgba(8,8,18,0.94)',
          borderBottom: '1px solid rgba(255,77,144,0.18)',
        }}
      >
        <div className="h-2.5 w-20 rounded mb-2 animate-pulse"
          style={{ background: 'rgba(255,77,144,0.25)' }} />
        <div className="h-7 w-44 rounded mb-3 animate-pulse"
          style={{ background: 'rgba(255,77,144,0.30)' }} />
        {/* 検索バー風 */}
        <div className="h-10 rounded-2xl animate-pulse"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,77,144,0.18)' }} />
      </div>

      {/* ユーザーカード skeleton */}
      <div className="px-4 pt-3 space-y-2">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="rounded-2xl p-3 animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,77,144,0.1)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex-shrink-0"
                style={{ background: 'rgba(255,77,144,0.14)' }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-28 rounded" style={{ background: 'rgba(255,77,144,0.16)' }} />
                <div className="h-2.5 w-44 rounded" style={{ background: 'rgba(255,77,144,0.08)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
