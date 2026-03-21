interface ConfirmDialogProps {
    title: string
    message: React.ReactNode
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    onCancel: () => void
}

export default function ConfirmDialog({
    title, message, confirmLabel = '确认', cancelLabel = '取消', onConfirm, onCancel,
}: ConfirmDialogProps): JSX.Element {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as React.CSSProperties}
        >
            <div
                className="w-[380px] rounded-[18px] p-[22px] flex flex-col gap-[14px]"
                style={{
                    background: 'var(--color-card-bg)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid var(--color-card-border)',
                    boxShadow: 'var(--card-shadow), 0 16px 48px rgba(0,0,0,0.20)',
                }}
            >
                <h2 className="text-[14px] font-semibold text-theme-text tracking-[-0.2px]">{title}</h2>
                <div className="text-[12.5px] text-theme-text-muted leading-relaxed">{message}</div>
                <div className="flex gap-[8px] justify-end pt-[2px]">
                    <button
                        className="px-[14px] py-[6px] text-[12.5px] rounded-[9px] font-medium transition-colors duration-100"
                        style={{ background: 'var(--color-input-bg)', color: 'var(--color-text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        className="px-[14px] py-[6px] text-[12.5px] rounded-[9px] font-medium text-white transition-opacity duration-100 hover:opacity-90"
                        style={{ background: 'var(--color-accent)' }}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
