import './assets/main.css'

function App(): JSX.Element {
  return (
    <div className="flex min-h-screen bg-theme-bg text-theme-text">
      {/* 侧边栏 */}
      <aside className="w-56 bg-theme-sidebar flex flex-col gap-1 p-3">
        <div className="px-3 py-2 text-xs font-semibold text-theme-text-muted uppercase tracking-wider mb-1">
          菜单
        </div>
        <button className="w-full text-left px-3 py-2 rounded-lg bg-theme-active-bg text-theme-active-text font-medium text-sm">
          配置
        </button>
        <button className="w-full text-left px-3 py-2 rounded-lg text-theme-text text-sm hover:bg-theme-active-bg/30">
          关于
        </button>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 flex flex-col items-center justify-center gap-2">
        <h1 className="text-3xl font-bold text-theme-text">CC Config GUI</h1>
        <p className="text-theme-text-muted">Electron + Vite + React + TypeScript</p>
      </main>
    </div>
  )
}

export default App

