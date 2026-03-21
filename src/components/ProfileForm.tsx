import { useState, useEffect, useRef } from 'react';
import type { RawProfile, ApiStyle, Provider } from '../lib/types';
import { PROVIDER_LABELS, PROVIDER_MODELS, inferProviderFromModel } from '../lib/models';

interface ProfileFormProps {
    initialValues?: RawProfile;
    onSubmit: (data: RawProfile) => Promise<void>;
    onCancel: () => void;
}

const PROVIDER_OPTIONS = (Object.keys(PROVIDER_LABELS) as Provider[]).map((value) => ({
    value, label: PROVIDER_LABELS[value],
}));

const API_STYLE_OPTIONS: { value: ApiStyle; label: string; desc: string }[] = [
    { value: 'auto',         label: '自动探测',      desc: '根据 Base URL 自动判断（推荐）' },
    { value: 'anthropic',    label: 'Anthropic 官方', desc: 'GET /v1/models + x-api-key header' },
    { value: 'openai-compat', label: 'OpenAI 兼容',   desc: 'POST /v1/chat/completions + Authorization: Bearer' },
];

function isValidHttpsUrl(url: string): boolean {
    if (!url.startsWith('https://')) return false;
    try { new URL(url); return true; } catch { return false; }
}

export default function ProfileForm({ initialValues, onSubmit, onCancel }: ProfileFormProps): JSX.Element {
    const isEditing = initialValues !== undefined;

    const [values, setValues] = useState<RawProfile>(() => {
        const initialProvider = initialValues?.provider ??
            (initialValues?.model ? inferProviderFromModel(initialValues.model) : 'anthropic');
        return {
            name: initialValues?.name ?? '',
            apiKey: initialValues?.apiKey ?? '',
            baseUrl: initialValues?.baseUrl ?? '',
            model: initialValues?.model ?? '',
            apiStyle: initialValues?.apiStyle ?? 'auto',
            provider: initialProvider,
        };
    });
    const [errors, setErrors] = useState<Partial<Record<keyof RawProfile, string>>>({});
    const [showApiKey, setShowApiKey] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [customModelMode, setCustomModelMode] = useState(() => {
        if (initialValues?.provider === 'other') return true;
        if (initialValues?.model && !PROVIDER_MODELS[initialValues?.provider ?? 'anthropic']?.includes(initialValues.model)) return true;
        return false;
    });

    const firstInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { firstInputRef.current?.focus(); }, []);
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onCancel]);

    function validate(): Partial<Record<keyof RawProfile, string>> {
        const errs: Partial<Record<keyof RawProfile, string>> = {};
        if (!values.name.trim()) errs.name = '档案名称不能为空';
        if (!values.apiKey.trim()) errs.apiKey = 'API Key 不能为空';
        if (!values.baseUrl.trim()) errs.baseUrl = 'Base URL 不能为空';
        else if (!isValidHttpsUrl(values.baseUrl.trim())) errs.baseUrl = '必须是合法的 https:// 开头的 URL';
        if (!values.model.trim()) errs.model = 'Model 不能为空';
        return errs;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setSubmitting(true);
        try {
            await onSubmit({
                name: values.name.trim(), apiKey: values.apiKey.trim(),
                baseUrl: values.baseUrl.trim(), model: values.model.trim(),
                apiStyle: values.apiStyle ?? 'auto', provider: values.provider,
            });
        } finally { setSubmitting(false); }
    }

    function setField(key: keyof RawProfile, value: string | Provider) {
        setValues((prev) => ({ ...prev, [key]: value }));
        if (errors[key as keyof typeof errors]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    }

    function handleProviderChange(newProvider: Provider) {
        setCustomModelMode(newProvider === 'other');
        setValues((prev) => ({ ...prev, provider: newProvider, model: '' }));
        if (errors.model) setErrors((prev) => ({ ...prev, model: undefined }));
    }

    // 标签
    const Label = ({ children }: { children: React.ReactNode }) => (
        <label className="text-[12px] font-semibold text-theme-text-muted tracking-[-0.1px]">{children}</label>
    );
    // 错误提示
    const ErrMsg = ({ msg }: { msg?: string }) =>
        msg ? <p className="text-[11px] mt-[4px]" style={{ color: 'var(--color-red)' }}>{msg}</p> : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' } as React.CSSProperties}
            onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
            <div
                className="w-full max-w-md flex flex-col rounded-[20px] max-h-[88vh]"
                style={{
                    background: 'var(--color-card-bg)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid var(--color-card-border)',
                    boxShadow: 'var(--card-shadow), 0 20px 60px rgba(0,0,0,0.25)',
                }}
            >
                {/* Modal header */}
                <div className="flex items-center justify-between px-[20px] py-[16px] shrink-0"
                    style={{ borderBottom: '1px solid var(--color-separator)' }}>
                    <h2 className="text-[14px] font-semibold text-theme-text tracking-[-0.2px]">
                        {isEditing ? '编辑档案' : '新建档案'}
                    </h2>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center text-[14px] text-theme-text-faint hover:text-theme-text leading-none transition-colors"
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-input-bg)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        aria-label="关闭"
                    >
                        ✕
                    </button>
                </div>

                {/* Form body */}
                <form id="profile-form" onSubmit={handleSubmit} noValidate
                    className="flex flex-col gap-[14px] px-[20px] py-[18px] overflow-y-auto"
                    style={{ scrollbarWidth: 'none' }}>

                    {/* 档案名称 */}
                    <div className="flex flex-col gap-[5px]">
                        <Label>档案名称</Label>
                        <input ref={firstInputRef} type="text" value={values.name}
                            onChange={(e) => setField('name', e.target.value)}
                            placeholder="例：公司账号"
                            className={`glass-input ${errors.name ? 'error' : ''}`} />
                        <ErrMsg msg={errors.name} />
                    </div>

                    {/* API Key */}
                    <div className="flex flex-col gap-[5px]">
                        <Label>API Key</Label>
                        <div className="relative">
                            <input type={showApiKey ? 'text' : 'password'} value={values.apiKey}
                                onChange={(e) => setField('apiKey', e.target.value)}
                                placeholder="sk-ant-..." autoComplete="off"
                                className={`glass-input pr-[52px] ${errors.apiKey ? 'error' : ''}`} />
                            <button type="button" tabIndex={-1}
                                onClick={() => setShowApiKey((v) => !v)}
                                className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[11.5px] font-medium transition-colors"
                                style={{ color: 'var(--color-text-faint)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-faint)')}
                            >
                                {showApiKey ? '隐藏' : '显示'}
                            </button>
                        </div>
                        <ErrMsg msg={errors.apiKey} />
                    </div>

                    {/* Base URL */}
                    <div className="flex flex-col gap-[5px]">
                        <Label>Base URL</Label>
                        <input type="url" value={values.baseUrl}
                            onChange={(e) => setField('baseUrl', e.target.value)}
                            placeholder="https://api.anthropic.com"
                            className={`glass-input font-mono text-[12.5px] ${errors.baseUrl ? 'error' : ''}`} />
                        <ErrMsg msg={errors.baseUrl} />
                    </div>

                    {/* 厂商 */}
                    <div className="flex flex-col gap-[5px]">
                        <Label>厂商</Label>
                        <select value={values.provider ?? 'anthropic'}
                            onChange={(e) => handleProviderChange(e.target.value as Provider)}
                            className="glass-select">
                            {PROVIDER_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Model */}
                    <div className="flex flex-col gap-[5px]">
                        <Label>Model</Label>
                        {customModelMode || values.provider === 'other' ? (
                            <>
                                <input type="text" value={values.model}
                                    onChange={(e) => setField('model', e.target.value)}
                                    placeholder="输入自定义模型名称"
                                    className={`glass-input font-mono text-[12.5px] ${errors.model ? 'error' : ''}`} />
                                {values.provider !== 'other' && (
                                    <button type="button"
                                        onClick={() => { setCustomModelMode(false); setField('model', ''); }}
                                        className="text-[11.5px] text-left transition-colors mt-[2px]"
                                        style={{ color: 'var(--color-accent)' }}
                                    >
                                        返回选择列表
                                    </button>
                                )}
                            </>
                        ) : (
                            <select value={values.model}
                                onChange={(e) => {
                                    if (e.target.value === '__custom__') { setCustomModelMode(true); setField('model', ''); }
                                    else { setField('model', e.target.value); }
                                }}
                                className={`glass-select font-mono text-[12.5px] ${errors.model ? 'error' : ''}`}>
                                <option value="" disabled>选择模型</option>
                                {PROVIDER_MODELS[values.provider ?? 'anthropic'].map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                                <option value="__custom__">自定义…</option>
                            </select>
                        )}
                        <ErrMsg msg={errors.model} />
                    </div>

                    {/* API 风格 */}
                    <div className="flex flex-col gap-[5px]">
                        <Label>连通性检测风格</Label>
                        <div className="flex flex-col gap-[5px]">
                            {API_STYLE_OPTIONS.map((opt) => (
                                <label key={opt.value}
                                    className="flex items-start gap-[10px] px-[12px] py-[9px] rounded-[10px] cursor-pointer transition-colors duration-100"
                                    style={{
                                        border: `1px solid ${values.apiStyle === opt.value ? 'var(--color-accent)' : 'var(--color-input-border)'}`,
                                        background: values.apiStyle === opt.value ? 'var(--color-accent-light)' : 'var(--color-input-bg)',
                                    }}>
                                    <input type="radio" name="apiStyle" value={opt.value}
                                        checked={values.apiStyle === opt.value}
                                        onChange={() => setField('apiStyle', opt.value)}
                                        className="mt-[1px] shrink-0"
                                        style={{ accentColor: 'var(--color-accent)' }} />
                                    <span className="flex flex-col gap-[1px]">
                                        <span className="text-[12.5px] font-medium text-theme-text">{opt.label}</span>
                                        <span className="text-[11px] text-theme-text-muted">{opt.desc}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </form>

                {/* Modal footer */}
                <div className="flex justify-end gap-[8px] px-[20px] py-[14px] shrink-0"
                    style={{ borderTop: '1px solid var(--color-separator)' }}>
                    <button type="button" onClick={onCancel}
                        className="px-[16px] py-[7px] text-[12.5px] rounded-[9px] font-medium transition-colors duration-100"
                        style={{ background: 'var(--color-input-bg)', color: 'var(--color-text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
                    >
                        取消
                    </button>
                    <button type="submit" form="profile-form" disabled={submitting}
                        className="px-[16px] py-[7px] text-[12.5px] rounded-[9px] font-medium text-white transition-opacity duration-100"
                        style={{ background: 'var(--color-accent)', opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                    >
                        {submitting ? '保存中…' : isEditing ? '保存更改' : '新建'}
                    </button>
                </div>
            </div>
        </div>
    );
}
