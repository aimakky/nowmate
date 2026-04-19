'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Toast as ToastType } from '@/hooks/useToast'

interface ToastProps {
  toast: ToastType
  onRemove: (id: string) => void
}

const styles = {
  success: 'bg-green-500 text-white',
  error:   'bg-red-500 text-white',
  info:    'bg-brand-500 text-white',
  match:   'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
}

const icons = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  match:   '❤️',
}

export function ToastItem({ toast, onRemove }: ToastProps) {
  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg min-w-[240px] max-w-[320px]',
      'animate-toast-in',
      styles[toast.type]
    )}>
      <span className="text-lg flex-shrink-0 mt-0.5">{icons[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition ml-1"
      >
        <X size={14} />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastType[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}
