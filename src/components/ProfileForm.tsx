import { useState, useEffect, useRef } from 'react';
import type { RawProfile, ApiStyle } from '../lib/types';

interface ProfileFormProps {
    initialValues?: RawProfile;
    onSubmit: (data: RawProfile) => Promise<void>;
    onCancel: () => void;
}

const COMMON_MODELS = [
    'claude-sonnet-4-6',
    'claude-opus-4-6',
    'claude-haiku-4-5-20251001',
];

/** API 风格选项配置 */
const API_STYLE_OPTIONS: { value: ApiStyle; label: string; desc: string }[] = [
    {
        value: 'auto',
        label: '自动探测',
        desc: '根据 Base URL 自动判断（推荐）',
    },
    {
        value: 'anthropic',
        label: 'Anthropic 官方',
        desc: 'GET /v1/models + x-api-key header',
    },
    {
        value: 'openai-compat',
        label: 'OpenAI 兼容',
        desc: 'POST /v1/chat/completions + Authorization: Bearer',
    },
];

function isValidHttpsUrl(url: string): boolean {
    if (!url.startsWith('https://')) return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

export default function ProfileForm({
    initialValues,
    onSubmit,
    onCancel,
}: ProfileFormProps): JSX.Element {
    const isEditing = initialValues !== undefined;

    const [values, setValues] = useState<RawProfile>({
        name: initialValues?.name ?? '',
        apiKey: initialValues?.apiKey ?? '',
        baseUrl: initialValues?.baseUrl ?? '',
        model: initialValues?.model ?? '',
        apiStyle: initialValues?.apiStyle ?? 'auto',
    });
    const [errors, setErrors] = useState<
        Partial<Record<keyof RawProfile, string>>
    >({});
    const [showApiKey, setShowApiKey] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        firstInputRef.current?.focus();
    }, []);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onCancel();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onCancel]);

    function validate(): Partial<Record<keyof RawProfile, string>> {
        const errs: Partial<Record<keyof RawProfile, string>> = {};
        if (!values.name.trim()) errs.name = '档案名称不能为空';
        if (!values.apiKey.trim()) errs.apiKey = 'API Key 不能为空';
        if (!values.baseUrl.trim()) {
            errs.baseUrl = 'Base URL 不能为空';
        } else if (!isValidHttpsUrl(values.baseUrl.trim())) {
            errs.baseUrl = '必须是合法的 https:// 开头的 URL';
        }
        if (!values.model.trim()) errs.model = 'Model 不能为空';
        return errs;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setSubmitting(true);
        try {
            await onSubmit({
                name: values.name.trim(),
                apiKey: values.apiKey.trim(),
                baseUrl: values.baseUrl.trim(),
                model: values.model.trim(),
                apiStyle: values.apiStyle ?? 'auto',
            });
        } finally {
            setSubmitting(false);
        }
    }

    function setField(key: keyof RawProfile, value: string) {
        setValues((prev) => ({ ...prev, [key]: value }));
        if (errors[key as keyof typeof errors])
            setErrors((prev) => ({ ...prev, [key]: undefined }));
    }

    const inputBase = [
        'w-full px-3 py-2 text-sm rounded-lg border bg-theme-bg text-theme-text',
        'placeholder:text-theme-text-muted outline-none transition-colors',
    ].join(' ');

    const inputValid = 'border-theme-border focus:border-blue-500';
    const inputInvalid = 'border-red-500 focus:border-red-500';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div className="w-full max-w-md bg-theme-bg rounded-xl shadow-2xl border border-theme-border flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
                    <h2 className="text-base font-semibold text-theme-text">
                        {isEditing ? '编辑档案' : '新建档案'}
                    </h2>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="关闭"
                        className="text-theme-text-muted hover:text-theme-text transition-colors text-xl leading-none w-7 h-7 flex items-center justify-center rounded"
                    >
                        ×
                    </button>
                </div>

                {/* Form body */}
                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="flex flex-col gap-4 px-6 py-5"
                >
                    {/* 档案名称 */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-theme-text">
                            档案名称
                        </label>
                        <input
                            ref={firstInputRef}
                            type="text"
                            value={values.name}
                            onChange={(e) => setField('name', e.target.value)}
                            placeholder="例：公司账号"
                            className={[
                                inputBase,
                                errors.name ? inputInvalid : inputValid,
                            ].join(' ')}
                        />
                        {errors.name && (
                            <p className="text-xs text-red-500">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    {/* API Key */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-theme-text">
                            API Key
                        </label>
                        <div className="relative">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={values.apiKey}
                                onChange={(e) =>
                                    setField('apiKey', e.target.value)
                                }
                                placeholder="sk-ant-..."
                                autoComplete="off"
                                className={[
                                    inputBase,
                                    'pr-12',
                                    errors.apiKey ? inputInvalid : inputValid,
                                ].join(' ')}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowApiKey((v) => !v)}
                                aria-label={
                                    showApiKey ? '隐藏 API Key' : '显示 API Key'
                                }
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-theme-text-muted hover:text-theme-text transition-colors select-none"
                            >
                                {showApiKey ? '隐藏' : '显示'}
                            </button>
                        </div>
                        {errors.apiKey && (
                            <p className="text-xs text-red-500">
                                {errors.apiKey}
                            </p>
                        )}
                    </div>

                    {/* Base URL */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-theme-text">
                            Base URL
                        </label>
                        <input
                            type="url"
                            value={values.baseUrl}
                            onChange={(e) =>
                                setField('baseUrl', e.target.value)
                            }
                            placeholder="https://api.anthropic.com"
                            className={[
                                inputBase,
                                errors.baseUrl ? inputInvalid : inputValid,
                            ].join(' ')}
                        />
                        {errors.baseUrl && (
                            <p className="text-xs text-red-500">
                                {errors.baseUrl}
                            </p>
                        )}
                    </div>

                    {/* Model */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-theme-text">
                            Model
                        </label>
                        <input
                            type="text"
                            list="profile-form-model-list"
                            value={values.model}
                            onChange={(e) => setField('model', e.target.value)}
                            placeholder="claude-sonnet-4-6"
                            className={[
                                inputBase,
                                errors.model ? inputInvalid : inputValid,
                            ].join(' ')}
                        />
                        <datalist id="profile-form-model-list">
                            {COMMON_MODELS.map((m) => (
                                <option key={m} value={m} />
                            ))}
                        </datalist>
                        {errors.model && (
                            <p className="text-xs text-red-500">
                                {errors.model}
                            </p>
                        )}
                    </div>

                    {/* API 风格 */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-theme-text">
                            连通性检测风格
                        </label>
                        <div className="flex flex-col gap-1.5">
                            {API_STYLE_OPTIONS.map((opt) => (
                                <label
                                    key={opt.value}
                                    className={[
                                        'flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                                        values.apiStyle === opt.value
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-theme-border hover:bg-theme-selected-bg',
                                    ].join(' ')}
                                >
                                    <input
                                        type="radio"
                                        name="apiStyle"
                                        value={opt.value}
                                        checked={values.apiStyle === opt.value}
                                        onChange={() =>
                                            setField('apiStyle', opt.value)
                                        }
                                        className="mt-0.5 accent-blue-500 shrink-0"
                                    />
                                    <span className="flex flex-col gap-0.5">
                                        <span className="text-sm font-medium text-theme-text">
                                            {opt.label}
                                        </span>
                                        <span className="text-xs text-theme-text-muted">
                                            {opt.desc}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm rounded-lg border border-theme-border text-theme-text hover:bg-theme-selected-bg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={[
                                'px-4 py-2 text-sm rounded-lg font-medium transition-colors',
                                submitting
                                    ? 'bg-blue-400 text-white cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white',
                            ].join(' ')}
                        >
                            {submitting
                                ? '保存中…'
                                : isEditing
                                  ? '保存更改'
                                  : '新建'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
