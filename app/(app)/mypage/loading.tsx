// /mypage 専用ローディング。シルバー＋ピンクのプロフィール系トーンで skeleton。
// 他タブ (timeline / users / guild / chat / notifications) と同じく
// route segment の自動 Suspense fallback として機能する。

export default function MyPageLoading() {
  return (
    <div className="max-w-md mx-auto min-h-screen relative overflow-x-hidden" style={{ background: '#0d0b1f' }}>
      {/* シルバーグロー（右上） */}
      <div className="absolute top-0 right-0 w-80 h-80 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle at 80% 15%, rgba(234,242,255,0.12) 0%, rgba(184,199,217,0.06) 40%, transparent 70%)' }} />

      {/* ヘッダー行（左 user / 右 settings 風） */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-0">
        <div className="w-10 h-10 rounded-full animate-pulse"
          style={{ background: 'rgba(234,242,255,0.08)' }} />
        <div className="w-10 h-10 rounded-xl animate-pulse"
          style={{ background: 'rgba(234,242,255,0.08)' }} />
      </div>

      {/* プロフィール行（アバター + 名前） */}
      <div className="relative z-10 flex items-center gap-5 px-5 pt-6 pb-5">
        <div className="w-24 h-24 rounded-full flex-shrink-0 animate-pulse"
          style={{ background: 'rgba(234,242,255,0.10)', border: '2px solid rgba(234,242,255,0.20)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-7 w-32 rounded animate-pulse" style={{ background: 'rgba(234,242,255,0.16)' }} />
          <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'rgba(234,242,255,0.10)' }} />
          <div className="h-3 w-40 rounded animate-pulse" style={{ background: 'rgba(234,242,255,0.08)' }} />
        </div>
      </div>

      {/* 統計カード（フォロー / フォロワー / 投稿） */}
      <div className="relative z-10 mx-4 mb-3 rounded-2xl overflow-hidden animate-pulse"
        style={{ background: 'rgba(234,242,255,0.04)', border: '1px solid rgba(234,242,255,0.10)' }}>
        <div className="flex">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 flex flex-col items-center py-4 gap-1.5">
              <div className="h-6 w-8 rounded" style={{ background: 'rgba(234,242,255,0.16)' }} />
              <div className="h-2 w-12 rounded" style={{ background: 'rgba(234,242,255,0.08)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* タブ風 */}
      <div className="relative z-10 mx-4 mb-1 rounded-2xl overflow-hidden animate-pulse"
        style={{ background: 'rgba(234,242,255,0.04)', border: '1px solid rgba(184,199,217,0.10)' }}>
        <div className="flex">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex-1 py-3.5 flex items-center justify-center">
              <div className="h-3 w-12 rounded" style={{ background: 'rgba(234,242,255,0.10)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* 投稿カード skeleton */}
      <div className="relative z-10 px-4 pt-4 pb-32 space-y-3">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="rounded-2xl p-4 animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(234,242,255,0.08)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full flex-shrink-0"
                style={{ background: 'rgba(234,242,255,0.10)' }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 rounded" style={{ background: 'rgba(234,242,255,0.12)' }} />
                <div className="h-2.5 w-16 rounded" style={{ background: 'rgba(234,242,255,0.06)' }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-3 rounded w-full" style={{ background: 'rgba(234,242,255,0.06)' }} />
              <div className="h-3 rounded w-4/5" style={{ background: 'rgba(234,242,255,0.06)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
