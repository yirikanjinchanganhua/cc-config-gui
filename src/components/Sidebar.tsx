import type { Profile } from '../lib/types'
import Tooltip from './Tooltip'

interface SidebarProps {
  profiles: Profile[]
  activeProfileId: string | null
  selectedProfileId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onImport: () => void
  onExport: () => void
}

const importTooltipContent = (
  <div className="space-y-2">
    <p className="font-semibold">格式示例（JSON 数组）：</p>
    <pre className="bg-black/20 rounded px-2 py-1.5 text-[10px] leading-relaxed font-mono whitespace-pre-wrap">
{`[
  {
    "name": "My Profile",
    "apiKey": "sk-ant-...",
    "baseUrl": "https://api.anthropic.com",
    "model": "claude-opus-4-5"
  }
]`}
    </pre>
    <p className="text-theme-tooltip-text/80">合并到现有档案，同名档案可选择是否覆盖。</p>
  </div>
)

const exportTooltipContent = (
  <div className="space-y-1.5">
    <p>导出为 JSON 文件，可备份或跨设备同步。</p>
    <p className="text-yellow-300 font-medium">⚠️ 文件含明文 API Key，请妥善保管，勿分享或上传至公开位置。</p>
  </div>
)

export default function Sidebar({
  profiles,
  activeProfileId,
  selectedProfileId,
  onSelect,
  onNew,
  onImport,
  onExport,
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

      <div className="p-3 border-t border-theme-border space-y-2">
        {/* 导入 / 导出工具栏 */}
        <div className="flex gap-2">
          <Tooltip content={importTooltipContent} width="w-80">
            <button
              className="flex-1 py-1.5 text-xs text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg rounded-lg transition-colors"
              onClick={onImport}
            >
              ↑ 导入
            </button>
          </Tooltip>
          <Tooltip content={exportTooltipContent} width="w-72">
            <button
              className="flex-1 py-1.5 text-xs text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg rounded-lg transition-colors"
              onClick={onExport}
            >
              ↓ 导出
            </button>
          </Tooltip>
        </div>

        {/* 新建档案 */}
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
