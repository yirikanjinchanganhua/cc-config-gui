import { useState, useEffect, useRef, useCallback } from 'react';
import './assets/main.css';
import Sidebar from './components/Sidebar';
import DetailPanel from './components/DetailPanel';
import ProfileForm from './components/ProfileForm';
import InfoModal from './components/InfoModal';
import { ToastContainer, type ToastMessage } from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import TabBar from './components/TabBar';
import Marketplace from './components/marketplace/Marketplace';
import { api } from './lib/api-client';
import type { Profile, RawProfile } from './lib/types';

/** 前端 schema 校验：整批校验，任意失败则整体拒绝 */
function validateImportData(data: unknown): RawProfile[] {
    if (!Array.isArray(data)) throw new Error('文件内容必须是 JSON 数组');
    if (data.length === 0) throw new Error('JSON 数组不能为空');
    for (let i = 0; i < data.length; i++) {
        const p = data[i];
        if (typeof p !== 'object' || p === null)
            throw new Error(`第 ${i + 1} 项不是对象`);
        const { name, apiKey, baseUrl, model } = p as Record<string, unknown>;
        if (typeof name !== 'string' || !name.trim())
            throw new Error(`第 ${i + 1} 项缺少有效的 name 字段`);
        if (typeof apiKey !== 'string' || !apiKey.trim())
            throw new Error(`第 ${i + 1} 项缺少有效的 apiKey 字段`);
        if (typeof baseUrl !== 'string' || !baseUrl.trim())
            throw new Error(`第 ${i + 1} 项缺少有效的 baseUrl 字段`);
        if (typeof model !== 'string' || !model.trim())
            throw new Error(`第 ${i + 1} 项缺少有效的 model 字段`);
        try {
            new URL(baseUrl as string);
        } catch {
            throw new Error(
                `第 ${i + 1} 项的 baseUrl "${baseUrl}" 不是合法 URL`,
            );
        }
    }
    return data as RawProfile[];
}

interface DuplicateEntry {
    name: string;
    existingId: string;
}

interface ConfirmState {
    duplicates: DuplicateEntry[];
    toImport: RawProfile[];
}

function App(): JSX.Element {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
        null,
    );
    const [showForm, setShowForm] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [infoModal, setInfoModal] = useState<'import' | 'export' | null>(
        null,
    );
    const [activeTab, setActiveTab] = useState<'config' | 'marketplace'>('config');

    // ─── 主题切换（三态：dark / light / system）────────────────────────────────
    const getInitialTheme = (): 'dark' | 'light' | 'system' => {
        const saved = localStorage.getItem('cc-theme');
        if (saved === 'dark' || saved === 'light' || saved === 'system')
            return saved;
        return 'system';
    };
    const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(
        getInitialTheme,
    );

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark', 'light');
        if (theme !== 'system') root.classList.add(theme);
        localStorage.setItem('cc-theme', theme);
    }, [theme]);

    const cycleTheme = useCallback(() => {
        setTheme((t) => {
            if (t === 'light') return 'dark';
            if (t === 'dark') return 'system';
            return 'light';
        });
    }, []);

    const themeIcon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻';
    const themeLabel =
        theme === 'dark'
            ? '暗色模式（点击切换跟随系统）'
            : theme === 'light'
              ? '亮色模式（点击切换暗色）'
              : '跟随系统（点击切换亮色）';

    const addToast = useCallback(
        (type: 'success' | 'error', message: string) => {
            const id = crypto.randomUUID();
            setToasts((prev) => [...prev, { id, type, message }]);
        },
        [],
    );

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const loadProfiles = useCallback(
        async (syncSelection = false) => {
            try {
                const store = await api.getStore();
                setProfiles(store.profiles);
                setActiveProfileId(store.activeProfileId);
                // 初始加载时（syncSelection=true），将选中项同步为激活档案
                if (syncSelection && store.activeProfileId) {
                    setSelectedProfileId(store.activeProfileId);
                }
            } catch (e) {
                addToast('error', `加载档案失败：${(e as Error).message}`);
            }
        },
        [addToast],
    );

    useEffect(() => {
        void loadProfiles(true);
    }, [loadProfiles]);

    // ─── 激活档案 ─────────────────────────────────────────────────────────────────
    const handleActivate = useCallback(
        async (id: string) => {
            try {
                const activated = await api.activateProfile(id);
                setActiveProfileId(activated.id);
                addToast('success', `已激活档案「${activated.name}」`);
            } catch (e) {
                addToast('error', `激活失败：${(e as Error).message}`);
            }
        },
        [addToast],
    );

    // ─── 删除档案 ─────────────────────────────────────────────────────────────────
    const handleDelete = useCallback(
        async (id: string) => {
            try {
                await api.deleteProfile(id);
                // 若删除当前查看项，切换到列表第一项（按 createdAt 排序）
                if (selectedProfileId === id) {
                    const remaining = profiles
                        .filter((p) => p.id !== id)
                        .sort(
                            (a, b) =>
                                new Date(a.createdAt).getTime() -
                                new Date(b.createdAt).getTime(),
                        );
                    setSelectedProfileId(
                        remaining.length > 0 ? remaining[0].id : null,
                    );
                }
                if (activeProfileId === id) {
                    setActiveProfileId(null);
                }
                await loadProfiles();
                addToast('success', '档案已删除');
            } catch (e) {
                addToast('error', `删除失败：${(e as Error).message}`);
            }
        },
        [profiles, selectedProfileId, activeProfileId, addToast, loadProfiles],
    );

    // ─── 拖拽排序 ─────────────────────────────────────────────────────────────────
    const handleReorder = useCallback(
        async (orderedIds: string[]) => {
            // 乐观更新：立即按新顺序更新本地 profiles 的 order 字段
            setProfiles((prev) =>
                prev.map((p) => {
                    const idx = orderedIds.indexOf(p.id);
                    return idx !== -1 ? { ...p, order: idx } : p;
                }),
            );
            try {
                await api.reorderProfiles(orderedIds);
            } catch (e) {
                addToast('error', `排序保存失败：${(e as Error).message}`);
                await loadProfiles();
            }
        },
        [addToast, loadProfiles],
    );

    // ─── 新建档案 ─────────────────────────────────────────────────────────────────
    const handleNew = useCallback(() => {
        setEditingProfile(null);
        setShowForm(true);
    }, []);

    // ─── 编辑档案 ─────────────────────────────────────────────────────────────────
    const handleEdit = useCallback(
        (id: string) => {
            const profile = profiles.find((p) => p.id === id) ?? null;
            setEditingProfile(profile);
            setShowForm(true);
        },
        [profiles],
    );

    // ─── 表单提交（新建 / 编辑） ────────────────────────────────────────────────────
    const handleFormSubmit = useCallback(
        async (data: RawProfile) => {
            try {
                if (editingProfile) {
                    await api.updateProfile(editingProfile.id, data);
                    addToast('success', '档案已更新');
                } else {
                    const created = await api.createProfile(data);
                    setSelectedProfileId(created.id);
                    addToast('success', '档案已创建');
                }
                setShowForm(false);
                setEditingProfile(null);
                await loadProfiles();
            } catch (e) {
                addToast('error', `保存失败：${(e as Error).message}`);
                throw e;
            }
        },
        [editingProfile, addToast, loadProfiles],
    );

    const handleFormCancel = useCallback(() => {
        setShowForm(false);
        setEditingProfile(null);
    }, []);

    // ─── 导出 ────────────────────────────────────────────────────────────────────
    const handleExport = useCallback(async () => {
        try {
            const rawProfiles = await api.exportProfiles();
            const json = JSON.stringify(rawProfiles, null, 2);
            const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            const filename = `cc-profiles-${date}.json`;
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            addToast('success', `已导出 ${rawProfiles.length} 个档案`);
        } catch (e) {
            addToast('error', `导出失败：${(e as Error).message}`);
        }
    }, [addToast]);

    // ─── 导入：触发文件选择 ──────────────────────────────────────────────────────
    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // ─── 导入：执行（overwrite=true 时覆盖同名，false 时跳过同名） ────────────────
    const doImport = useCallback(
        async (
            toImport: RawProfile[],
            currentProfiles: Profile[],
            overwrite: boolean,
        ) => {
            let imported = 0;
            let skipped = 0;

            for (const raw of toImport) {
                const existing = currentProfiles.find(
                    (p) => p.name === raw.name,
                );
                if (existing) {
                    if (overwrite) {
                        await api.updateProfile(existing.id, raw);
                        imported++;
                    } else {
                        skipped++;
                    }
                } else {
                    await api.createProfile(raw);
                    imported++;
                }
            }

            await loadProfiles();

            const msg =
                skipped > 0
                    ? `已导入 ${imported} 个档案，跳过 ${skipped} 个同名档案`
                    : `已导入 ${imported} 个档案`;
            addToast('success', msg);
        },
        [addToast, loadProfiles],
    );

    // ─── 导入：文件选择后处理 ────────────────────────────────────────────────────
    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.target.value = '';

            try {
                const text = await file.text();

                let parsed: unknown;
                try {
                    parsed = JSON.parse(text);
                } catch {
                    addToast('error', '文件不是合法的 JSON 格式');
                    return;
                }

                let toImport: RawProfile[];
                try {
                    toImport = validateImportData(parsed);
                } catch (err) {
                    addToast('error', `校验失败：${(err as Error).message}`);
                    return;
                }

                const duplicates: DuplicateEntry[] = toImport.flatMap((raw) => {
                    const existing = profiles.find((p) => p.name === raw.name);
                    return existing
                        ? [{ name: raw.name, existingId: existing.id }]
                        : [];
                });

                if (duplicates.length > 0) {
                    setConfirmState({ duplicates, toImport });
                } else {
                    await doImport(toImport, profiles, false);
                }
            } catch (e) {
                addToast('error', `读取文件失败：${(e as Error).message}`);
            }
        },
        [profiles, addToast, doImport],
    );

    // ─── 确认对话框：覆盖 ────────────────────────────────────────────────────────
    const handleConfirmOverwrite = useCallback(async () => {
        if (!confirmState) return;
        const { toImport } = confirmState;
        const snapshot = profiles;
        setConfirmState(null);
        await doImport(toImport, snapshot, true);
    }, [confirmState, profiles, doImport]);

    const handleCancelOverwrite = useCallback(() => {
        setConfirmState(null);
    }, []);

    // ─── 派生状态 ────────────────────────────────────────────────────────────────
    const activeProfile =
        profiles.find((p) => p.id === activeProfileId) ?? null;
    const selectedProfile =
        profiles.find((p) => p.id === selectedProfileId) ?? null;

    return (
        <div className="flex flex-col h-screen bg-theme-bg text-theme-text">
            {/* ── Titlebar ─────────────────────────────────────────────────────────── */}
            <header className="flex items-center justify-between px-4 py-2.5 border-b border-theme-border bg-theme-sidebar shrink-0">
                <div className="flex items-center gap-2">
                    <h1 className="text-sm font-semibold text-theme-text">
                        CC Config Manager
                    </h1>
                    <button
                        onClick={cycleTheme}
                        aria-label={themeLabel}
                        title={themeLabel}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg transition-colors text-base"
                    >
                        {themeIcon}
                    </button>
                </div>
                {activeProfile ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-theme-active-bg text-theme-active-text">
                        ● {activeProfile.name} 已激活
                    </span>
                ) : (
                    <span className="text-xs text-theme-text-muted">
                        未配置
                    </span>
                )}
            </header>

            {/* ── TabBar ────────────────────────────────────────────────────────────── */}
            <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* ── 内容区 ────────────────────────────────────────────────────────────── */}
            {activeTab === 'config' ? (
                <>
                    {/* ── 主体：Sidebar + DetailPanel ─────────────────────────────────── */}
                    <div className="flex flex-1 overflow-hidden">
                        <div className="w-56 shrink-0 border-r border-theme-border flex flex-col">
                            <Sidebar
                                profiles={profiles}
                                activeProfileId={activeProfileId}
                                selectedProfileId={selectedProfileId}
                                onSelect={setSelectedProfileId}
                                onNew={handleNew}
                                onReorder={(ids) => void handleReorder(ids)}
                            />
                        </div>

                        <main className="flex-1 overflow-hidden">
                            {selectedProfile ? (
                                <DetailPanel
                                    profile={selectedProfile}
                                    isActive={
                                        selectedProfile.id === activeProfileId
                                    }
                                    onActivate={(id) =>
                                        void handleActivate(id)
                                    }
                                    onEdit={handleEdit}
                                    onDelete={(id) => void handleDelete(id)}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <p className="text-sm text-theme-text-muted">
                                        {profiles.length > 0
                                            ? '选择左侧档案以查看详情'
                                            : '暂无档案，点击左侧「＋ 新建档案」开始'}
                                    </p>
                                </div>
                            )}
                        </main>
                    </div>

                    {/* ── Toolbar ────────────────────────────────────────────────────── */}
                    <footer className="flex items-center justify-between px-4 py-2 border-t border-theme-border bg-theme-sidebar shrink-0">
                        <span className="text-xs text-theme-text-muted">
                            配置写入 ~/.claude/settings.json
                        </span>
                        <div className="flex gap-1">
                            <div className="flex items-center gap-0.5">
                                <button
                                    className="px-2.5 py-1 text-xs text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg rounded-md transition-colors"
                                    onClick={handleImportClick}
                                >
                                    ↑ 导入
                                </button>
                                <button
                                    className="w-4 h-4 flex items-center justify-center text-[10px] text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg rounded-full transition-colors"
                                    onClick={() => setInfoModal('import')}
                                    aria-label="导入说明"
                                >
                                    ?
                                </button>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <button
                                    className="px-2.5 py-1 text-xs text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg rounded-md transition-colors"
                                    onClick={() => void handleExport()}
                                >
                                    ↓ 导出
                                </button>
                                <button
                                    className="w-4 h-4 flex items-center justify-center text-[10px] text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg rounded-full transition-colors"
                                    onClick={() => setInfoModal('export')}
                                    aria-label="导出说明"
                                >
                                    ?
                                </button>
                            </div>
                        </div>
                    </footer>
                </>
            ) : (
                <div className="flex-1 overflow-hidden">
                    <Marketplace addToast={addToast} />
                </div>
            )}

            {/* ── 隐藏文件选择 ─────────────────────────────────────────────────────── */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => void handleFileChange(e)}
            />

            {/* ── ProfileForm 弹窗 ─────────────────────────────────────────────────── */}
            {showForm && (
                <ProfileForm
                    initialValues={
                        editingProfile
                            ? {
                                  name: editingProfile.name,
                                  apiKey: editingProfile.apiKey,
                                  baseUrl: editingProfile.baseUrl,
                                  model: editingProfile.model,
                              }
                            : undefined
                    }
                    onSubmit={handleFormSubmit}
                    onCancel={handleFormCancel}
                />
            )}

            {/* ── Toast 通知 ───────────────────────────────────────────────────────── */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* ── 同名档案确认对话框 ────────────────────────────────────────────────── */}
            {confirmState && (
                <ConfirmDialog
                    title="发现同名档案"
                    message={
                        <div>
                            <p className="mb-2">
                                以下档案与现有档案重名，是否覆盖？
                            </p>
                            <ul className="list-disc list-inside space-y-0.5">
                                {confirmState.duplicates.map((d) => (
                                    <li
                                        key={d.name}
                                        className="font-medium text-theme-text"
                                    >
                                        {d.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    }
                    confirmLabel="覆盖"
                    cancelLabel="取消导入"
                    onConfirm={() => void handleConfirmOverwrite()}
                    onCancel={handleCancelOverwrite}
                />
            )}

            {/* ── 导入/导出说明弹框 ─────────────────────────────────────────────────── */}
            {infoModal === 'import' && (
                <InfoModal title="导入档案" onClose={() => setInfoModal(null)}>
                    <p>从 JSON 文件批量导入档案，格式示例：</p>
                    <pre className="bg-black/20 rounded px-2 py-1.5 text-[10px] leading-relaxed font-mono whitespace-pre-wrap text-theme-text">
                        {`[
  {
    "name": "My Profile",
    "apiKey": "sk-ant-...",
    "baseUrl": "https://api.anthropic.com",
    "model": "claude-sonnet-4-6"
  }
]`}
                    </pre>
                    <p>合并到现有档案，同名档案可选择是否覆盖。</p>
                </InfoModal>
            )}
            {infoModal === 'export' && (
                <InfoModal title="导出档案" onClose={() => setInfoModal(null)}>
                    <p>将所有档案导出为 JSON 文件，可用于备份或跨设备同步。</p>
                    <p className="text-yellow-400 font-medium">
                        ⚠️ 文件含明文 API
                        Key，请妥善保管，勿分享或上传至公开位置。
                    </p>
                </InfoModal>
            )}
        </div>
    );
}

export default App;
