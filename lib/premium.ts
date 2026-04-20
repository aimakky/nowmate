import { createClient } from '@/lib/supabase/client'

export async function getIsPremium(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('user_premium_status')
    .select('is_premium')
    .eq('user_id', userId)
    .single()
  return data?.is_premium ?? false
}

export async function getTodayLikeCount(userId: string): Promise<number> {
  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('from_user_id', userId)
    .gte('created_at', today.toISOString())
  return count ?? 0
}

export const FREE_LIKE_LIMIT = 10
