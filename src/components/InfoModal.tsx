interface InfoModalProps {
    title: string
    children: React.ReactNode
    onClose: () => void
}

export default function InfoModal({ title, children, onClose }: InfoModalProps): JSX.Element {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as React.CSSProperties}
            onClick={onClose}
        >
            <div
                className="relative z-10 w-[400px] max-w-[90vw] rounded-[18px] p-[20px]"
                style={{
                    background: 'var(--color-card-bg)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid var(--color-card-border)',
                    boxShadow: 'var(--card-shadow), 0 16px 48px rgba(0,0,0,0.20)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-[12px]">
                    <h3 className="text-[13px] font-semibold text-theme-text tracking-[-0.2px]">{title}</h3>
                    <button
                        className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center text-theme-text-faint hover:text-theme-text transition-colors text-[14px] leading-none"
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-input-bg)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        onClick={onClose}
                        aria-label="关闭"
                    >
                        ✕
                    </button>
                </div>
                <div className="text-[12px] text-theme-text-muted leading-relaxed space-y-[8px]">
                    {children}
                </div>
            </div>
        </div>
    )
}
