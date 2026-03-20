import { useState, useRef, useCallback } from 'react';
import type { Profile } from '../lib/types';

interface SidebarProps {
    profiles: Profile[];
    activeProfileId: string | null;
    selectedProfileId: string | null;
    onSelect: (id: string) => void;
    onNew: () => void;
    onReorder: (orderedIds: string[]) => void;
}

export default function Sidebar({
    profiles,
    activeProfileId,
    selectedProfileId,
    onSelect,
    onNew,
    onReorder,
}: SidebarProps): JSX.Element {
    // 按 order 字段排序，order 未设置时按 createdAt 排序
    const sorted = [...profiles].sort((a, b) => {
        const ao = a.order ?? Infinity;
        const bo = b.order ?? Infinity;
        if (ao !== bo) return ao - bo;
        return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    });

    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragIdRef = useRef<string | null>(null);

    const handleDragStart = useCallback(
        (e: React.DragEvent<HTMLLIElement>, id: string) => {
            dragIdRef.current = id;
            e.dataTransfer.effectAllowed = 'move';
        },
        [],
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent<HTMLLIElement>, id: string) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (dragIdRef.current !== id) setDragOverId(id);
        },
        [],
    );

    const handleDragLeave = useCallback(() => {
        setDragOverId(null);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLLIElement>, targetId: string) => {
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
        },
        [sorted, onReorder],
    );

    const handleDragEnd = useCallback(() => {
        dragIdRef.current = null;
        setDragOverId(null);
    }, []);

    return (
        <aside className="flex flex-col h-full bg-theme-sidebar">
            <div className="px-3 py-3 text-xs font-semibold text-theme-text-muted uppercase tracking-wider">
                档案列表
            </div>

            <ul className="flex-1 overflow-y-auto overflow-x-hidden">
                {sorted.map((profile) => {
                    const isActive = profile.id === activeProfileId;
                    const isSelected = profile.id === selectedProfileId;
                    const isDragOver = profile.id === dragOverId;

                    return (
                        <li
                            key={profile.id}
                            className="min-w-0"
                            draggable
                            onDragStart={(e) => handleDragStart(e, profile.id)}
                            onDragOver={(e) => handleDragOver(e, profile.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, profile.id)}
                            onDragEnd={handleDragEnd}
                        >
                            <button
                                className={[
                                    'w-full min-w-0 text-left px-3 py-2.5 flex flex-col gap-0.5',
                                    'border-l-2 transition-colors',
                                    isActive
                                        ? 'border-blue-500'
                                        : 'border-transparent',
                                    isDragOver
                                        ? 'bg-theme-selected-bg opacity-50 border-t-2 border-t-blue-400'
                                        : isSelected
                                          ? 'bg-theme-selected-bg'
                                          : 'hover:bg-theme-selected-bg',
                                ].join(' ')}
                                onClick={() => onSelect(profile.id)}
                            >
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        {/* 拖拽把手 */}
                                        <span
                                            className="shrink-0 text-theme-text-muted opacity-30 cursor-grab active:cursor-grabbing select-none text-sm leading-none"
                                            title="拖拽排序"
                                        >
                                            ⠿
                                        </span>
                                        <span className="text-sm font-medium text-theme-text truncate min-w-0">
                                            {profile.name}
                                        </span>
                                    </div>
                                    {isActive && (
                                        <span className="shrink-0 text-xs text-theme-active-text bg-theme-active-bg px-1.5 py-0.5 rounded-full">
                                            ● 当前激活
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-theme-text-muted truncate w-full pl-4">
                                    {profile.baseUrl}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            <div className="p-3 border-t border-theme-border">
                <button
                    className="w-full py-2 text-sm text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg rounded-lg transition-colors"
                    onClick={onNew}
                >
                    ＋ 新建档案
                </button>
            </div>
        </aside>
    );
}
