import { useEffect } from 'react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error'
  message: string
}

interface ToastItemProps {
  toast: ToastMessage
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      className={[
        'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium min-w-64 max-w-sm',
        toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white',
      ].join(' ')}
    >
      <span className="shrink-0">{toast.type === 'success' ? '✓' : '✕'}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        className="shrink-0 ml-1 opacity-70 hover:opacity-100 transition-opacity"
        onClick={() => onDismiss(toast.id)}
      >
        ✕
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps): JSX.Element {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-[100]">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
