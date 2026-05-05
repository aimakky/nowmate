import { redirect } from 'next/navigation'
// 旧: /villages（旧 nowmate 一覧）→ samee の主動線である /timeline へ統一
export default function ActivityPage() { redirect('/timeline') }
