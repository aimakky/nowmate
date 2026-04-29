/**
 * DM送信ユーティリティ
 * 受信者の dm_privacy 設定に基づいて
 * 通常チャット or リクエストチャットとして matches を作成する
 */

import { createClient } from '@/lib/supabase/client'
import { canSendDM } from '@/lib/permissions'

export type DMResult =
  | { status: 'ok';      matchId: string }   // すぐ会話できる
  | { status: 'request'; matchId: string }   // リクエストとして送信
  | { status: 'blocked' }                    // 送信不可（none 設定等）
  | { status: 'exists';  matchId: string }   // すでにマッチ済み
  | { status: 'age_required' }               // 年齢確認が必要

/**
 * ユーザー B に DM を開始する
 * @param fromUserId - 送信者 ID
 * @param toUserId   - 受信者 ID
 * @returns DMResult
 */
export async function startDM(fromUserId: string, toUserId: string): Promise<DMResult> {
  const supabase = createClient()

  // ① 送信者の年齢確認チェック
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('age_verified, age_verification_status')
    .eq('id', fromUserId)
    .single()

  const permCheck = canSendDM({
    id: fromUserId,
    age_verified: senderProfile?.age_verified ?? false,
    age_verification_status: (senderProfile?.age_verification_status ?? 'unverified') as any,
  })
  if (!permCheck.allowed) {
    return { status: 'age_required' }
  }

  // ② すでにマッチが存在するか確認
  const u1 = fromUserId < toUserId ? fromUserId : toUserId
  const u2 = fromUserId < toUserId ? toUserId : fromUserId
  const { data: existing } = await supabase
    .from('matches')
    .select('id, is_request, request_status')
    .eq('user1_id', u1)
    .eq('user2_id', u2)
    .not('request_status', 'eq', 'declined')
    .maybeSingle()

  if (existing) {
    return { status: 'exists', matchId: existing.id }
  }

  // ② 受信者の dm_privacy を取得
  const { data: recipientProfile } = await supabase
    .from('profiles')
    .select('dm_privacy')
    .eq('id', toUserId)
    .single()

  const dmPrivacy = (recipientProfile?.dm_privacy as string) ?? 'all'

  // ③ 権限チェック
  let canDirectDM = false

  if (dmPrivacy === 'all') {
    canDirectDM = true
  } else if (dmPrivacy === 'village_members') {
    // 共通の村・集いに参加しているか確認
    const { data: myVillages } = await supabase
      .from('village_members')
      .select('village_id')
      .eq('user_id', fromUserId)

    const myVillageIds = (myVillages || []).map((m: any) => m.village_id)

    if (myVillageIds.length > 0) {
      const { data: shared } = await supabase
        .from('village_members')
        .select('village_id')
        .eq('user_id', toUserId)
        .in('village_id', myVillageIds)
        .limit(1)

      canDirectDM = (shared || []).length > 0
    }
  } else if (dmPrivacy === 'tier3plus') {
    // 送信者のティアが 3 以上か確認
    const { data: trust } = await supabase
      .from('user_trust')
      .select('tier')
      .eq('user_id', fromUserId)
      .maybeSingle()

    const tier = parseInt(trust?.tier?.replace('tier', '') || '0')
    canDirectDM = tier >= 3
  } else if (dmPrivacy === 'none') {
    // 全員リクエスト扱い（完全拒否ではなく pending に回す）
    canDirectDM = false
  }

  // ④ マッチを作成
  const isRequest = !canDirectDM
  const { data: newMatch, error } = await supabase
    .from('matches')
    .insert({
      user1_id: u1,
      user2_id: u2,
      // user2 が常に受信者になるよう保証
      ...(u2 !== toUserId
        ? {} // u1=toUserId の場合は is_request の意味が逆転するがDBはuser2基準
        : {}),
      is_request: isRequest,
      request_status: isRequest ? 'pending' : 'accepted',
    })
    .select('id')
    .single()

  if (error || !newMatch) {
    // upsert フォールバック
    const { data: fallback } = await supabase
      .from('matches')
      .upsert(
        {
          user1_id: u1,
          user2_id: u2,
          is_request: isRequest,
          request_status: isRequest ? 'pending' : 'accepted',
        },
        { onConflict: 'user1_id,user2_id' }
      )
      .select('id')
      .single()

    if (!fallback) return { status: 'blocked' }
    return isRequest
      ? { status: 'request', matchId: fallback.id }
      : { status: 'ok', matchId: fallback.id }
  }

  return isRequest
    ? { status: 'request', matchId: newMatch.id }
    : { status: 'ok', matchId: newMatch.id }
}
