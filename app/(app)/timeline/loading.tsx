// /timeline 専用ローディング。Next.js App Router が遷移中に自動表示する。
// これがないと、前のページの DOM が新ページマウントまで残り、フレンド→TL
// 切替で「ピンクのスケルトン → 緑のスケルトン」のチラつきになる。
// 各タブの brand 色 (#39FF88 = 緑) で skeleton を組んでおき、遷移中も
// ページの世界観が崩れないようにする。

export default function TimelineLoading() {
  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>
      {/* ヘッダー風プレースホルダ */}
      <div
        className="px-4 pt-12 pb-4"
        style={{
          background: 'linear-gradient(160deg,rgba(8,8,18,0.98) 0%,rgba(8,18,12,0.98) 60%,rgba(9,20,14,0.95) 100%)',
          borderBottom: '1px solid rgba(57,255,136,0.15)',
        }}
      >
        <div className="h-2.5 w-16 rounded mb-2 animate-pulse"
          style={{ background: 'rgba(57,255,136,0.20)' }} />
        <div className="h-7 w-40 rounded animate-pulse"
          style={{ background: 'rgba(57,255,136,0.30)' }} />
      </div>

      {/* 投稿カード skeleton */}
      <div className="px-4 pt-4 space-y-3">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="rounded-2xl p-4 animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(57,255,136,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex-shrink-0"
                style={{ background: 'rgba(57,255,136,0.14)' }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 rounded" style={{ background: 'rgba(57,255,136,0.16)' }} />
                <div className="h-2.5 w-16 rounded" style={{ background: 'rgba(57,255,136,0.08)' }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-3 rounded w-full" style={{ background: 'rgba(57,255,136,0.08)' }} />
              <div className="h-3 rounded w-4/5" style={{ background: 'rgba(57,255,136,0.08)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
