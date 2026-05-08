'use client'

import type { ReactNode } from 'react'

interface PostCardShellProps {
  children: ReactNode
}

// 投稿カードの外側 wrapper を 1 ファイルに集約。
// timeline / mypage / profile/[userId] 配下の TweetCard / 村投稿カード
// (PostCard / MyVillagePostInline / ProfileVillagePostInline) すべてが
// この shell に揃う。今後カードの色味・浮き方・余白を変えるときは
// このファイル 1 つだけ直せば全画面に反映される (CLAUDE.md「全画面 UI
// 統一修正の鉄則」ルール 4 準拠)。
//
// 仕様 (timeline PostCard / 村投稿の既存値を canonical として採用):
//   - 角丸:        rounded-2xl
//   - 背景:        rgba(255,255,255,0.04)
//   - 枠:          1px solid rgba(157,92,255,0.18) (紫グロー)
//   - 影:          0 2px 12px rgba(0,0,0,0.3)
//   - 内側余白:    px-4 pt-3.5 pb-3
//
// 詳細画面 (/tweet/[tweetId]) は白背景の旧 light theme コンテキストの
// ため本 shell は使わず、呼出側の白 wrapper に直接 padding を付ける。
export default function PostCardShell({ children }: PostCardShellProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(157,92,255,0.18)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div className="px-4 pt-3.5 pb-3">
        {children}
      </div>
    </div>
  )
}
