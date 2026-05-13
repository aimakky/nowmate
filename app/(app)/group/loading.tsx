// /group 専用ローディング。前ページからの切替時に他タブの色 (緑/紫/ピンク/黄)
// が一瞬残らないよう、グループタブのブランド色 (#9D5CFF, YVOICE 紫) で
// スケルトンを構成。旧シアン (#27DFFF) は v2 で完全廃止。

export default function GroupLoading() {
  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#080812' }}>
      {/* タイトル風 */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-xl animate-pulse"
            style={{ background: 'rgba(157,92,255,0.18)' }}
          />
          <div className="h-5 w-24 rounded animate-pulse" style={{ background: 'rgba(157,92,255,0.22)' }} />
        </div>
        <div className="h-3 w-72 rounded animate-pulse" style={{ background: 'rgba(157,92,255,0.10)' }} />
      </div>

      {/* セクションラベル */}
      <div className="px-4 mt-3">
        <div className="h-2.5 w-32 rounded animate-pulse mb-2" style={{ background: 'rgba(157,92,255,0.12)' }} />
        {/* ルームカード skeleton */}
        <div className="space-y-2">
          {[0, 1].map(i => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,92,255,0.12)' }}
            >
              <div className="w-11 h-11 rounded-xl flex-shrink-0" style={{ background: 'rgba(157,92,255,0.16)' }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 rounded" style={{ background: 'rgba(157,92,255,0.14)' }} />
                <div className="h-2.5 w-1/3 rounded" style={{ background: 'rgba(157,92,255,0.08)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
