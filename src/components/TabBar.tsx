/**
 * TabBar.tsx
 * 顶部 Tab 切换组件：配置管理 / Skill 市场
 */

interface TabBarProps {
    activeTab: 'config' | 'marketplace';
    onTabChange: (tab: 'config' | 'marketplace') => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps): JSX.Element {
    const tabs: { key: 'config' | 'marketplace'; label: string }[] = [
        { key: 'config', label: '⚙ 配置管理' },
        { key: 'marketplace', label: ' Skill 市场' },
    ];

    return (
        <div className="flex border-b border-theme-border bg-theme-sidebar shrink-0">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={`px-5 py-2 text-xs border-b-2 transition-colors ${
                        activeTab === tab.key
                            ? 'border-theme-active-text bg-theme-active-bg/20 text-theme-active-text font-medium'
                            : 'border-transparent text-theme-text-muted hover:text-theme-text'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
