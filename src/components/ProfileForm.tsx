import { useState, useEffect, useRef } from 'react'
import type { RawProfile } from '../lib/types'

interface ProfileFormProps {
  initialValues?: RawProfile
  onSubmit: (data: RawProfile) => Promise<void>
  onCancel: () => void
}

const COMMON_MODELS = [
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-haiku-4-5-20251001',
]

function isValidHttpsUrl(url: string): boolean {
  if (!url.startsWith('https://')) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export default function ProfileForm({
  initialValues,
  onSubmit,
  onCancel,
}: ProfileFormProps): JSX.Element {
  const isEditing = initialValues !== undefined

  const [values, setValues] = useState<RawProfile>({
    name: initialValues?.name ?? '',
    apiKey: initialValues?.apiKey ?? '',
    baseUrl: initialValues?.baseUrl ?? '',
    model: initialValues?.model ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof RawProfile, string>>>({})
  const [showApiKey, setShowApiKey] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  function validate(): Partial<Record<keyof RawProfile, string>> {
    const errs: Partial<Record<keyof RawProfile, string>> = {}
    if (!values.name.trim()) errs.name = '档案名称不能为空'
    if (!values.apiKey.trim()) errs.apiKey = 'API Key 不能为空'
    if (!values.baseUrl.trim()) {
      errs.baseUrl = 'Base URL 不能为空'
    } else if (!isValidHttpsUrl(values.baseUrl.trim())) {
      errs.baseUrl = '必须是合法的 https:// 开头的 URL'
    }
    if (!values.model.trim()) errs.model = 'Model 不能为空'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        name: values.name.trim(),
        apiKey: values.apiKey.trim(),
        baseUrl: values.baseUrl.trim(),
        model: values.model.trim(),
      })
    } finally {
      setSubmitting(false)
    }
  }

  function setField(key: keyof RawProfile, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const inputBase = [
    'w-full px-3 py-2 text-sm rounded-lg border bg-theme-bg text-theme-text',
    'placeholder:text-theme-text-muted outline-none transition-colors',
  ].join(' ')

  const inputValid = 'border-theme-border focus:border-blue-500'
  const inputInvalid = 'border-red-500 focus:border-red-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
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
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 px-6 py-5">
          {/* 档案名称 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-theme-text">档案名称</label>
            <input
              ref={firstInputRef}
              type="text"
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="例：公司账号"
              className={[inputBase, errors.name ? inputInvalid : inputValid].join(' ')}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-theme-text">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={values.apiKey}
                onChange={(e) => setField('apiKey', e.target.value)}
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
                aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-theme-text-muted hover:text-theme-text transition-colors select-none"
              >
                {showApiKey ? '隐藏' : '显示'}
              </button>
            </div>
            {errors.apiKey && <p className="text-xs text-red-500">{errors.apiKey}</p>}
          </div>

          {/* Base URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-theme-text">Base URL</label>
            <input
              type="url"
              value={values.baseUrl}
              onChange={(e) => setField('baseUrl', e.target.value)}
              placeholder="https://api.anthropic.com"
              className={[inputBase, errors.baseUrl ? inputInvalid : inputValid].join(' ')}
            />
            {errors.baseUrl && <p className="text-xs text-red-500">{errors.baseUrl}</p>}
          </div>

          {/* Model */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-theme-text">Model</label>
            <input
              type="text"
              list="profile-form-model-list"
              value={values.model}
              onChange={(e) => setField('model', e.target.value)}
              placeholder="claude-sonnet-4-6"
              className={[inputBase, errors.model ? inputInvalid : inputValid].join(' ')}
            />
            <datalist id="profile-form-model-list">
              {COMMON_MODELS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            {errors.model && <p className="text-xs text-red-500">{errors.model}</p>}
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
              {submitting ? '保存中…' : isEditing ? '保存更改' : '新建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
