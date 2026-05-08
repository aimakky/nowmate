'use client'

// useReauth — 再認証 (reauth) フローの React hook
//
// 使い方:
//   const { isOpen, loading, error, requestReauth, closeReauth, verifyAndContinue } = useReauth()
//
//   // 退会ボタンクリック時:
//   <button onClick={() => requestReauth(async () => {
//     // 退会本処理 (deleteAccount など)
//   }, '退会するためには本人確認が必要です')} />
//
//   <ReAuthModal
//     isOpen={isOpen}
//     loading={loading}
//     error={error}
//     description="退会するためには本人確認が必要です"
//     onClose={closeReauth}
//     onSubmit={verifyAndContinue}
//   />
//
// requestReauth(action, description) は:
//   1. isReauthFresh() なら action を即実行 (modal を出さない)
//   2. fresh でなければ description / pendingAction を保存して modal を開く
//
// verifyAndContinue(password) は:
//   1. verifyPassword(password) を呼ぶ
//   2. 成功なら markReauthFresh() (helper 内で実行済み) → pendingAction を実行
//      → modal を閉じる
//   3. 失敗なら error state にメッセージを入れて modal は開いたまま

import { useCallback, useState } from 'react'
import { isReauthFresh, verifyPassword } from '@/lib/reauth'

type PendingAction = (() => void | Promise<void>) | null

export interface UseReauthReturn {
  /** modal が開いているか */
  isOpen: boolean
  /** verifyAndContinue 中の loading フラグ */
  loading: boolean
  /** verifyAndContinue 失敗時のエラーメッセージ */
  error: string | null
  /** modal に表示する説明文 */
  description: string | null
  /**
   * 重要操作の前に reauth が必要なら modal を開く。fresh なら action を即実行。
   * @param action 認証成功後に実行する関数
   * @param description modal に表示する説明文 (例: '退会するためには本人確認が必要です')
   */
  requestReauth: (action: () => void | Promise<void>, description?: string) => Promise<void>
  /** modal を閉じる (action は実行しない) */
  closeReauth: () => void
  /** modal でパスワードを入力した後の処理 */
  verifyAndContinue: (password: string) => Promise<void>
}

export function useReauth(): UseReauthReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const closeReauth = useCallback(() => {
    setIsOpen(false)
    setError(null)
    setLoading(false)
    setPendingAction(null)
    setDescription(null)
  }, [])

  const requestReauth = useCallback(
    async (action: () => void | Promise<void>, desc?: string) => {
      // fresh なら modal を出さず即実行 (UX 優先)
      if (isReauthFresh()) {
        await action()
        return
      }
      // 期限切れまたは未認証 → modal を開く
      setPendingAction(() => action)
      setDescription(desc ?? null)
      setError(null)
      setIsOpen(true)
    },
    []
  )

  const verifyAndContinue = useCallback(
    async (password: string) => {
      setLoading(true)
      setError(null)
      const result = await verifyPassword(password)
      if (!result.ok) {
        setError(result.error ?? '再認証に失敗しました')
        setLoading(false)
        return
      }
      // 成功 → pending action 実行 → modal を閉じる
      // pendingAction の参照を保持してから state を空にしないと、
      // close → action の順だと action 実行中に再 render で state が消える可能性
      const action = pendingAction
      setLoading(false)
      setIsOpen(false)
      setError(null)
      setDescription(null)
      setPendingAction(null)
      if (action) {
        try {
          await action()
        } catch (e) {
          // pendingAction 内のエラーは reauth modal の責務外。呼出側で handle すること。
          console.error('[useReauth] pending action threw:', e)
        }
      }
    },
    [pendingAction]
  )

  return {
    isOpen,
    loading,
    error,
    description,
    requestReauth,
    closeReauth,
    verifyAndContinue,
  }
}
