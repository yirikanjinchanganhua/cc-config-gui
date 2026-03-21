/**
 * Marketplace.tsx
 * Skill 市场主页面：搜索、插件列表、已安装列表、添加源、本地导入
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { marketplaceApi } from '../../lib/marketplace-api';
import PluginGroup from './PluginGroup';
import InstalledList from './InstalledList';
import SkillPreview from './SkillPreview';
import AddSourceModal from './AddSourceModal';
import type { MarketplacePlugin, InstalledSkill, PluginSource } from '../../lib/types';

interface MarketplaceProps {
    addToast: (type: 'success' | 'error', message: string) => void;
}

export default function Marketplace({ addToast }: MarketplaceProps): JSX.Element {
    const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
    const [installedSkills, setInstalledSkills] = useState<InstalledSkill[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // 安装/预览状态
    const [installLoading, setInstallLoading] = useState<string | null>(null);
    const [preview, setPreview] = useState<{
        skillName: string;
        pluginName: string;
        content: string;
    } | null>(null);

    // 添加源弹窗
    const [showAddSource, setShowAddSource] = useState(false);

    // ─── 数据加载 ───────────────────────────────────────────────────────────────

    const loadData = useCallback(async () => {
        try {
            const [pluginsData, installed] = await Promise.all([
                marketplaceApi.fetchPlugins(),
                marketplaceApi.getInstalledSkills(),
            ]);
            setPlugins(pluginsData);
            setInstalledSkills(installed);
        } catch (e) {
            addToast('error', `加载市场数据失败：${(e as Error).message}`);
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    // ─── 缓存插件（获取 Skill 列表） ──────────────────────────────────────────

    const handleCachePlugin = useCallback(
        async (pluginName: string) => {
            try {
                const plugin = plugins.find((p) => p.name === pluginName);
                if (!plugin) return;
                const result = await marketplaceApi.cachePlugin(plugin.source);
                // 更新本地 plugin 的 skills 列表
                setPlugins((prev) =>
                    prev.map((p) =>
                        p.name === pluginName
                            ? { ...p, skills: result.skills, cached: true }
                            : p,
                    ),
                );
                addToast('success', `已加载 ${pluginName} 的 Skill 列表`);
            } catch (e) {
                addToast('error', `缓存插件失败：${(e as Error).message}`);
            }
        },
        [plugins, addToast],
    );

    // ─── 刷新缓存 ───────────────────────────────────────────────────────────────

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const result = await marketplaceApi.refreshCache();
            await loadData();
            addToast('success', `已刷新，更新了 ${result.updated} 个插件`);
        } catch (e) {
            addToast('error', `刷新失败：${(e as Error).message}`);
        } finally {
            setRefreshing(false);
        }
    }, [loadData, addToast]);

    // ─── 安装 Skill ─────────────────────────────────────────────────────────────

    const handleInstall = useCallback(
        async (pluginSource: PluginSource, skillName: string) => {
            setInstallLoading(skillName);
            try {
                await marketplaceApi.installSkill(pluginSource, skillName);
                // 重新加载已安装列表
                const installed = await marketplaceApi.getInstalledSkills();
                setInstalledSkills(installed);
                addToast('success', `已安装 ${skillName}`);
            } catch (e) {
                addToast('error', `安装失败：${(e as Error).message}`);
            } finally {
                setInstallLoading(null);
            }
        },
        [addToast],
    );

    // ─── 卸载 Skill ─────────────────────────────────────────────────────────────

    const handleUninstall = useCallback(
        async (skillName: string) => {
            try {
                await marketplaceApi.uninstallSkill(skillName);
                setInstalledSkills((prev) =>
                    prev.filter((s) => s.name !== skillName),
                );
                addToast('success', `已卸载 ${skillName}`);
            } catch (e) {
                addToast('error', `卸载失败：${(e as Error).message}`);
            }
        },
        [addToast],
    );

    // ─── 预览 Skill ─────────────────────────────────────────────────────────────

    const handlePreview = useCallback(
        async (skillName: string, pluginName: string, filePath: string) => {
            try {
                const result = await marketplaceApi.getSkillDetails(filePath);
                setPreview({
                    skillName,
                    pluginName,
                    content: result.content,
                });
            } catch (e) {
                addToast('error', `加载预览失败：${(e as Error).message}`);
            }
        },
        [addToast],
    );

    // ─── 添加自定义源 ───────────────────────────────────────────────────────────

    const handleAddSource = useCallback(
        async (gitUrl: string, name: string) => {
            try {
                await marketplaceApi.addSource(gitUrl, name);
                setShowAddSource(false);
                await loadData();
                addToast('success', `已添加源「${name}」`);
            } catch (e) {
                addToast('error', `添加源失败：${(e as Error).message}`);
                throw e;
            }
        },
        [loadData, addToast],
    );

    // ─── 本地导入 ───────────────────────────────────────────────────────────────

    const handleImportLocal = useCallback(async () => {
        try {
            // 通过 IPC 打开目录选择对话框，返回选中的目录路径字符串
            const dirPath = await window.electron.invoke(
                'marketplace:pick-directory',
            );
            if (!dirPath || typeof dirPath !== 'string') {
                return;
            }
            const importResult =
                await marketplaceApi.importLocal(dirPath);
            await loadData();
            addToast(
                'success',
                `已导入 ${importResult.installed} 个 Skill`,
            );
        } catch (e) {
            addToast('error', `导入失败：${(e as Error).message}`);
        }
    }, [loadData, addToast]);

    // ─── 筛选逻辑 ───────────────────────────────────────────────────────────────

    const categories = useMemo(() => {
        const cats = new Set<string>();
        plugins.forEach((p) => {
            if (p.category) cats.add(p.category);
        });
        return ['all', ...Array.from(cats).sort()];
    }, [plugins]);

    const filteredPlugins = useMemo(() => {
        return plugins.filter((p) => {
            if (categoryFilter !== 'all' && p.category !== categoryFilter)
                return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                const nameMatch = p.name.toLowerCase().includes(q);
                const descMatch = p.description?.toLowerCase().includes(q);
                const skillMatch = p.skills?.some(
                    (s) =>
                        typeof s === 'object' &&
                        (s.name?.toLowerCase().includes(q) ||
                            s.description?.toLowerCase().includes(q)),
                );
                return nameMatch || descMatch || skillMatch;
            }
            return true;
        });
    }, [plugins, search, categoryFilter]);

    // ─── 渲染 ───────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-sm text-theme-text-muted">加载中...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* 工具栏 */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-theme-border shrink-0">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索插件或 Skill..."
                    className="flex-1 bg-theme-selected-bg border border-theme-border rounded-md px-3 py-1.5 text-sm text-theme-text outline-none focus:border-theme-active-text placeholder:text-theme-text-muted"
                />
                {categories.length > 1 && (
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-theme-selected-bg border border-theme-border rounded-md px-2 py-1.5 text-xs text-theme-text outline-none focus:border-theme-active-text"
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat === 'all' ? '全部分类' : cat}
                            </option>
                        ))}
                    </select>
                )}
                <button
                    onClick={() => void handleRefresh()}
                    disabled={refreshing}
                    className="px-2.5 py-1.5 text-xs text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg rounded-md transition-colors disabled:opacity-50"
                    title="刷新缓存"
                >
                    {refreshing ? '刷新中...' : ' 刷新'}
                </button>
                <button
                    onClick={() => setShowAddSource(true)}
                    className="px-2.5 py-1.5 text-xs text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg rounded-md transition-colors"
                    title="添加自定义源"
                >
                    + 添加源
                </button>
                <button
                    onClick={() => void handleImportLocal()}
                    className="px-2.5 py-1.5 text-xs text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg rounded-md transition-colors"
                    title="从本地目录导入"
                >
                    导入本地
                </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* 已安装区域 */}
                <InstalledList
                    skills={installedSkills}
                    onUninstall={handleUninstall}
                    onPreview={handlePreview}
                />

                {/* 插件列表 */}
                {filteredPlugins.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-theme-text-muted">
                            {search.trim() || categoryFilter !== 'all'
                                ? '没有匹配的结果'
                                : '暂无可浏览的插件'}
                        </p>
                    </div>
                ) : (
                    filteredPlugins.map((plugin) => (
                        <PluginGroup
                            key={plugin.name}
                            plugin={plugin}
                            installedSkills={installedSkills}
                            onInstall={handleInstall}
                            onPreview={handlePreview}
                            installLoading={installLoading}
                        />
                    ))
                )}
            </div>

            {/* 弹窗 */}
            {preview && (
                <SkillPreview
                    skillName={preview.skillName}
                    pluginName={preview.pluginName}
                    content={preview.content}
                    onClose={() => setPreview(null)}
                />
            )}

            {showAddSource && (
                <AddSourceModal
                    onAdd={handleAddSource}
                    onClose={() => setShowAddSource(false)}
                />
            )}
        </div>
    );
}
