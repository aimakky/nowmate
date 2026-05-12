import { redirect } from 'next/navigation'
// /now はレガシー URL。YVOICE の主動線である /timeline へ統一。
export default function NowPage() { redirect('/timeline') }
