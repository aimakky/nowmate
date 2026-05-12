import { redirect } from 'next/navigation'
// /activity はレガシー URL。YVOICE の主動線である /timeline へ統一。
export default function ActivityPage() { redirect('/timeline') }
