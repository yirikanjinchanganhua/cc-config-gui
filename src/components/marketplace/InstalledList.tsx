/**
 * InstalledList.tsx
 * 已安装 Skills 列表，支持卸载
 */

import { useState } from 'react';
import type { InstalledSkill } from '../../lib/types';

interface InstalledListProps {
    skills: InstalledSkill[];
    onUninstall: (skillName: string) => Promise<void>;
    onPreview: (skillName: string, pluginName: string, filePath: string) => void;
}

export default function InstalledList({
    skills,
    onUninstall,
    onPreview,
}: InstalledListProps): JSX.Element {
    const [expanded, setExpanded] = useState(true);
    const [uninstalling, setUninstalling] = useState<string | null>(null);

    const handleUninstall = async (skillName: string) => {
        setUninstalling(skillName);
        try {
            await onUninstall(skillName);
        } finally {
            setUninstalling(null);
        }
    };

    if (skills.length === 0) {
        return (
            <div className="border border-theme-border rounded-lg p-4 text-center">
                <p className="text-xs text-theme-text-muted">
                    暂无已安装的 Skill
                </p>
            </div>
        );
    }

    return (
        <div className="border border-theme-border rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-theme-selected-bg/30 hover:bg-theme-selected-bg/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xs text-theme-text-muted shrink-0">
                        {expanded ? '▾' : '▸'}
                    </span>
                    <span className="text-sm font-medium text-theme-text">
                        已安装
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-400/10 text-green-400">
                        {skills.length}
                    </span>
                </div>
            </button>

            {expanded && (
                <div className="divide-y divide-theme-border">
                    {skills.map((skill) => (
                        <div
                            key={skill.name}
                            className="flex items-start gap-3 px-3 py-2.5 hover:bg-theme-selected-bg/20 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-theme-text">
                                    {skill.name}
                                </span>
                                <p className="text-[10px] text-theme-text-muted mt-0.5">
                                    来自 {skill.sourcePlugin}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                <button
                                    onClick={() =>
                                        onPreview(
                                            skill.name,
                                            skill.sourcePlugin,
                                            skill.files[0] ?? '',
                                        )
                                    }
                                    className="px-2 py-1 text-[10px] text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg rounded transition-colors"
                                    title="预览 SKILL.md"
                                >
                                    预览
                                </button>
                                <button
                                    onClick={() => void handleUninstall(skill.name)}
                                    disabled={uninstalling === skill.name}
                                    className="px-2 py-1 text-[10px] text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50"
                                >
                                    {uninstalling === skill.name
                                        ? '卸载中...'
                                        : '卸载'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
