'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // MVP: just show success. Connect to email service later.
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <Link href="/" className="text-sm text-brand-500">← Back</Link>
      </div>
      <div className="max-w-sm mx-auto px-5 py-10">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-sm text-gray-500 mb-6">Have a question or feedback? We'd love to hear from you.</p>

        {sent ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📬</div>
            <p className="font-bold text-gray-800">Message sent!</p>
            <p className="text-sm text-gray-500 mt-1">We'll get back to you as soon as possible.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Your email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={4}
                placeholder="Tell us what's on your mind..."
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <Button type="submit" fullWidth size="lg">Send Message</Button>
          </form>
        )}
      </div>
    </div>
  )
}
