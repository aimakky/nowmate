import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminId } from '@/lib/admin'

// admin 系は常に最新の cookie / session で判定するため SSG / キャッシュ不可
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/login')
  }

  if (!isAdminId(data.user.id)) {
    redirect('/')
  }

  return <>{children}</>
}
