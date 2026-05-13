'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNationalityFlag, timeAgo, checkSupportedLocation } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import TweetCard, { TweetData } from '@/components/ui/TweetCard'
import Avatar from '@/components/ui/Avatar'

interface Reply {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { display_name: string; nationality: string; avatar_url: string | null }
}

export default function TweetDetailPage() {
  const { tweetId } = useParams<{ tweetId: string }>()
  const router = useRouter()
  const [tweet, setTweet] = useState<TweetData | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  // 2026-05-08 マッキーさん指示「位置情報取得処理は、明確に位置情報が必要な
  // ボタン・画面でユーザーが操作した時だけ実行」遵守。
  //
  // 初期値 true: ページマウント時に位置情報を取らないため、UI は最初から
  // 操作可能 (TweetCard の Heart / Comment / 返信フォーム) として描画する。
  // 旧実装はマウント時に checkSupportedLocation() を自動呼出して
  // canInteract を false から true に切り替えていたが、これが iPhone Safari
  // の Geolocation ダイアログを「投稿カードのコメントボタンを押しただけで」
  // 表示する真因だった (timeline → /tweet/[tweetId] 遷移で本ページが mount
  // される瞬間に位置情報が要求されていた)。
  //
  // 新実装: 位置確認は postReply (= ユーザーが Reply ボタンを押した瞬間)
  // でだけ行う。サポート外/拒否なら canInteract=false に切り替えて既存の
  // 「supported countries」表示に分岐させる (L108 の三項演算子はそのまま使える)。
  const [canInteract, setCanInteract] = useState(true)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setMyId(user.id)
        const { data } = await createClient().from('profiles')
          .select('display_name, avatar_url').eq('id', user.id).single()
        if (data) setMyProfile(data)
      }
    })
    // 2026-05-08: マウント時の checkSupportedLocation() 自動呼出は撤去。
    // 投稿カードのコメントボタン押下でこのページに遷移しただけで iPhone Safari
    // が位置情報許可ダイアログを出す真因だった。位置確認は postReply 内で
    // ユーザーが Reply ボタンを押した瞬間に初めて実行する。
  }, [])

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: t }, { data: reps }] = await Promise.all([
      supabase.from('tweets')
        .select('*, profiles(display_name, nationality, avatar_url), tweet_reactions(user_id, reaction), tweet_replies(id)')
        .eq('id', tweetId)
        .single(),
      supabase.from('tweet_replies')
        .select('*, profiles(display_name, nationality, avatar_url)')
        .eq('tweet_id', tweetId)
        .order('created_at', { ascending: true }),
    ])
    if (t) setTweet(t as TweetData)
    setReplies((reps || []) as Reply[])
    setLoading(false)
  }, [tweetId])

  useEffect(() => { if (tweetId) load() }, [tweetId, load])

  async function postReply() {
    if (!replyInput.trim() || !myId || posting) return
    setPosting(true)

    // 2026-05-08 マッキーさん指示: 位置情報は「Reply ボタン押下時」だけに限定。
    // ここで初めて checkSupportedLocation を呼ぶ (iPhone Safari の geolocation
    // ダイアログはユーザーが明確にアクションした瞬間に出るので UX 上自然)。
    // サポート外 / 拒否なら canInteract=false にして既存の「Replies are only
    // available in supported countries」表示 (L108 の三項演算子) に切替える。
    const status = await checkSupportedLocation()
    if (status !== 'supported') {
      setCanInteract(false)
      setPosting(false)
      return
    }

    const supabase = createClient()
    const { data: newReply } = await supabase
      .from('tweet_replies')
      .insert({ tweet_id: tweetId, user_id: myId, content: replyInput.trim() })
      .select('*, profiles(display_name, nationality, avatar_url)')
      .single()
    if (newReply) {
      setReplies(prev => [...prev, newReply as Reply])
      setTweet(prev => prev ? { ...prev, reply_count: (prev.reply_count || 0) + 1 } : prev)
    }
    setReplyInput('')
    setPosting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-birch">
      <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!tweet) return null

  return (
    <div className="max-w-md mx-auto min-h-screen bg-birch">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-stone-500 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <p className="font-extrabold text-stone-900">Post</p>
      </div>

      {/* Main tweet
          2026-05-08 (8 回目): TweetCard 自身が持っていた px-4 py-4 内側 padding を
          PostCardShell 統一に伴い撤去したため、ここで明示的に補填する。
          詳細画面は白背景の旧 light theme コンテキストのため PostCardShell
          (dark glass card) は当てず、既存白 wrapper にパディングを追加する。 */}
      <div className="bg-white border-b-4 border-stone-100 px-4 py-4">
        <TweetCard tweet={tweet} myId={myId} onUpdate={load} showBorder={false} canInteract={canInteract} />
      </div>

      {/* Reply compose — Japan only */}
      {myId && (
        canInteract ? (
          <div className="bg-white border-b border-stone-100 px-4 py-3 flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Avatar src={myProfile?.avatar_url} name={myProfile?.display_name ?? ''} size="sm" />
            </div>
            <div className="flex-1">
              <textarea
                value={replyInput}
                onChange={e => setReplyInput(e.target.value.slice(0, 280))}
                placeholder="Write a reply..."
                rows={2}
                className="w-full text-sm resize-none focus:outline-none text-stone-800 placeholder-stone-400"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-stone-400">{replyInput.length}/280</span>
                <button
                  onClick={postReply}
                  disabled={!replyInput.trim() || posting}
                  className="px-4 py-1.5 bg-brand-500 text-white rounded-xl text-xs font-bold disabled:opacity-40 active:scale-95 transition-all">
                  {posting ? '...' : 'Reply'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-stone-50 border-b border-stone-100 px-4 py-3 text-center">
            <span className="text-xs text-stone-400">🇯🇵 Replies are only available in supported countries</span>
          </div>
        )
      )}

      {/* Replies */}
      <div className="bg-white divide-y divide-stone-50">
        {replies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm text-stone-400 font-medium">No replies yet. Be the first!</p>
          </div>
        ) : (
          replies.map(reply => {
            const flag = getNationalityFlag(reply.profiles?.nationality || '')
            return (
              <div key={reply.id} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => router.push(`/profile/${reply.user_id}`)} className="flex-shrink-0 mt-0.5">
                    <Avatar src={reply.profiles?.avatar_url} name={reply.profiles?.display_name} size="sm" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <button
                        onClick={() => router.push(`/profile/${reply.user_id}`)}
                        className="font-extrabold text-stone-900 text-sm hover:underline leading-tight">
                        {reply.profiles?.display_name}
                      </button>
                      <span className="text-base leading-none">{flag}</span>
                      <span className="text-xs text-stone-400">{timeAgo(reply.created_at)}</span>
                    </div>
                    <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="h-28" />
    </div>
  )
}
