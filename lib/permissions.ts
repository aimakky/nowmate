/**
 * samee 権限判定ライブラリ
 *
 * 年齢確認ステータスに基づく全権限をここで一元管理する。
 * フロントエンド・API・Realtime の全レイヤーで使用すること。
 *
 * 原則：
 *  - age_verified = false のユーザーは絶対にマイクON不可
 *  - フロントでボタンを隠すだけでなく、必ずサーバー側でも検証する
 */

// ─── 型定義 ─────────────────────────────────────────────────────

export type AgeVerificationStatus =
  | 'unverified'
  | 'age_verified'
  | 'rejected'
  | 'pending'

export type VoiceRoomType =
  | 'open_voice_room'
  | 'friend_voice_room'
  | 'circle_voice_room'

export type VoiceAccessMode =
  | 'age_verified_only'
  | 'listener_allowed'
  | 'chat_only_preview'

export type VoiceParticipantRole =
  | 'owner'
  | 'moderator'
  | 'speaker'
  | 'listener'
  | 'listener_unverified'
  | 'text_only'

export type SafetyLevel = 1 | 2 | 3

export interface UserPermissionContext {
  id: string
  age_verified: boolean
  age_verification_status: AgeVerificationStatus
  trust_tier?: number
}

export interface VoiceRoomContext {
  id: string
  room_type: VoiceRoomType
  access_mode: VoiceAccessMode
  allow_unverified_listeners: boolean
  safety_level: SafetyLevel
  host_id: string
}

export interface FriendApproval {
  room_id: string
  target_user_id: string
  status: 'pending' | 'approved' | 'rejected'
}

// ─── ユーティリティ ────────────────────────────────────────────

function isAgeVerified(user: UserPermissionContext): boolean {
  return user.age_verified === true &&
    user.age_verification_status === 'age_verified'
}

// ─── サークル（ギルド）権限 ────────────────────────────────────

/**
 * サークル一覧・詳細を閲覧できるか
 * → 全員OK（認証不要）
 */
export function canViewCircle(_user: UserPermissionContext | null): boolean {
  return true
}

/**
 * サークルに参加できるか
 * → 全員OK（認証不要）
 */
export function canJoinCircle(_user: UserPermissionContext | null): boolean {
  return true
}

/**
 * サークル内にテキスト投稿できるか
 * → 全員OK（認証不要）
 */
export function canPostCircleChat(_user: UserPermissionContext | null): boolean {
  return true
}

// ─── 通話ルーム権限 ────────────────────────────────────────────

/**
 * 通話ルームの存在を見られるか（一覧表示）
 * → 全員OK
 */
export function canViewVoiceRoom(_user: UserPermissionContext | null): boolean {
  return true
}

/**
 * 通話ルームに入室できるか
 *
 * open_voice_room     → age_verified のみ
 * friend_voice_room   → age_verified は常にOK
 *                       未確認は friendApproval が approved の場合のみ（聞き専）
 * circle_voice_room   → access_mode による
 *   age_verified_only → age_verified のみ
 *   listener_allowed  → 未確認は聞き専で入室可
 *   chat_only_preview → 未確認はチャットのみ（入室扱い）
 */
export function canJoinVoiceRoom(
  user: UserPermissionContext | null,
  room: VoiceRoomContext,
  friendApproval?: FriendApproval | null,
): { allowed: boolean; asListenerOnly: boolean; reason?: string } {
  if (!user) {
    return { allowed: false, asListenerOnly: false, reason: 'ログインが必要です' }
  }

  const verified = isAgeVerified(user)

  if (room.room_type === 'open_voice_room') {
    if (!verified) {
      return {
        allowed: false,
        asListenerOnly: false,
        reason: 'この通話は年齢確認済みユーザーのみ参加できます',
      }
    }
    return { allowed: true, asListenerOnly: false }
  }

  if (room.room_type === 'friend_voice_room') {
    if (verified) return { allowed: true, asListenerOnly: false }

    // 未確認ユーザー：承認済みフレンド通話のみ聞き専で入室可
    if (
      room.allow_unverified_listeners &&
      friendApproval?.status === 'approved'
    ) {
      return { allowed: true, asListenerOnly: true }
    }

    return {
      allowed: false,
      asListenerOnly: false,
      reason: 'フレンドの招待と年齢確認が必要です',
    }
  }

  if (room.room_type === 'circle_voice_room') {
    if (verified) return { allowed: true, asListenerOnly: false }

    if (room.access_mode === 'age_verified_only') {
      return {
        allowed: false,
        asListenerOnly: false,
        reason: 'この通話部屋は年齢確認済みユーザーのみ参加できます',
      }
    }
    if (room.access_mode === 'listener_allowed') {
      return { allowed: true, asListenerOnly: true }
    }
    if (room.access_mode === 'chat_only_preview') {
      return { allowed: true, asListenerOnly: true }
    }
  }

  return { allowed: false, asListenerOnly: false, reason: '参加できません' }
}

/**
 * 通話でマイクをONにして発言できるか
 * → age_verified のみ。例外なし。
 */
export function canSpeakInVoiceRoom(
  user: UserPermissionContext | null,
  _room?: VoiceRoomContext,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: 'ログインが必要です' }
  if (!isAgeVerified(user)) {
    return {
      allowed: false,
      reason: 'マイクを使うには年齢確認が必要です',
    }
  }
  return { allowed: true }
}

/**
 * マイクをONにできるか（canSpeakInVoiceRoom のエイリアス）
 * UI のマイクボタン制御に使用する
 */
export function canUseMicrophone(
  user: UserPermissionContext | null,
  room?: VoiceRoomContext,
): { allowed: boolean; reason?: string } {
  return canSpeakInVoiceRoom(user, room)
}

/**
 * 通話ルームを新規作成できるか
 * → age_verified のみ
 */
export function canCreateVoiceRoom(
  user: UserPermissionContext | null,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: 'ログインが必要です' }
  if (!isAgeVerified(user)) {
    return {
      allowed: false,
      reason: '通話ルームを作成するには年齢確認が必要です',
    }
  }
  return { allowed: true }
}

/**
 * 未確認ユーザーのリスナー入室を承認できるか
 * → ルームオーナーまたはモデレーターのみ、かつ age_verified
 */
export function canApproveListener(
  user: UserPermissionContext | null,
  room: VoiceRoomContext,
  _targetUserId: string,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: 'ログインが必要です' }
  if (!isAgeVerified(user)) {
    return { allowed: false, reason: '年齢確認が必要です' }
  }
  if (user.id !== room.host_id) {
    return { allowed: false, reason: 'ルームオーナーのみ承認できます' }
  }
  return { allowed: true }
}

// ─── DM・1対1通話権限 ─────────────────────────────────────────

/**
 * DM を送信できるか
 * → age_verified のみ
 */
export function canSendDM(
  user: UserPermissionContext | null,
  _targetUser?: UserPermissionContext,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: 'ログインが必要です' }
  if (!isAgeVerified(user)) {
    return {
      allowed: false,
      reason: 'DMを送るには年齢確認が必要です',
    }
  }
  return { allowed: true }
}

/**
 * 1対1通話を開始できるか
 * → 両者ともに age_verified のみ
 */
export function canStartOneToOneCall(
  user: UserPermissionContext | null,
  targetUser: UserPermissionContext | null,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: 'ログインが必要です' }
  if (!isAgeVerified(user)) {
    return {
      allowed: false,
      reason: '1対1通話には年齢確認が必要です',
    }
  }
  if (targetUser && !isAgeVerified(targetUser)) {
    return {
      allowed: false,
      reason: '相手も年齢確認済みである必要があります',
    }
  }
  return { allowed: true }
}

// ─── Safety Level ユーティリティ ──────────────────────────────

/**
 * Safety Level の表示テキスト・色を返す
 */
export function getSafetyLevelInfo(level: SafetyLevel): {
  label: string
  description: string
  color: string
  emoji: string
} {
  switch (level) {
    case 3:
      return {
        label: 'Safety Lv.3',
        description: '年齢確認済みユーザーのみ通話可能',
        color: '#22c55e',
        emoji: '🛡️',
      }
    case 2:
      return {
        label: 'Safety Lv.2',
        description: '未確認ユーザーは聞き専＋チャットのみ',
        color: '#f59e0b',
        emoji: '🔒',
      }
    case 1:
      return {
        label: 'Safety Lv.1',
        description: 'チャット中心・通話制限あり',
        color: '#64748b',
        emoji: '💬',
      }
  }
}

/**
 * 年齢確認ステータスの表示テキストを返す
 */
export function getVerificationStatusLabel(
  status: AgeVerificationStatus,
): { label: string; color: string; emoji: string } {
  switch (status) {
    case 'age_verified':
      return { label: '年齢確認済み', color: '#22c55e', emoji: '✅' }
    case 'pending':
      return { label: '確認中', color: '#f59e0b', emoji: '⏳' }
    case 'rejected':
      return { label: '確認否認', color: '#ef4444', emoji: '❌' }
    case 'unverified':
    default:
      return { label: '未確認', color: '#94a3b8', emoji: '⚪' }
  }
}

/**
 * ユーザーに表示する参加モードを返す（UI用）
 */
export function getParticipantModeLabel(
  isListenerOnly: boolean,
  canSpeak: boolean,
): { label: string; color: string } {
  if (canSpeak && !isListenerOnly) {
    return { label: '通話参加中', color: '#22c55e' }
  }
  if (isListenerOnly) {
    return { label: '未確認・聞き専', color: '#f59e0b' }
  }
  return { label: 'テキストのみ', color: '#64748b' }
}
