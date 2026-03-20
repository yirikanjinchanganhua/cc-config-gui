/**
 * InfoModal.tsx
 * 点击「？」图标触发的说明弹框组件。
 * 点击遮罩或右上角关闭按钮均可关闭。
 */

interface InfoModalProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
}

export default function InfoModal({
    title,
    children,
    onClose,
}: InfoModalProps): JSX.Element {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            {/* 遮罩 */}
            <div className="absolute inset-0 bg-black/40" />

            {/* 弹框 */}
            <div
                className="relative z-10 w-96 max-w-[90vw] bg-theme-sidebar border border-theme-border rounded-xl shadow-2xl p-5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 标题栏 */}
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-theme-text">
                        {title}
                    </h3>
                    <button
                        className="w-6 h-6 flex items-center justify-center rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg transition-colors text-base leading-none"
                        onClick={onClose}
                        aria-label="关闭"
                    >
                        ✕
                    </button>
                </div>

                {/* 内容 */}
                <div className="text-xs text-theme-text-muted leading-relaxed space-y-2">
                    {children}
                </div>
            </div>
        </div>
    );
}
