import { useState, useEffect, useRef, useCallback } from 'react'
import './assets/main.css'
import Sidebar from './components/Sidebar'
import { ToastContainer, type ToastMessage } from './components/Toast'
import ConfirmDialog from './components/ConfirmDialog'
import { api } from './lib/api-client'
import type { Profile, RawProfile } from './lib/types'

/** 前端 schema 校验：整批校验，任意失败则整体拒绝 */
function validateImportData(data: unknown): RawProfile[] {
  if (!Array.isArray(data)) throw new Error('文件内容必须是 JSON 数组')
  if (data.length === 0) throw new Error('JSON 数组不能为空')
  for (let i = 0; i < data.length; i++) {
    const p = data[i]
    if (typeof p !== 'object' || p === null) throw new Error(`第 ${i + 1} 项不是对象`)
    const { name, apiKey, baseUrl, model } = p as Record<string, unknown>
    if (typeof name !== 'string' || !name.trim())
      throw new Error(`第 ${i + 1} 项缺少有效的 name 字段`)
    if (typeof apiKey !== 'string' || !apiKey.trim())
      throw new Error(`第 ${i + 1} 项缺少有效的 apiKey 字段`)
    if (typeof baseUrl !== 'string' || !baseUrl.trim())
      throw new Error(`第 ${i + 1} 项缺少有效的 baseUrl 字段`)
    if (typeof model !== 'string' || !model.trim())
      throw new Error(`第 ${i + 1} 项缺少有效的 model 字段`)
    try {
      new URL(baseUrl as string)
    } catch {
      throw new Error(`第 ${i + 1} 项的 baseUrl "${baseUrl}" 不是合法 URL`)
    }
  }
  return data as RawProfile[]
}

interface DuplicateEntry {
  name: string
  existingId: string
}

interface ConfirmState {
  duplicates: DuplicateEntry[]
  toImport: RawProfile[]
}

function App(): JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const loadProfiles = useCallback(async () => {
    try {
      const list = await api.listProfiles()
      setProfiles(list)
    } catch (e) {
      addToast('error', `加载档案失败：${(e as Error).message}`)
    }
  }, [addToast])

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  // ────────────────────────────────────────────────────────────
  // 导出
  // ────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    try {
      const rawProfiles = await api.exportProfiles()
      const json = JSON.stringify(rawProfiles, null, 2)
      const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const filename = `cc-profiles-${date}.json`
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      addToast('success', `已导出 ${rawProfiles.length} 个档案`)
    } catch (e) {
      addToast('error', `导出失败：${(e as Error).message}`)
    }
  }, [addToast])

  // ────────────────────────────────────────────────────────────
  // 导入：触发文件选择
  // ────────────────────────────────────────────────────────────
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // ────────────────────────────────────────────────────────────
  // 导入：执行（overwrite=true 时覆盖同名，false 时跳过同名）
  // ────────────────────────────────────────────────────────────
  const doImport = useCallback(
    async (toImport: RawProfile[], currentProfiles: Profile[], overwrite: boolean) => {
      let imported = 0
      let skipped = 0

      for (const raw of toImport) {
        const existing = currentProfiles.find((p) => p.name === raw.name)
        if (existing) {
          if (overwrite) {
            await api.updateProfile(existing.id, raw)
            imported++
          } else {
            skipped++
          }
        } else {
          await api.createProfile(raw)
          imported++
        }
      }

      await loadProfiles()

      const msg =
        skipped > 0
          ? `已导入 ${imported} 个档案，跳过 ${skipped} 个同名档案`
          : `已导入 ${imported} 个档案`
      addToast('success', msg)
    },
    [addToast, loadProfiles],
  )

  // ────────────────────────────────────────────────────────────
  // 导入：文件选择后处理
  // ────────────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      // 重置，允许再次选择同一文件
      e.target.value = ''

      try {
        const text = await file.text()

        let parsed: unknown
        try {
          parsed = JSON.parse(text)
        } catch {
          addToast('error', '文件不是合法的 JSON 格式')
          return
        }

        let toImport: RawProfile[]
        try {
          toImport = validateImportData(parsed)
        } catch (err) {
          addToast('error', `校验失败：${(err as Error).message}`)
          return
        }

        // 检测同名档案
        const duplicates: DuplicateEntry[] = toImport
          .flatMap((raw) => {
            const existing = profiles.find((p) => p.name === raw.name)
            return existing ? [{ name: raw.name, existingId: existing.id }] : []
          })

        if (duplicates.length > 0) {
          setConfirmState({ duplicates, toImport })
        } else {
          await doImport(toImport, profiles, false)
        }
      } catch (e) {
        addToast('error', `读取文件失败：${(e as Error).message}`)
      }
    },
    [profiles, addToast, doImport],
  )

  // ────────────────────────────────────────────────────────────
  // 确认对话框：覆盖
  // ────────────────────────────────────────────────────────────
  const handleConfirmOverwrite = useCallback(async () => {
    if (!confirmState) return
    const { toImport } = confirmState
    const snapshot = profiles
    setConfirmState(null)
    await doImport(toImport, snapshot, true)
  }, [confirmState, profiles, doImport])

  // ────────────────────────────────────────────────────────────
  // 确认对话框：取消（终止导入）
  // ────────────────────────────────────────────────────────────
  const handleCancelOverwrite = useCallback(() => {
    setConfirmState(null)
  }, [])

  return (
    <div className="flex h-screen bg-theme-bg text-theme-text">
      {/* 侧边栏 */}
      <div className="w-56 flex flex-col border-r border-theme-border">
        <Sidebar
          profiles={profiles}
          activeProfileId={activeProfileId}
          selectedProfileId={selectedProfileId}
          onSelect={setSelectedProfileId}
          onNew={() => {
            /* TODO: 新建档案 */
          }}
          onImport={handleImportClick}
          onExport={() => void handleExport()}
        />
      </div>

      {/* 主内容区（占位） */}
      <main className="flex-1 flex flex-col items-center justify-center gap-2">
        <h1 className="text-3xl font-bold text-theme-text">CC Config GUI</h1>
        <p className="text-theme-text-muted">
          {profiles.length > 0
            ? `共 ${profiles.length} 个档案`
            : '暂无档案，点击左侧「＋ 新建档案」开始'}
        </p>
      </main>

      {/* 隐藏的文件选择输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />

      {/* Toast 通知 */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* 同名档案确认对话框 */}
      {confirmState && (
        <ConfirmDialog
          title="发现同名档案"
          message={
            <div>
              <p className="mb-2">以下档案与现有档案重名，是否覆盖？</p>
              <ul className="list-disc list-inside space-y-0.5">
                {confirmState.duplicates.map((d) => (
                  <li key={d.name} className="font-medium text-theme-text">
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
    </div>
  )
}

export default App
