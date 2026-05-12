// /home はレガシー URL。BottomNav に /home エントリは存在せず、
// 到達経路は旧リンク・ブックマーク経由のみ。
// 安全側に倒し YVOICE のメイン動線 /timeline へ統一。
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/timeline')
}
