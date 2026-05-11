import { fetchProfilesPage } from './actions'
import ProfilesClient from './ProfilesClient'

// admin/layout.tsx で auth gate が走るが、cookie / session の都度評価が必要
export const dynamic = 'force-dynamic'

export default async function AdminProfilesPage() {
  // 初期ロードは server side で 1 ページ目を取得。
  // fetchProfilesPage 内でも getAdminUser() を再チェックするため、
  // layout.tsx の gate と合わせて 2 重の認可になる。
  const initial = await fetchProfilesPage(0)

  return (
    <ProfilesClient
      initialRows={initial.rows}
      initialHasMore={initial.hasMore}
      initialError={initial.error}
    />
  )
}
