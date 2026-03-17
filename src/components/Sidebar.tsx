import type { Profile } from '../lib/types'

interface SidebarProps {
  profiles: Profile[]
  activeProfileId: string | null
  selectedProfileId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

export default function Sidebar({
  profiles,
  activeProfileId,
  selectedProfileId,
  onSelect,
  onNew,
}: SidebarProps): JSX.Element {
  const sorted = [...profiles].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  return (
    <aside className="flex flex-col h-full bg-theme-sidebar">
      <div className="px-3 py-3 text-xs font-semibold text-theme-text-muted uppercase tracking-wider">
        档案列表
      </div>

      <ul className="flex-1 overflow-y-auto">
        {sorted.map((profile) => {
          const isActive = profile.id === activeProfileId
          const isSelected = profile.id === selectedProfileId

          return (
            <li key={profile.id}>
              <button
                className={[
                  'w-full text-left px-3 py-2.5 flex flex-col gap-0.5',
                  'border-l-2 transition-colors',
                  isActive ? 'border-blue-500' : 'border-transparent',
                  isSelected
                    ? 'bg-theme-selected-bg'
                    : 'hover:bg-theme-selected-bg',
                ].join(' ')}
                onClick={() => onSelect(profile.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-theme-text truncate">
                    {profile.name}
                  </span>
                  {isActive && (
                    <span className="shrink-0 text-xs text-theme-active-text bg-theme-active-bg px-1.5 py-0.5 rounded-full">
                      ● 当前激活
                    </span>
                  )}
                </div>
                <span className="text-xs text-theme-text-muted truncate">
                  {profile.baseUrl}
                </span>
              </button>
            </li>
          )
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
  )
}
