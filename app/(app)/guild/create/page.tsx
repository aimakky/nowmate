'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ギルド作成 = ゲームカテゴリで村を作るのと同じ
// villages/create に preset=game で誘導する
export default function GuildCreateRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/villages/create?preset=game')
  }, [router])
  return null
}
