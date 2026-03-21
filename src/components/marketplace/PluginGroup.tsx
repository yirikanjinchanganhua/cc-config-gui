/**
 * PluginGroup.tsx
 * 可折叠的插件分组，展示插件名 + 下属 Skill 列表
 */

import { useState } from 'react';
import SkillCard from './SkillCard';
import type { MarketplacePlugin, MarketplaceSkill, InstalledSkill, PluginSource } from '../../lib/types';

interface PluginGroupProps {
    plugin: MarketplacePlugin;
    installedSkills: InstalledSkill[];
    onInstall: (pluginSource: PluginSource, skillName: string) => Promise<void>;
    onPreview: (skillName: string, pluginName: string, filePath: string) => void;
    installLoading: string | null;
}

export default function PluginGroup({
    plugin,
    installedSkills,
    onInstall,
    onPreview,
    installLoading,
}: PluginGroupProps): JSX.Element {
    const [expanded, setExpanded] = useState(true);

    // 过滤掉非对象类型的 skill（部分插件 skills 为字符串数组）
    const skills = (plugin.skills ?? []).filter(
        (s): s is MarketplaceSkill => typeof s === 'object' && s !== null,
    );
    const installedCount = skills.filter((s) =>
        installedSkills.some((i) => i.name === s.name),
    ).length;

    return (
        <div className="border border-theme-border rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-theme-selected-bg/30 hover:bg-theme-selected-bg/50 transition-colors"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-theme-text-muted shrink-0">
                        {expanded ? '▾' : '▸'}
                    </span>
                    <span className="text-sm font-medium text-theme-text truncate">
                        {plugin.name}
                    </span>
                    {plugin.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-theme-active-bg/20 text-theme-active-text shrink-0">
                            {plugin.category}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] text-theme-text-muted">
                        {installedCount}/{skills.length} 已安装
                    </span>
                    {plugin.cached && (
                        <span className="text-[10px] text-green-400/70">
                            ● 已缓存
                        </span>
                    )}
                </div>
            </button>

            {expanded && (
                <div className="divide-y divide-theme-border">
                    {skills.length === 0 ? (
                        <p className="px-3 py-4 text-xs text-theme-text-muted text-center">
                            暂无 Skill 数据
                        </p>
                    ) : (
                        skills.map((skill) => (
                            <SkillCard
                                key={skill.name}
                                skill={skill}
                                pluginSource={plugin.source}
                                installed={installedSkills.some(
                                    (i) => i.name === skill.name,
                                )}
                                onInstall={onInstall}
                                onPreview={onPreview}
                                loading={installLoading === skill.name}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
