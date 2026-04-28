'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ImagePlus, X } from 'lucide-react'
import { INDUSTRIES, TOPIC_TAGS, getIndustry } from '@/lib/guild'
import { getUserTrust } from '@/lib/trust'

export default function GuildCreatePage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [userId,    setUserId]    = useState<string | null>(null)
  const [industry,  setIndustry]  = useState<string>('')
  const [topicTag,  setTopicTag]  = useState(TOPIC_TAGS[6].id)
  const [content,   setContent]   = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePrev, setImagePrev] = useState<string | null>(null)
  const [submitting,setSubmitting]= useState(false)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const trust = await getUserTrust(user.id)
      if (!trust || trust.tier === 'visitor') {
        setError('電話番号を認証してから投稿できます')
        return
      }
      const { data: p } = await supabase.from('profiles').select('industry').eq('id', user.id).single()
      if (p?.industry) setIndustry(p.industry)
    }
    load()
  }, [router])

  const ind = industry ? getIndustry(industry) : null

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('画像は5MB以下にしてください'); return }
    setImageFile(file)
    setImagePrev(URL.createObjectURL(file))
    setError('')
  }

  async function handleSubmit() {
    if (!userId || !content.trim() || !industry || submitting) return
    if (content.length > 500) { setError('500文字以内で入力してください'); return }
    setError('')
    setSubmitting(true)
    const supabase = createClient()

    let image_url: string | null = null
    if (imageFile) {
      setUploading(true)
      const ext  = imageFile.name.split('.').pop() ?? 'jpg'
      const path = `guild/${userId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('qa-images').upload(path, imageFile, { contentType: imageFile.type })
      if (!upErr) image_url = supabase.storage.from('qa-images').getPublicUrl(path).data.publicUrl
      setUploading(false)
    }

    const { error: err } = await supabase.from('guild_posts').insert({
      user_id: userId, industry, topic_tag: topicTag, content: content.trim(), image_url,
    })

    if (err) { setError('投稿に失敗しました'); setSubmitting(false); return }
    router.push('/guild')
  }

  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ background: '#f5f3ff' }}>

      {/* ヘッダー */}
      <div className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{ background: ind ? ind.gradient : 'linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)' }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div>
          <p className="font-extrabold text-white text-base">仕事村に投稿</p>
          <p className="text-white/60 text-[10px]">匿名で本音を話そう</p>
        </div>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-5">

        {/* 業界選択 */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
            あなたの業界 <span className="text-rose-400">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {INDUSTRIES.map(i => (
              <button key={i.id}
                onClick={() => setIndustry(i.id)}
                className="flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all active:scale-95"
                style={industry === i.id
                  ? { borderColor: i.color, background: `${i.color}15` }
                  : { borderColor: '#e0e7ff', background: '#fff' }
                }
              >
                <span className="text-lg flex-shrink-0">{i.emoji}</span>
                <p className="text-xs font-bold leading-tight"
                  style={{ color: industry === i.id ? i.color : '#78716c' }}>
                  {i.id}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* トピックタグ */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
            トピック <span className="text-rose-400">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {TOPIC_TAGS.map(t => (
              <button key={t.id}
                onClick={() => setTopicTag(t.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 border"
                style={topicTag === t.id
                  ? { background: ind ? ind.color : '#6366f1', color: '#fff', borderColor: 'transparent' }
                  : { background: '#fff', color: '#78716c', borderColor: '#e0e7ff' }
                }
              >{t.emoji} {t.id}</button>
            ))}
          </div>
        </div>

        {/* 本文 */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            内容 <span className="text-rose-400">*</span>
          </p>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="本音で話してください。業界名と信頼ティアしか表示されません。"
            maxLength={500}
            rows={6}
            className="w-full px-4 py-3 rounded-2xl text-sm resize-none focus:outline-none leading-relaxed text-stone-800 placeholder-stone-300 bg-white"
            style={{ border: '1px solid #e0e7ff', caretColor: '#6366f1' }}
          />
          <div className="flex justify-between mt-1">
            <p className="text-[10px] text-stone-400">10〜500文字</p>
            <p className="text-[10px]" style={{ color: content.length > 450 ? '#f87171' : '#c4b5fd' }}>{content.length}/500</p>
          </div>
        </div>

        {/* 画像 */}
        <div>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            画像 <span className="text-stone-300 normal-case font-normal">（任意・5MBまで）</span>
          </p>
          {imagePrev ? (
            <div className="relative">
              <img src={imagePrev} alt="" className="w-full max-h-64 object-cover rounded-2xl border border-white/10" />
              <button
                onClick={() => { setImageFile(null); setImagePrev(null); if (fileRef.current) fileRef.current.value = '' }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center">
                <X size={13} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-3 p-4 rounded-2xl transition-colors bg-white"
              style={{ border: '1px dashed #c4b5fd' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: ind ? `${ind.color}18` : '#ede9fe' }}>
                <ImagePlus size={18} style={{ color: ind?.color ?? '#6366f1' }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-stone-400">画像を追加</p>
                <p className="text-[10px] text-stone-300">JPG / PNG / WebP</p>
              </div>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden" onChange={handleImageChange} />
        </div>

        {/* 注意 */}
        <div className="rounded-2xl px-4 py-3 bg-white" style={{ border: '1px solid #e0e7ff' }}>
          <p className="text-xs text-stone-500 leading-relaxed">
            🔒 <span className="font-bold text-stone-600">匿名ルール</span><br />
            · 表示されるのは業界名と信頼ティアのみ<br />
            · 個人・会社を特定できる情報は書かないでください<br />
            · 通報3件でシャドーBANされます
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!industry || content.length < 10 || submitting}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base disabled:opacity-30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{ background: ind ? ind.gradient : 'linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)', boxShadow: `0 8px 24px ${ind?.color ?? '#6366f1'}40` }}
        >
          {submitting
            ? <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {uploading ? '画像アップロード中...' : '投稿中...'}</>
            : `⚔️ 仕事村に投稿する`
          }
        </button>
      </div>
    </div>
  )
}
