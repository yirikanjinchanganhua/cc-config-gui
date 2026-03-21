/**
 * SkillPreview.tsx
 * SKILL.md 预览弹窗
 */

interface SkillPreviewProps {
    skillName: string;
    pluginName: string;
    content: string;
    onClose: () => void;
}

export default function SkillPreview({
    skillName,
    pluginName,
    content,
    onClose,
}: SkillPreviewProps): JSX.Element {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={onClose}
        >
            <div
                className="bg-theme-bg border border-theme-border rounded-xl w-[700px] max-h-[80vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border">
                    <div>
                        <span className="font-semibold text-sm">{skillName}</span>
                        <span className="text-xs text-theme-text-muted ml-2">
                            来自 {pluginName}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg text-lg transition-colors"
                    >
                        x
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto text-xs leading-relaxed text-theme-text-muted">
                    <pre className="whitespace-pre-wrap font-mono text-[11px] leading-6 bg-black/20 p-3 rounded-md overflow-x-auto">
                        {content}
                    </pre>
                </div>
            </div>
        </div>
    );
}
