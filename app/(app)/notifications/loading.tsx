// /notifications 専用ローディング。黄の brand 色で skeleton。

export default function NotificationsLoading() {
  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>
      {/* ヘッダー風プレースホルダ */}
      <div
        className="px-4 pt-12 pb-3"
        style={{
          background: 'rgba(8,8,18,0.96)',
          borderBottom: '1px solid rgba(255,201,40,0.18)',
        }}
      >
        <div className="h-2.5 w-16 rounded mb-2 animate-pulse"
          style={{ background: 'rgba(255,201,40,0.25)' }} />
        <div className="h-7 w-28 rounded animate-pulse"
          style={{ background: 'rgba(255,201,40,0.30)' }} />
      </div>

      {/* 通知行 skeleton */}
      <div className="pt-2">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="px-4 py-3.5 flex items-start gap-3 animate-pulse"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className="w-10 h-10 rounded-full flex-shrink-0"
              style={{ background: 'rgba(255,201,40,0.14)' }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-44 rounded" style={{ background: 'rgba(255,201,40,0.16)' }} />
              <div className="h-2.5 w-24 rounded" style={{ background: 'rgba(255,201,40,0.08)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
