// 投稿が画像 / 動画を含むかを安全に判定するユーティリティ。
// undefined / null フィールドでもクラッシュしないよう defensive に書く。
//
// 現在 (2026-05) の DB スキーマでは:
//   - 画像投稿: guild_posts.image_url が NULL でない
//   - 動画投稿: video_url 等のカラムは未定義 (= 常に false)
//
// 将来 video_url や attachments[] を追加した場合に拡張ポイントとする。

export function hasImagePost(post: any): boolean {
  if (!post) return false
  if (typeof post.image_url === 'string' && post.image_url.length > 0) return true
  if (Array.isArray(post.images) && post.images.length > 0) return true
  if (Array.isArray(post.attachments)) {
    return post.attachments.some(
      (a: any) => a?.type === 'image' || (typeof a?.url === 'string' && /\.(png|jpe?g|gif|webp)$/i.test(a.url))
    )
  }
  if (post.media && typeof post.media === 'object') {
    if (post.media.type === 'image') return true
    if (Array.isArray(post.media) && post.media.some((m: any) => m?.type === 'image')) return true
  }
  return false
}

export function hasVideoPost(post: any): boolean {
  if (!post) return false
  if (typeof post.video_url === 'string' && post.video_url.length > 0) return true
  if (Array.isArray(post.videos) && post.videos.length > 0) return true
  if (Array.isArray(post.attachments)) {
    return post.attachments.some(
      (a: any) => a?.type === 'video' || (typeof a?.url === 'string' && /\.(mp4|mov|webm|m4v)$/i.test(a.url))
    )
  }
  if (post.media && typeof post.media === 'object') {
    if (post.media.type === 'video') return true
    if (Array.isArray(post.media) && post.media.some((m: any) => m?.type === 'video')) return true
  }
  return false
}
