/**
 * AddSourceModal.tsx
 * 添加自定义源弹窗
 */

import { useState } from 'react';

interface AddSourceModalProps {
    onAdd: (gitUrl: string, name: string) => Promise<void>;
    onClose: () => void;
}

export default function AddSourceModal({
    onAdd,
    onClose,
}: AddSourceModalProps): JSX.Element {
    const [name, setName] = useState('');
    const [gitUrl, setGitUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('请输入源名称');
            return;
        }
        if (!gitUrl.trim()) {
            setError('请输入 Git 仓库地址');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            await onAdd(gitUrl.trim(), name.trim());
        } catch (e) {
            setError((e as Error).message);
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={onClose}
        >
            <div
                className="bg-theme-bg border border-theme-border rounded-xl w-[440px] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-4 py-3 border-b border-theme-border">
                    <span className="font-semibold text-sm">添加自定义源</span>
                </div>
                <div className="p-4">
                    <div className="mb-3">
                        <label className="block text-xs text-theme-text-muted mb-1">
                            源名称
                        </label>
                        <input
                            className="w-full bg-theme-selected-bg border border-theme-border rounded-md px-3 py-1.5 text-sm text-theme-text outline-none focus:border-theme-active-text placeholder:text-theme-text-muted"
                            placeholder="my-custom-skills"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={submitting}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="block text-xs text-theme-text-muted mb-1">
                            Git 仓库地址
                        </label>
                        <input
                            className="w-full bg-theme-selected-bg border border-theme-border rounded-md px-3 py-1.5 text-sm text-theme-text outline-none focus:border-theme-active-text placeholder:text-theme-text-muted"
                            placeholder="https://github.com/user/repo.git"
                            value={gitUrl}
                            onChange={(e) => setGitUrl(e.target.value)}
                            disabled={submitting}
                        />
                    </div>
                    {error && (
                        <p className="text-xs text-red-400 mb-3">{error}</p>
                    )}
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs text-theme-text-muted hover:text-theme-text rounded-md transition-colors"
                            disabled={submitting}
                        >
                            取消
                        </button>
                        <button
                            onClick={() => void handleSubmit()}
                            disabled={submitting}
                            className="px-3 py-1.5 text-xs rounded-md bg-theme-active-bg/20 text-theme-active-text border border-theme-active-text hover:bg-theme-active-text hover:text-theme-bg transition-colors disabled:opacity-50"
                        >
                            {submitting ? '添加中...' : '添加'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
