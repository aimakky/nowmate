// /guild (ゲーム村) 専用ローディング。紫の brand 色で skeleton を組む。
// 上部タブ「いますぐ村 / ギルド」分の高さも確保しておく。

export default function GuildLoading() {
  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>
      {/* 上部タブバー風（44px） */}
      <div
        className="flex"
        style={{
          height: 44,
          background: 'rgba(8,8,18,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="h-3 w-20 rounded animate-pulse"
            style={{ background: 'rgba(139,92,246,0.25)' }} />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="h-3 w-12 rounded animate-pulse"
            style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
      </div>

      {/* ヘッダー風プレースホルダ */}
      <div
        className="px-4 pt-8 pb-4"
        style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a1035 60%, #1a1035 100%)' }}
      >
        <div className="h-2.5 w-20 rounded mb-2 animate-pulse"
          style={{ background: 'rgba(139,92,246,0.30)' }} />
        <div className="h-7 w-56 rounded mb-3 animate-pulse"
          style={{ background: 'rgba(139,92,246,0.35)' }} />
        <div className="h-10 rounded-2xl animate-pulse"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.18)' }} />
      </div>

      {/* ルームカード skeleton */}
      <div className="px-4 pt-4 space-y-3">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="rounded-2xl p-4 animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.12)' }}
          >
            <div className="h-4 w-32 rounded mb-2" style={{ background: 'rgba(139,92,246,0.18)' }} />
            <div className="h-3 w-44 rounded mb-3" style={{ background: 'rgba(139,92,246,0.10)' }} />
            <div className="h-8 rounded-xl" style={{ background: 'rgba(139,92,246,0.10)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
