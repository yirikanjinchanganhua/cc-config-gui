import { useEffect } from 'react'

export interface ToastMessage {
    id: string
    type: 'success' | 'error'
    message: string
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }): JSX.Element {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), 4000)
        return () => clearTimeout(timer)
    }, [toast.id, onDismiss])

    const isSuccess = toast.type === 'success'

    return (
        <div
            className="flex items-center gap-[10px] px-[14px] py-[10px] rounded-[12px] text-[12.5px] font-medium min-w-[240px] max-w-sm"
            style={{
                background: isSuccess ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: `1px solid ${isSuccess ? 'rgba(48,209,88,0.30)' : 'rgba(255,69,58,0.30)'}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.10)',
                color: isSuccess ? 'var(--color-green)' : 'var(--color-red)',
            }}
        >
            <span className="shrink-0 text-[14px]">{isSuccess ? '✓' : '✕'}</span>
            <span className="flex-1 text-theme-text">{toast.message}</span>
            <button
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-theme-text-muted"
                onClick={() => onDismiss(toast.id)}
            >
                ✕
            </button>
        </div>
    )
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }): JSX.Element {
    return (
        <div className="fixed bottom-[16px] right-[16px] flex flex-col gap-[6px] z-[100]">
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
            ))}
        </div>
    )
}
