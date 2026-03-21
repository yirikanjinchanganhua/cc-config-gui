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
    return `sk-ant-••••••${apiKey.slice(-4)}`
}

function formatDate(isoString: string): string {
    try {
        return new Date(isoString).toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        })
    } catch { return isoString }
}

function formatCheckTime(): string {
    return new Date().toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
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

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch { /* ignore */ }
    }, [text])

    return (
        <button
            className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center transition-colors duration-100 shrink-0"
            style={{ color: 'var(--color-text-faint)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-input-bg)'; e.currentTarget.style.color = 'var(--color-text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-faint)' }}
            onClick={handleCopy}
            title={copied ? '已复制' : '复制'}
        >
            {copied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
            )}
        </button>
    )
}

// 玻璃卡片
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`rounded-[14px] overflow-hidden ${className}`}
            style={{
                background: 'var(--color-card-bg)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid var(--color-card-border)',
                boxShadow: 'var(--card-shadow)',
            }}
        >
            {children}
        </div>
    )
}

// 字段标签
function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[10px] font-semibold uppercase tracking-[0.5px] mb-[5px]"
            style={{ color: 'var(--color-text-faint)' }}>
            {children}
        </div>
    )
}

export default function DetailPanel({ profile, isActive, onActivate, onEdit, onDelete }: DetailPanelProps): JSX.Element {
    const [showApiKey, setShowApiKey] = useState(false)
    const [checkResult, setCheckResult] = useState<ConnectivityResult | null>(null)
    const [lastCheckTime, setLastCheckTime] = useState<string | null>(null)
    const [checking, setChecking] = useState(false)

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
            setCheckResult({ ok: false, error: err instanceof Error ? err.message : String(err) })
        } finally {
            setLastCheckTime(formatCheckTime())
            setChecking(false)
        }
    }, [profile.id])

    return (
        <div className="flex flex-col h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex flex-col gap-[14px] p-[20px]">

                {/* ── 顶部：名称 + 操作按钮 ─────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-[19px] font-bold text-theme-text leading-snug tracking-[-0.5px]">
                            {profile.name}
                        </h1>
                        <p className="text-[11.5px] text-theme-text-muted mt-[2px]">
                            创建于 {formatDate(profile.createdAt)}
                        </p>
                    </div>

                    <div className="flex items-center gap-[6px] shrink-0 pt-[2px]">
                        <button
                            className="px-[10px] py-[4px] text-[12.5px] rounded-[8px] font-medium transition-colors duration-100"
                            style={{ background: 'rgba(255,59,48,0.10)', color: 'var(--color-red)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,59,48,0.18)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,59,48,0.10)')}
                            onClick={() => onDelete(profile.id)}
                        >
                            删除
                        </button>
                        <button
                            className="px-[10px] py-[4px] text-[12.5px] rounded-[8px] font-medium transition-colors duration-100"
                            style={{ background: 'var(--color-input-bg)', color: 'var(--color-text-muted)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-hover)'; e.currentTarget.style.color = 'var(--color-text)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-input-bg)'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
                            onClick={() => onEdit(profile.id)}
                        >
                            编辑
                        </button>
                        <button
                            disabled={isActive}
                            className="px-[10px] py-[4px] text-[12.5px] rounded-[8px] font-medium transition-colors duration-100"
                            style={isActive
                                ? { background: 'var(--color-active-btn-bg)', color: 'var(--color-active-btn-text)', cursor: 'default' }
                                : { background: 'var(--color-accent)', color: 'white' }}
                            onClick={() => !isActive && onActivate(profile.id)}
                        >
                            {isActive ? '✓ 已激活' : '⚡ 激活'}
                        </button>
                    </div>
                </div>

                {/* ── 配置信息卡片（API Key 独占，Base URL + Model 并排）─────────── */}
                <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.6px] mb-[8px] px-[2px]"
                        style={{ color: 'var(--color-text-faint)' }}>
                        配置信息
                    </div>
                    <GlassCard>
                        {/* API Key — full width */}
                        <div className="px-[14px] pt-[10px] pb-[10px]">
                            <FieldLabel>API Key</FieldLabel>
                            <div className="flex items-center gap-[6px]">
                                <code className="flex-1 text-[13px] font-mono text-theme-text min-w-0 truncate">
                                    {showApiKey ? profile.apiKey : maskApiKey(profile.apiKey)}
                                </code>
                                <button
                                    className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center transition-colors duration-100 shrink-0"
                                    style={{ color: 'var(--color-text-faint)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-input-bg)'; e.currentTarget.style.color = 'var(--color-text)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-faint)' }}
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    title={showApiKey ? '隐藏' : '显示'}
                                >
                                    {showApiKey ? (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                                <CopyButton text={profile.apiKey} />
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="h-px" style={{ background: 'var(--color-separator)' }} />

                        {/* Base URL + Model — 2 columns */}
                        <div className="grid grid-cols-2">
                            <div className="px-[14px] py-[10px]" style={{ borderRight: '1px solid var(--color-separator)' }}>
                                <FieldLabel>Base URL</FieldLabel>
                                <div className="flex items-center gap-[6px]">
                                    <code className="flex-1 text-[12.5px] font-mono text-theme-text min-w-0 truncate">
                                        {profile.baseUrl.replace(/^https?:\/\//, '')}
                                    </code>
                                    <CopyButton text={profile.baseUrl} />
                                </div>
                            </div>
                            <div className="px-[14px] py-[10px]">
                                <FieldLabel>Model</FieldLabel>
                                <div className="flex items-center gap-[6px]">
                                    <code className="flex-1 text-[12.5px] font-mono text-theme-text min-w-0 truncate">
                                        {profile.model}
                                    </code>
                                    <CopyButton text={profile.model} />
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* ── 连通性检测 ──────────────────────────────────────────────────── */}
                <GlassCard>
                    <div className="flex items-center justify-between px-[14px] py-[10px]"
                        style={{ borderBottom: '1px solid var(--color-separator)' }}>
                        <span className="text-[12.5px] font-semibold text-theme-text tracking-[-0.2px]">连通性检测</span>
                        <button
                            disabled={checking}
                            className="px-[10px] py-[3px] text-[12px] rounded-[7px] font-medium transition-colors duration-100"
                            style={{
                                background: 'var(--color-input-bg)',
                                color: checking ? 'var(--color-text-faint)' : 'var(--color-text-muted)',
                                cursor: checking ? 'not-allowed' : 'pointer',
                            }}
                            onMouseEnter={(e) => { if (!checking) { e.currentTarget.style.color = 'var(--color-text)' } }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = checking ? 'var(--color-text-faint)' : 'var(--color-text-muted)' }}
                            onClick={handleCheck}
                        >
                            {checking ? '检测中…' : '重新检测'}
                        </button>
                    </div>

                    <div className="px-[14px] py-[12px]">
                        {checkResult === null && !checking && (
                            <p className="text-[12.5px] text-theme-text-muted">尚未检测，点击「重新检测」开始</p>
                        )}
                        {checking && (
                            <p className="text-[12.5px] text-theme-text-muted animate-pulse">正在检测连接…</p>
                        )}
                        {checkResult !== null && !checking && (
                            <div className="flex flex-col gap-[5px]">
                                {checkResult.ok ? (
                                    <div className="flex items-center gap-[7px]">
                                        <div className="w-[8px] h-[8px] rounded-full shrink-0 status-pulse"
                                            style={{ background: 'var(--color-green)', boxShadow: '0 0 0 2.5px var(--color-green-bg)' }} />
                                        <span className="text-[12.5px] font-medium" style={{ color: 'var(--color-green)' }}>
                                            连接正常
                                        </span>
                                        {checkResult.latency !== undefined && (
                                            <span className="text-[11px] font-mono text-theme-text-muted">
                                                {checkResult.latency} ms
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-[12.5px] font-medium" style={{ color: 'var(--color-red)' }}>
                                        ✗ {getConnectivityError(checkResult)}
                                    </span>
                                )}
                                {lastCheckTime && (
                                    <p className="text-[11px] font-mono text-theme-text-faint">
                                        上次检测：{lastCheckTime}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* 路径信息 */}
                <p className="text-[10.5px] font-mono text-theme-text-faint px-[2px]">
                    写入 ~/.claude/settings.json
                </p>
            </div>
        </div>
    )
}
