import type { Metadata } from 'next'

// /guides 配下は旧 nowmate (海外移住者向けの Japan expat ガイド) の遺産。
// 現在の YVOICE (20 歳以上の日本人ゲーマー向け通話コミュニティ) のサービス
// 内容と完全に無関係なので、Google から段階的に deindex させるため robots
// メタタグで全ページを noindex / nofollow にする。子ページ側の metadata で
// 個別に上書きされない限り、ここの設定が継承される。
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
