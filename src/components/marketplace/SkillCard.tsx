/**
 * SkillCard.tsx
 * 单个 Skill 行：名称、描述、安装/预览按钮
 */

import type { MarketplaceSkill, PluginSource } from '../../lib/types';

interface SkillCardProps {
    skill: MarketplaceSkill;
    pluginSource: PluginSource;
    installed: boolean;
    onInstall: (pluginSource: PluginSource, skillName: string) => Promise<void>;
    onPreview: (skillName: string, pluginName: string, filePath: string) => void;
    loading: boolean;
}

export default function SkillCard({
    skill,
    pluginSource,
    installed,
    onInstall,
    onPreview,
    loading,
}: SkillCardProps): JSX.Element {
    return (
        <div className="flex items-start gap-3 px-3 py-2.5 hover:bg-theme-selected-bg/20 transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-theme-text">
                        {skill.name}
                    </span>
                    {installed && (
                        <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                            已安装
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-theme-text-muted mt-0.5 line-clamp-2 leading-4">
                    {skill.description}
                </p>
            </div>
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <button
                    onClick={() =>
                        onPreview(skill.name, skill.pluginName, skill.filePath)
                    }
                    className="px-2 py-1 text-[10px] text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg rounded transition-colors"
                    title="预览 SKILL.md"
                >
                    预览
                </button>
                {!installed && (
                    <button
                        onClick={() => void onInstall(pluginSource, skill.name)}
                        disabled={loading}
                        className="px-2 py-1 text-[10px] rounded bg-theme-active-bg/20 text-theme-active-text border border-theme-active-text hover:bg-theme-active-text hover:text-theme-bg transition-colors disabled:opacity-50"
                    >
                        {loading ? '安装中...' : '安装'}
                    </button>
                )}
            </div>
        </div>
    );
}
