import { useState, useEffect, useRef, useCallback } from 'react';
import './assets/main.css';
import Sidebar from './components/Sidebar';
import DetailPanel from './components/DetailPanel';
import ProfileForm from './components/ProfileForm';
import InfoModal from './components/InfoModal';
import { ToastContainer, type ToastMessage } from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import Marketplace from './components/marketplace/Marketplace';
import { api } from './lib/api-client';
import type { Profile, RawProfile } from './lib/types';

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
        try { new URL(baseUrl as string); } catch {
            throw new Error(`第 ${i + 1} 项的 baseUrl "${baseUrl}" 不是合法 URL`);
        }
    }
    return data as RawProfile[];
}

interface DuplicateEntry { name: string; existingId: string; }
interface ConfirmState { duplicates: DuplicateEntry[]; toImport: RawProfile[]; }

function App(): JSX.Element {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [infoModal, setInfoModal] = useState<'import' | 'export' | null>(null);
    const [activeTab, setActiveTab] = useState<'config' | 'marketplace'>('config');
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // ─── Theme (三态) ─────────────────────────────────────────────────────────
    const getInitialTheme = (): 'dark' | 'light' | 'system' => {
        const saved = localStorage.getItem('cc-theme');
        if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
        return 'system';
    };
    const [theme, setThemeState] = useState<'dark' | 'light' | 'system'>(getInitialTheme);

    const setTheme = useCallback((t: 'dark' | 'light' | 'system') => {
        setThemeState(t);
        localStorage.setItem('cc-theme', t);
        const root = document.documentElement;
        root.classList.remove('dark', 'light');
        if (t !== 'system') root.classList.add(t);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark', 'light');
        if (theme !== 'system') root.classList.add(theme);
    }, [theme]);

    // ─── ··· menu close-on-outside-click ──────────────────────────────────────
    useEffect(() => {
        if (!showMoreMenu) return;
        const handler = (e: MouseEvent) => {
            if (!moreMenuRef.current?.contains(e.target as Node)) {
                setShowMoreMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showMoreMenu]);

    const addToast = useCallback((type: 'success' | 'error', message: string) => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, type, message }]);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const loadProfiles = useCallback(async (syncSelection = false) => {
        try {
            const store = await api.getStore();
            setProfiles(store.profiles);
            setActiveProfileId(store.activeProfileId);
            if (syncSelection && store.activeProfileId) {
                setSelectedProfileId(store.activeProfileId);
            }
        } catch (e) {
            addToast('error', `加载档案失败：${(e as Error).message}`);
        }
    }, [addToast]);

    useEffect(() => { void loadProfiles(true); }, [loadProfiles]);

    const handleActivate = useCallback(async (id: string) => {
        try {
            const activated = await api.activateProfile(id);
            setActiveProfileId(activated.id);
            addToast('success', `已激活档案「${activated.name}」`);
        } catch (e) {
            addToast('error', `激活失败：${(e as Error).message}`);
        }
    }, [addToast]);

    const handleDelete = useCallback(async (id: string) => {
        try {
            await api.deleteProfile(id);
            if (selectedProfileId === id) {
                const remaining = profiles.filter((p) => p.id !== id)
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                setSelectedProfileId(remaining.length > 0 ? remaining[0].id : null);
            }
            if (activeProfileId === id) setActiveProfileId(null);
            await loadProfiles();
            addToast('success', '档案已删除');
        } catch (e) {
            addToast('error', `删除失败：${(e as Error).message}`);
        }
    }, [profiles, selectedProfileId, activeProfileId, addToast, loadProfiles]);

    const handleReorder = useCallback(async (orderedIds: string[]) => {
        setProfiles((prev) => prev.map((p) => {
            const idx = orderedIds.indexOf(p.id);
            return idx !== -1 ? { ...p, order: idx } : p;
        }));
        try {
            await api.reorderProfiles(orderedIds);
        } catch (e) {
            addToast('error', `排序保存失败：${(e as Error).message}`);
            await loadProfiles();
        }
    }, [addToast, loadProfiles]);

    const handleNew = useCallback(() => { setEditingProfile(null); setShowForm(true); }, []);

    const handleEdit = useCallback((id: string) => {
        const profile = profiles.find((p) => p.id === id) ?? null;
        setEditingProfile(profile);
        setShowForm(true);
    }, [profiles]);

    const handleFormSubmit = useCallback(async (data: RawProfile) => {
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
    }, [editingProfile, addToast, loadProfiles]);

    const handleFormCancel = useCallback(() => {
        setShowForm(false);
        setEditingProfile(null);
    }, []);

    const handleExport = useCallback(async () => {
        try {
            const rawProfiles = await api.exportProfiles();
            const json = JSON.stringify(rawProfiles, null, 2);
            const date = new Date().toISOString().slice(0, 10);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `cc-profiles-${date}.json`; a.click();
            URL.revokeObjectURL(url);
            addToast('success', `已导出 ${rawProfiles.length} 个档案`);
        } catch (e) {
            addToast('error', `导出失败：${(e as Error).message}`);
        }
    }, [addToast]);

    const handleImportClick = useCallback(() => { fileInputRef.current?.click(); }, []);

    const doImport = useCallback(async (toImport: RawProfile[], currentProfiles: Profile[], overwrite: boolean) => {
        let imported = 0; let skipped = 0;
        for (const raw of toImport) {
            const existing = currentProfiles.find((p) => p.name === raw.name);
            if (existing) {
                if (overwrite) { await api.updateProfile(existing.id, raw); imported++; }
                else { skipped++; }
            } else { await api.createProfile(raw); imported++; }
        }
        await loadProfiles();
        addToast('success', skipped > 0 ? `已导入 ${imported} 个档案，跳过 ${skipped} 个同名档案` : `已导入 ${imported} 个档案`);
    }, [addToast, loadProfiles]);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        try {
            const text = await file.text();
            let parsed: unknown;
            try { parsed = JSON.parse(text); } catch { addToast('error', '文件不是合法的 JSON 格式'); return; }
            let toImport: RawProfile[];
            try { toImport = validateImportData(parsed); } catch (err) { addToast('error', `校验失败：${(err as Error).message}`); return; }
            const duplicates: DuplicateEntry[] = toImport.flatMap((raw) => {
                const existing = profiles.find((p) => p.name === raw.name);
                return existing ? [{ name: raw.name, existingId: existing.id }] : [];
            });
            if (duplicates.length > 0) { setConfirmState({ duplicates, toImport }); }
            else { await doImport(toImport, profiles, false); }
        } catch (e) {
            addToast('error', `读取文件失败：${(e as Error).message}`);
        }
    }, [profiles, addToast, doImport]);

    const handleConfirmOverwrite = useCallback(async () => {
        if (!confirmState) return;
        const { toImport } = confirmState;
        const snapshot = profiles;
        setConfirmState(null);
        await doImport(toImport, snapshot, true);
    }, [confirmState, profiles, doImport]);

    const handleCancelOverwrite = useCallback(() => { setConfirmState(null); }, []);

    const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;
    const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;

    // ─── Theme switcher segment button ────────────────────────────────────────
    const ThemeSegBtn = ({ mode, icon, label }: { mode: 'light' | 'dark' | 'system'; icon: string; label: string }) => (
        <button
            onClick={() => setTheme(mode)}
            title={label}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className={[
                'w-7 h-[22px] rounded-[6px] text-[13px] flex items-center justify-center transition-all duration-150',
                theme === mode
                    ? 'bg-white/80 shadow-sm text-theme-text dark:bg-white/15'
                    : 'text-theme-text-faint hover:text-theme-text-muted',
            ].join(' ')}
        >
            {icon}
        </button>
    );

    return (
        <div className="flex flex-col h-screen" style={{ background: 'var(--color-bg)' }}>

            {/* ── Header (合并标题 + Tab + 主题切换 + 激活徽章 + ···) ─────────────── */}
            <header
                className="flex items-center h-[44px] px-3 shrink-0 border-b border-theme-separator"
                style={{
                    background: 'var(--color-header)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    WebkitAppRegion: 'drag',
                    position: 'relative',
                    zIndex: 10,
                } as React.CSSProperties}
            >
                {/* 流量灯占位 (hiddenInset 下自动插入，留出 72px) */}
                <div className="w-[72px] shrink-0" />

                {/* 图标 + 标题 */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, #5E5CE6 100%)', boxShadow: '0 1px 3px rgba(0,0,0,0.20)' }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="text-[12.5px] font-semibold text-theme-text tracking-[-0.2px]">CC Config</span>
                </div>

                {/* 分割线 */}
                <div className="w-px h-[14px] bg-theme-separator mx-3 shrink-0" />

                {/* Tabs */}
                <div className="flex gap-[2px]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    {([
                        { key: 'config', icon: '⚙', label: '配置' },
                        { key: 'marketplace', icon: '✦', label: 'Skill' },
                    ] as const).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={[
                                'flex items-center gap-[5px] px-[9px] py-[3px] rounded-[7px] text-[11.5px] font-medium transition-colors duration-150',
                                activeTab === tab.key
                                    ? 'bg-theme-accent-light text-theme-accent'
                                    : 'text-theme-text-faint hover:text-theme-text-muted hover:bg-theme-hover',
                            ].join(' ')}
                        >
                            <span className="text-[11px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1" />

                {/* B2 主题分段控件 */}
                <div className="flex items-center p-[2px] rounded-[8px] gap-[1px] mr-2"
                    style={{ background: 'var(--color-hover)' }}>
                    <ThemeSegBtn mode="light" icon="☀️" label="亮色模式" />
                    <ThemeSegBtn mode="dark"  icon="🌙" label="暗色模式" />
                    <ThemeSegBtn mode="system" icon="💻" label="跟随系统" />
                </div>

                {/* 激活徽章 */}
                {activeProfile ? (
                    <div className="flex items-center gap-[5px] px-[8px] py-[3px] rounded-full mr-2 text-[10.5px] font-medium shrink-0"
                        style={{ background: 'var(--color-active-btn-bg)', color: 'var(--color-active-btn-text)' }}>
                        <div className="w-[6px] h-[6px] rounded-full status-pulse"
                            style={{ background: 'var(--color-active-dot)' }} />
                        {activeProfile.name}
                    </div>
                ) : (
                    <span className="text-[11px] text-theme-text-faint mr-2 shrink-0">未配置</span>
                )}

                {/* ··· 更多菜单 */}
                <div className="relative shrink-0" ref={moreMenuRef} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    <button
                        onClick={() => setShowMoreMenu((v) => !v)}
                        className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center text-theme-text-faint hover:text-theme-text hover:bg-theme-hover transition-colors text-[16px] leading-none pb-[2px]"
                    >
                        ···
                    </button>

                    {showMoreMenu && (
                        <div
                            className="absolute right-0 top-[calc(100%+6px)] z-[200] w-44 rounded-[11px] py-[3px] overflow-hidden"
                            style={{
                                background: 'var(--color-menu-bg)',
                                border: '1px solid var(--color-menu-border)',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.25), 0 0 0 0.5px var(--color-menu-border)',
                            }}
                        >
                            {[
                                { label: '↑ 导入档案', action: handleImportClick },
                                { label: '↓ 导出档案', action: () => void handleExport() },
                            ].map(({ label, action }) => (
                                <button key={label}
                                    onClick={() => { setShowMoreMenu(false); action(); }}
                                    className="w-full text-left px-[13px] py-[8px] text-[12.5px] transition-colors duration-100"
                                    style={{ color: 'var(--color-menu-text)' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-menu-hover)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    {label}
                                </button>
                            ))}
                            <div className="h-px mx-2 my-[3px]" style={{ background: 'var(--color-menu-divider)' }} />
                            {[
                                { label: '导入说明', action: () => setInfoModal('import') },
                                { label: '导出说明', action: () => setInfoModal('export') },
                            ].map(({ label, action }) => (
                                <button key={label}
                                    onClick={() => { setShowMoreMenu(false); action(); }}
                                    className="w-full text-left px-[13px] py-[8px] text-[12.5px] transition-colors duration-100"
                                    style={{ color: 'var(--color-menu-text-dim)' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--color-menu-hover)';
                                        e.currentTarget.style.color = 'var(--color-menu-text)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--color-menu-text-dim)';
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* ── 内容区 ──────────────────────────────────────────────────────────── */}
            {activeTab === 'config' ? (
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-[210px] shrink-0 border-r border-theme-separator flex flex-col"
                        style={{
                            background: 'var(--color-sidebar)',
                            backdropFilter: 'blur(24px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                        }}>
                        <Sidebar
                            profiles={profiles}
                            activeProfileId={activeProfileId}
                            selectedProfileId={selectedProfileId}
                            onSelect={setSelectedProfileId}
                            onNew={handleNew}
                            onReorder={(ids) => void handleReorder(ids)}
                        />
                    </div>

                    <main className="flex-1 overflow-hidden" style={{
                        background: 'var(--color-content-bg)',
                        backdropFilter: 'blur(24px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    } as React.CSSProperties}>
                        {selectedProfile ? (
                            <DetailPanel
                                profile={selectedProfile}
                                isActive={selectedProfile.id === activeProfileId}
                                onActivate={(id) => void handleActivate(id)}
                                onEdit={handleEdit}
                                onDelete={(id) => void handleDelete(id)}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-[13px] text-theme-text-faint">
                                    {profiles.length > 0 ? '选择左侧档案以查看详情' : '暂无档案，点击左侧「＋ 新建」开始'}
                                </p>
                            </div>
                        )}
                    </main>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden" style={{
                    background: 'var(--color-content-bg)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                } as React.CSSProperties}>
                    <Marketplace addToast={addToast} />
                </div>
            )}

            {/* 隐藏文件选择 */}
            <input ref={fileInputRef} type="file" accept=".json" className="hidden"
                onChange={(e) => void handleFileChange(e)} />

            {/* ProfileForm */}
            {showForm && (
                <ProfileForm
                    initialValues={editingProfile ? {
                        name: editingProfile.name, apiKey: editingProfile.apiKey,
                        baseUrl: editingProfile.baseUrl, model: editingProfile.model,
                    } : undefined}
                    onSubmit={handleFormSubmit}
                    onCancel={handleFormCancel}
                />
            )}

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {confirmState && (
                <ConfirmDialog
                    title="发现同名档案"
                    message={
                        <div>
                            <p className="mb-2">以下档案与现有档案重名，是否覆盖？</p>
                            <ul className="list-disc list-inside space-y-0.5">
                                {confirmState.duplicates.map((d) => (
                                    <li key={d.name} className="font-medium text-theme-text">{d.name}</li>
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

            {infoModal === 'import' && (
                <InfoModal title="导入档案" onClose={() => setInfoModal(null)}>
                    <p>从 JSON 文件批量导入档案，格式示例：</p>
                    <pre className="rounded-[8px] px-3 py-2 text-[10.5px] leading-relaxed font-mono whitespace-pre-wrap text-theme-text"
                        style={{ background: 'var(--color-input-bg)' }}>
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
                    <p className="font-medium" style={{ color: 'var(--color-red)' }}>
                        ⚠️ 文件含明文 API Key，请妥善保管，勿分享或上传至公开位置。
                    </p>
                </InfoModal>
            )}
        </div>
    );
}

export default App;
