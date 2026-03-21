import { useState, useRef, useCallback } from 'react';
import type { Profile } from '../lib/types';

// Provider 彩色头像配置
const PROVIDER_AVATAR: Record<string, { initial: string; color: string }> = {
    anthropic: { initial: 'A', color: '#D97706' },
    openai:    { initial: 'O', color: '#111827' },
    deepseek:  { initial: 'D', color: '#2563EB' },
    google:    { initial: 'G', color: '#DC2626' },
    qianwen:   { initial: 'Q', color: '#7C3AED' },
    zhipu:     { initial: 'Z', color: '#059669' },
    moonshot:  { initial: 'M', color: '#4F46E5' },
    other:     { initial: '?', color: '#6B7280' },
};

function getAvatar(provider?: string, name?: string) {
    const key = provider ?? 'other';
    const cfg = PROVIDER_AVATAR[key] ?? PROVIDER_AVATAR.other;
    // 若 provider 未知，用档案名首字母
    const initial = cfg.initial === '?' && name ? name[0].toUpperCase() : cfg.initial;
    return { initial, color: cfg.color };
}

interface SidebarProps {
    profiles: Profile[];
    activeProfileId: string | null;
    selectedProfileId: string | null;
    onSelect: (id: string) => void;
    onNew: () => void;
    onReorder: (orderedIds: string[]) => void;
}

export default function Sidebar({
    profiles, activeProfileId, selectedProfileId, onSelect, onNew, onReorder,
}: SidebarProps): JSX.Element {
    const sorted = [...profiles].sort((a, b) => {
        const ao = a.order ?? Infinity;
        const bo = b.order ?? Infinity;
        if (ao !== bo) return ao - bo;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragIdRef = useRef<string | null>(null);

    const handleDragStart = useCallback((e: React.DragEvent<HTMLLIElement>, id: string) => {
        dragIdRef.current = id;
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLLIElement>, id: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragIdRef.current !== id) setDragOverId(id);
    }, []);

    const handleDragLeave = useCallback(() => { setDragOverId(null); }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLLIElement>, targetId: string) => {
        e.preventDefault();
        setDragOverId(null);
        const sourceId = dragIdRef.current;
        if (!sourceId || sourceId === targetId) return;
        const ids = sorted.map((p) => p.id);
        const fromIdx = ids.indexOf(sourceId);
        const toIdx = ids.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        const newIds = [...ids];
        newIds.splice(fromIdx, 1);
        newIds.splice(toIdx, 0, sourceId);
        onReorder(newIds);
    }, [sorted, onReorder]);

    const handleDragEnd = useCallback(() => {
        dragIdRef.current = null;
        setDragOverId(null);
    }, []);

    return (
        <aside className="flex flex-col h-full">
            {/* Section header */}
            <div className="px-[14px] pt-[10px] pb-[5px] text-[10px] font-semibold text-theme-text-faint uppercase tracking-[0.6px]">
                档案
            </div>

            {/* Profile list */}
            <ul className="flex-1 overflow-y-auto overflow-x-hidden px-[6px] py-[2px]"
                style={{ scrollbarWidth: 'none' }}>
                {sorted.map((profile) => {
                    const isActive   = profile.id === activeProfileId;
                    const isSelected = profile.id === selectedProfileId;
                    const isDragOver = profile.id === dragOverId;
                    const { initial, color } = getAvatar(profile.provider, profile.name);

                    return (
                        <li
                            key={profile.id}
                            className="min-w-0 mb-[1px]"
                            draggable
                            onDragStart={(e) => handleDragStart(e, profile.id)}
                            onDragOver={(e) => handleDragOver(e, profile.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, profile.id)}
                            onDragEnd={handleDragEnd}
                        >
                            <button
                                onClick={() => onSelect(profile.id)}
                                className={[
                                    'w-full min-w-0 text-left flex items-center gap-[8px]',
                                    'px-[8px] py-[7px] rounded-[9px] transition-colors duration-100',
                                    'border relative',
                                    isDragOver
                                        ? 'opacity-50'
                                        : isSelected
                                            ? 'border-theme-selected'
                                            : 'border-transparent hover:bg-theme-hover',
                                ].join(' ')}
                                style={isSelected ? {
                                    background: 'var(--color-selected)',
                                    borderColor: 'var(--color-selected-border)',
                                } : {}}
                            >
                                {/* Active left bar */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-r-[2px]"
                                        style={{ background: 'var(--color-accent)' }} />
                                )}

                                {/* Drag handle */}
                                <span className="shrink-0 text-theme-text-faint opacity-40 cursor-grab active:cursor-grabbing select-none text-[11px] leading-none">
                                    ⠿
                                </span>

                                {/* Provider avatar */}
                                <div className="w-[26px] h-[26px] rounded-[7px] shrink-0 flex items-center justify-center text-[11px] font-bold text-white leading-none"
                                    style={{ background: color, boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }}>
                                    {initial}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                                        <span className="text-[12.5px] font-medium text-theme-text truncate tracking-[-0.2px]">
                                            {profile.name}
                                        </span>
                                        {isActive && (
                                            <span className="shrink-0 text-[9.5px] font-semibold px-[6px] py-[1px] rounded-full"
                                                style={{ background: 'var(--color-active-btn-bg)', color: 'var(--color-active-btn-text)' }}>
                                                激活
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10.5px] text-theme-text-faint truncate block mt-[1px] font-mono">
                                        {profile.baseUrl.replace(/^https?:\/\//, '')}
                                    </span>
                                </div>
                            </button>
                        </li>
                    );
                })}
            </ul>

            {/* New profile button */}
            <div className="p-[8px] border-t border-theme-separator">
                <button
                    onClick={onNew}
                    className="w-full py-[7px] rounded-[9px] text-[12.5px] font-medium text-theme-text-muted hover:text-theme-accent transition-colors duration-150 flex items-center justify-center gap-[5px]"
                    style={{ border: '1px dashed var(--color-separator)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-separator)')}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    新建档案
                </button>
            </div>
        </aside>
    );
}
