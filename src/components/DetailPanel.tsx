import { useState, useCallback, useEffect } from 'react'
import type { Profile, ConnectivityResult } from '../lib/types'
import { api } from '../lib/api-client'

interface DetailPanelProps {
  profile: Profile
  isActive: boolean
  onActivate: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 4) return '••••••••'
  const last4 = apiKey.slice(-4)
  return `sk-ant-••••••${last4}`
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

function formatCheckTime(): string {
  return new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getConnectivityError(result: ConnectivityResult): string {
  const status = result.statusCode
  if (status === 401) return 'Key 无效（401 Unauthorized）'
  if (status === 403) return '无权限（403 Forbidden）'
  if (status === 404) return '地址不可达（404 Not Found）'
  const err = result.error ?? ''
  if (err.includes('timeout') || err.includes('ECONNREFUSED') || err.includes('ENOTFOUND')) {
    return '地址不可达（连接超时）'
  }
  return err || `连接失败（状态码 ${status ?? '未知'}）`
}

interface CopyButtonProps {
  text: string
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }, [text])

  return (
    <button
      className="p-1 rounded text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg transition-colors shrink-0"
      onClick={handleCopy}
      title={copied ? '已复制' : '复制'}
    >
      {copied ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  )
}

export default function DetailPanel({
  profile,
  isActive,
  onActivate,
  onEdit,
  onDelete,
}: DetailPanelProps): JSX.Element {
  const [showApiKey, setShowApiKey] = useState(false)
  const [checkResult, setCheckResult] = useState<ConnectivityResult | null>(null)
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  // 切换 Profile 时重置状态
  useEffect(() => {
    setShowApiKey(false)
    setCheckResult(null)
    setLastCheckTime(null)
    setChecking(false)
  }, [profile.id])

  const handleCheck = useCallback(async () => {
    setChecking(true)
    try {
      const result = await api.testConnectivity(profile.id)
      setCheckResult(result)
    } catch (err) {
      setCheckResult({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setLastCheckTime(formatCheckTime())
      setChecking(false)
    }
  }, [profile.id])

  return (
    <div className="flex flex-col h-full bg-theme-bg overflow-y-auto">
      <div className="flex flex-col gap-5 p-6">
        {/* 顶部：名称 + 操作按钮 */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-theme-text leading-snug">{profile.name}</h1>
            <p className="text-sm text-theme-text-muted mt-1">
              创建于 {formatDate(profile.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <button
              className="px-3 py-1.5 text-sm rounded-lg border border-theme-border text-theme-text-muted hover:text-red-500 hover:border-red-400 transition-colors"
              onClick={() => onDelete(profile.id)}
            >
              删除
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded-lg border border-theme-border text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg transition-colors"
              onClick={() => onEdit(profile.id)}
            >
              编辑
            </button>
            <button
              disabled={isActive}
              className={[
                'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
                isActive
                  ? 'bg-theme-active-bg text-theme-active-text cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600',
              ].join(' ')}
              onClick={() => !isActive && onActivate(profile.id)}
            >
              ⚡ 激活
            </button>
          </div>
        </div>

        {/* 字段展示 */}
        <div className="flex flex-col gap-3">
          {/* API Key */}
          <div className="rounded-lg border border-theme-border p-3">
            <div className="text-xs font-medium text-theme-text-muted mb-2">API Key</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-theme-text min-w-0 truncate">
                {showApiKey ? profile.apiKey : maskApiKey(profile.apiKey)}
              </code>
              <button
                className="p-1 rounded text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg transition-colors shrink-0"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? '隐藏' : '显示'}
              >
                {showApiKey ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
              <CopyButton text={profile.apiKey} />
            </div>
          </div>

          {/* Base URL */}
          <div className="rounded-lg border border-theme-border p-3">
            <div className="text-xs font-medium text-theme-text-muted mb-2">Base URL</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-theme-text min-w-0 truncate">
                {profile.baseUrl}
              </code>
              <CopyButton text={profile.baseUrl} />
            </div>
          </div>

          {/* Model */}
          <div className="rounded-lg border border-theme-border p-3">
            <div className="text-xs font-medium text-theme-text-muted mb-2">Model</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-theme-text min-w-0 truncate">
                {profile.model}
              </code>
              <CopyButton text={profile.model} />
            </div>
          </div>
        </div>

        {/* 连通性检测 */}
        <div className="rounded-lg border border-theme-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-theme-text">连通性检测</div>
            <button
              disabled={checking}
              className={[
                'px-3 py-1.5 text-sm rounded-lg border border-theme-border transition-colors',
                checking
                  ? 'text-theme-text-muted cursor-not-allowed opacity-60'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-selected-bg',
              ].join(' ')}
              onClick={handleCheck}
            >
              {checking ? '检测中…' : '重新检测'}
            </button>
          </div>

          {checkResult === null && !checking && (
            <p className="text-sm text-theme-text-muted">尚未检测，点击「重新检测」开始</p>
          )}

          {checking && (
            <p className="text-sm text-theme-text-muted">
              <span className="inline-block animate-pulse">正在检测连接…</span>
            </p>
          )}

          {checkResult !== null && !checking && (
            <div className="flex flex-col gap-1.5">
              {checkResult.ok ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-ok, #16a34a)' }}>
                    ✓ 连接正常
                  </span>
                  {checkResult.latency !== undefined && (
                    <span className="text-xs text-theme-text-muted">{checkResult.latency} ms</span>
                  )}
                </div>
              ) : (
                <span className="text-sm font-medium text-red-500">
                  ✗ {getConnectivityError(checkResult)}
                </span>
              )}
              {lastCheckTime && (
                <p className="text-xs text-theme-text-muted">上次检测：{lastCheckTime}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
