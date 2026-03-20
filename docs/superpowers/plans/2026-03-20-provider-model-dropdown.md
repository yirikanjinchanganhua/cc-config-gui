# Provider-Model 级联下拉选择 实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现模型配置表单的厂商级联下拉选择功能，用户先选择厂商，再从下拉列表中选择对应的模型。

**Architecture:** 新增 Provider 类型和模型列表配置文件，修改 ProfileForm 组件实现级联下拉 UI，支持自定义模型输入。

**Tech Stack:** React, TypeScript, Tailwind CSS

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/lib/types.ts` | 修改 | 新增 `Provider` 类型，`RawProfile` 新增 `provider` 字段 |
| `src/lib/models.ts` | 新建 | 各厂商模型列表配置 |
| `src/components/ProfileForm.tsx` | 修改 | 实现级联下拉 UI |

---

## Chunk 1: 类型定义与模型配置

### Task 1: 新增 Provider 类型和模型列表

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/models.ts`

- [ ] **Step 1: 在 types.ts 中新增 Provider 类型**

在 `src/lib/types.ts` 文件末尾添加：

```typescript
/** 大模型厂商 */
export type Provider = 'anthropic' | 'openai' | 'google' | 'deepseek' | 'alibaba' | 'zhipu' | 'moonshot' | 'other';
```

- [ ] **Step 2: 修改 RawProfile 接口，新增 provider 字段**

在 `src/lib/types.ts` 的 `RawProfile` 接口中添加 `provider` 字段：

```typescript
/** 用于创建/更新 Profile 的输入，不含自动生成字段 */
export interface RawProfile {
    name: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    /** API 风格，用于连通性检测时选择正确的请求方式，默认 'auto' */
    apiStyle?: ApiStyle;
    /** 大模型厂商 */
    provider?: Provider;
}
```

- [ ] **Step 3: 创建 models.ts 文件**

创建 `src/lib/models.ts`：

```typescript
import type { Provider } from './types';

/** 厂商显示名称 */
export const PROVIDER_LABELS: Record<Provider, string> = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    google: 'Google (Gemini)',
    deepseek: 'DeepSeek',
    alibaba: '阿里云 (通义千问)',
    zhipu: '智谱 (GLM)',
    moonshot: '月之暗面 (Kimi)',
    other: '其他/自定义',
};

/** 各厂商模型列表 */
export const PROVIDER_MODELS: Record<Provider, string[]> = {
    anthropic: [
        'claude-opus-4-6',
        'claude-sonnet-4-6',
        'claude-haiku-4-5-20251001',
        'claude-3.7-sonnet',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-2.1',
        'claude-2.0',
        'claude-instant-1.2',
    ],
    openai: [
        'gpt-5.4',
        'gpt-5.4-pro',
        'gpt-5.4-mini',
        'gpt-5.4-nano',
        'gpt-4.1',
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-4-32k',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
        'o1',
        'o1-pro',
        'o1-mini',
        'o1-preview',
        'o3',
        'o3-pro',
        'o4-mini',
    ],
    google: [
        'gemini-3.1-pro',
        'gemini-3-pro',
        'gemini-3-flash',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash-thinking',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
    ],
    deepseek: [
        'deepseek-chat',
        'deepseek-reasoner',
    ],
    alibaba: [
        'qwen3-max',
        'qwen3-plus',
        'qwen3-vl',
        'qwq-max-preview',
        'qwq-32b',
        'qwen-max',
        'qwen-max-latest',
        'qwen-plus',
        'qwen-turbo',
        'qwen-long',
        'qwen3-coder-plus',
        'qwen-vl-ocr',
        'qwen2.5-vl',
    ],
    zhipu: [
        'glm-5',
        'glm-4.7',
        'glm-4.7-flashx',
        'glm-4.7-flash',
        'glm-4.6',
        'glm-4.5',
        'glm-4.5-air',
        'glm-4.5-flash',
        'glm-4-plus',
        'glm-4-air',
        'glm-4-airx',
        'glm-4-long',
        'glm-4-flash',
        'glm-4v',
        'glm-4v-plus',
        'glm-4v-flash',
        'glm-z1-rumination',
        'glm-z1-air',
        'glm-z1-airx',
        'glm-z1-flash',
        'glm-z1-flashx',
        'glm-3-turbo',
    ],
    moonshot: [
        'kimi-k2.5',
        'kimi-k2-thinking',
        'kimi-k2',
        'kimi-k1.5',
        'kimi-latest',
        'moonshot-v1-8k',
        'moonshot-v1-32k',
        'moonshot-v1-128k',
        'moonshot-v1-8k-vision',
    ],
    other: [],
};

/** 根据模型名称推断厂商 */
export function inferProviderFromModel(model: string): Provider {
    for (const [provider, models] of Object.entries(PROVIDER_MODELS)) {
        if (models.includes(model)) {
            return provider as Provider;
        }
    }
    return 'other';
}
```

- [ ] **Step 4: 提交类型和模型配置**

```bash
git add src/lib/types.ts src/lib/models.ts
git commit -m "feat: add Provider type and models configuration

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: ProfileForm 组件修改

### Task 2: 重构 ProfileForm 实现级联下拉

**Files:**
- Modify: `src/components/ProfileForm.tsx`

- [ ] **Step 1: 更新 import 语句**

将 ProfileForm.tsx 顶部的 import 修改为：

```typescript
import { useState, useEffect, useRef } from 'react';
import type { RawProfile, ApiStyle, Provider } from '../lib/types';
import { PROVIDER_LABELS, PROVIDER_MODELS, inferProviderFromModel } from '../lib/models';
```

- [ ] **Step 2: 删除 COMMON_MODELS 常量**

删除 ProfileForm.tsx 中的 `COMMON_MODELS` 常量（第 10-14 行）。

- [ ] **Step 3: 新增 Provider 选项配置**

在 `API_STYLE_OPTIONS` 常量之前添加：

```typescript
/** 厂商选项配置 */
const PROVIDER_OPTIONS = (Object.keys(PROVIDER_LABELS) as Provider[]).map(
    (value) => ({
        value,
        label: PROVIDER_LABELS[value],
    })
);
```

- [ ] **Step 4: 修改 values 初始状态，新增 provider 和 customModelMode**

将 `values` 的初始状态修改为：

```typescript
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
```

- [ ] **Step 5: 新增 customModelMode 状态**

在 `submitting` 状态后添加：

```typescript
const [customModelMode, setCustomModelMode] = useState(() => {
    // 如果是 other 厂商或者模型不在列表中，使用自定义模式
    if (initialValues?.provider === 'other') return true;
    if (initialValues?.model && !PROVIDER_MODELS[initialValues?.provider ?? 'anthropic']?.includes(initialValues.model)) {
        return true;
    }
    return false;
});
```

- [ ] **Step 6: 修改 setField 函数签名**

将 `setField` 函数修改为支持 `provider` 类型：

```typescript
function setField(key: keyof RawProfile, value: string | Provider) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof typeof errors])
        setErrors((prev) => ({ ...prev, [key]: undefined }));
}
```

- [ ] **Step 7: 新增 handleProviderChange 函数**

在 `setField` 函数后添加：

```typescript
function handleProviderChange(newProvider: Provider) {
    setCustomModelMode(newProvider === 'other');
    setValues((prev) => ({
        ...prev,
        provider: newProvider,
        model: '', // 切换厂商时清空模型
    }));
    if (errors.model) setErrors((prev) => ({ ...prev, model: undefined }));
}
```

- [ ] **Step 8: 修改 handleSubmit，包含 provider 字段**

将 `handleSubmit` 中的 `onSubmit` 调用修改为：

```typescript
await onSubmit({
    name: values.name.trim(),
    apiKey: values.apiKey.trim(),
    baseUrl: values.baseUrl.trim(),
    model: values.model.trim(),
    apiStyle: values.apiStyle ?? 'auto',
    provider: values.provider,
});
```

- [ ] **Step 9: 在 Base URL 字段后新增 Provider 下拉框**

在 Base URL 字段（第 219-241 行）后、Model 字段前添加：

```typescript
                    {/* 厂商 */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-theme-text">
                            厂商
                        </label>
                        <select
                            value={values.provider ?? 'anthropic'}
                            onChange={(e) => handleProviderChange(e.target.value as Provider)}
                            className={[
                                inputBase,
                                'cursor-pointer',
                            ].join(' ')}
                        >
                            {PROVIDER_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
```

- [ ] **Step 10: 重构 Model 字段为级联下拉**

将原有的 Model 字段（第 243-269 行）替换为：

```typescript
                    {/* Model */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-theme-text">
                            Model
                        </label>
                        {customModelMode || values.provider === 'other' ? (
                            <>
                                <input
                                    type="text"
                                    value={values.model}
                                    onChange={(e) => setField('model', e.target.value)}
                                    placeholder="输入自定义模型名称"
                                    className={[
                                        inputBase,
                                        errors.model ? inputInvalid : inputValid,
                                    ].join(' ')}
                                />
                                {values.provider !== 'other' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomModelMode(false);
                                            setField('model', '');
                                        }}
                                        className="text-xs text-blue-500 hover:text-blue-600 text-left"
                                    >
                                        返回选择列表
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <select
                                    value={values.model}
                                    onChange={(e) => {
                                        if (e.target.value === '__custom__') {
                                            setCustomModelMode(true);
                                            setField('model', '');
                                        } else {
                                            setField('model', e.target.value);
                                        }
                                    }}
                                    className={[
                                        inputBase,
                                        'cursor-pointer',
                                        errors.model ? inputInvalid : inputValid,
                                    ].join(' ')}
                                >
                                    <option value="" disabled>
                                        选择模型
                                    </option>
                                    {PROVIDER_MODELS[values.provider ?? 'anthropic'].map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                    <option value="__custom__">
                                        自定义...
                                    </option>
                                </select>
                            </>
                        )}
                        {errors.model && (
                            <p className="text-xs text-red-500">
                                {errors.model}
                            </p>
                        )}
                    </div>
```

- [ ] **Step 11: 提交 ProfileForm 修改**

```bash
git add src/components/ProfileForm.tsx
git commit -m "feat: implement provider-model cascading dropdown

- Add provider select field
- Model field now shows provider-specific models
- Support custom model input mode
- Infer provider from existing model on edit

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: 验证与完成

### Task 3: 验证功能

- [ ] **Step 1: 启动开发服务器验证**

```bash
npm run dev
```

- [ ] **Step 2: 验证功能清单**

手动验证以下功能：
1. [ ] 新建档案时，默认选中 Anthropic 厂商
2. [ ] 切换厂商时，模型下拉列表更新为对应厂商的模型
3. [ ] 切换厂商时，已选模型被清空
4. [ ] 选择"其他/自定义"厂商时，模型变为自由输入
5. [ ] 点击"自定义..."选项可切换到自由输入模式
6. [ ] 自由输入模式下点击"返回选择列表"可切回下拉模式
7. [ ] 编辑已有档案时，正确显示保存的厂商和模型
8. [ ] 编辑旧档案（无 provider 字段）时，能根据模型推断厂商

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "feat: complete provider-model dropdown feature

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
