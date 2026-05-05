import { redirect } from 'next/navigation'
// 旧 redirect 先 /villages は撤去済み。今は samee の主動線である /timeline へ。
export default function NowPage() { redirect('/timeline') }
