// 旧 nowmate 時代の「ホーム」ページ。職業村への入口だったが samee 移行後は不要。
// 内部から /villages や /home が複数呼ばれていたため、ページ自体を redirect で
// 殺すのが最も安全。BottomNav には /home エントリは存在しないので、ここに
// 到達するのは旧 redirect 残骸のみ。
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/timeline')
}
