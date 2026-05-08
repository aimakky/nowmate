// テスト期間中の通話・本人確認ゲート一時バイパスフラグ
//
// マッキーさん指示 (2026-05-08 YVOICE5): 正式リリース前のテストプレイ段階で、
// 本人確認 / 電話認証 / Trust Tier (visitor) 制限が原因で「聞くだけで参加」
// 「マイクONで参加」「ギルド通話参加」が動かない問題への一時対応。
//
// 設計:
//   - 本人確認機能 / 電話認証機能 / Trust Tier の DB / コードは一切削除しない
//   - 制限判定箇所だけを「フラグ ON ならバイパス」する形で迂回
//   - 正式リリース時は環境変数を未設定 or 'false' に戻すだけで従来挙動に戻る
//   - 未ログインユーザーまでは開放しない (各 permission 関数で先に user チェックする)
//
// 有効化:
//   Vercel Settings → Environment Variables → Production
//   NEXT_PUBLIC_DISABLE_VERIFICATION_GATE=true
//   Save 後に新規 build をトリガー (env 変更だけでは古い build に反映されない)
//
// 無効化 (正式リリース時):
//   1. Vercel Settings から NEXT_PUBLIC_DISABLE_VERIFICATION_GATE を削除 or 'false' に変更
//   2. 新規 build トリガー
//   3. 全制限が即座に従来挙動に戻る
//
// 影響範囲 (フラグ ON 時にバイパスされるチェック):
//   - lib/permissions.ts:
//     - canJoinVoiceRoom (年齢確認 / room_type / access_mode)
//     - canSpeakInVoiceRoom (年齢確認)
//     - canCreateVoiceRoom (年齢確認)
//     - canSendDM (年齢確認)
//     - canStartOneToOneCall (年齢確認)
//     - canApproveListener はバイパスしない (ホスト権限は別軸の安全機能)
//   - app/(app)/villages/[id]/page.tsx の tier.canPost / tier.canCreateRoom (effective tier 経由)
//   - app/(app)/voice/[roomId]/page.tsx の myTier === 'visitor' disabled (bypass 時は false)
//
// バイパスしないもの (恒久的にチェック):
//   - ログイン (auth.getUser): 未ログインは引き続き拒否
//   - LiveKit token API のサーバ側 rate limit / room_not_found / room_closed
//   - voice_chat_messages 等の RLS (DB 側)
//   - Stripe / Twilio / Webhook / middleware / Cookie / reauth

export function isVerificationBypassEnabled(): boolean {
  // public flag (client / server 両方で参照)
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DISABLE_VERIFICATION_GATE === 'true') return true
  return false
}
