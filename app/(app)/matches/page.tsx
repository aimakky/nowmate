import { redirect } from 'next/navigation'
// 旧 redirect 先 /villages は撤去済み。matches は今や DM の概念とぶつかっているので、
// チャット一覧 /chat へ送るのが意味的にも正解。
export default function MatchesPage() { redirect('/chat') }
