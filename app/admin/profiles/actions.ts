'use server'

import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin'
import { PAGE_SIZE, type ProfileRow, type FetchProfilesResult } from './types'

/**
 * /admin/profiles の 1 ページ分の profiles を server side で取得する。
 *
 * - layout.tsx で既に admin チェック済みだが、server action は外部から
 *   直接 POST されうるため、ここでも getAdminUser() で再チェックする（多層防御）。
 * - anon キー + cookie の SSR client を使い、profiles RLS
 *   ("Anyone can view active profiles" / using is_active = true) を尊重する。
 * - service_role は使わない。is_active = false を見る場合のみ将来導入する。
 */
export async function fetchProfilesPage(page: number): Promise<FetchProfilesResult> {
  const admin = await getAdminUser()
  if (!admin) {
    return { rows: [], hasMore: false, error: 'unauthorized' }
  }

  const safePage = Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0
  const from = safePage * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, VILLIA_id, avatar_url, created_at, updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (error) {
    return { rows: [], hasMore: false, error: error.message }
  }

  const rows = (data ?? []) as ProfileRow[]
  return { rows, hasMore: rows.length === PAGE_SIZE, error: null }
}
