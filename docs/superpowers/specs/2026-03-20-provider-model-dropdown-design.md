# 模型厂商级联下拉选择设计

## 背景

当前添加模型配置时，Model 字段使用简单的 `<input>` + `<datalist>` 组合，只预设了 3 个常见模型。用户希望改为级联下拉：先选择厂商，再从下拉列表中选择该厂商对应的模型。

## 需求

- 支持主流大模型厂商
- 硬编码模型列表（非 API 动态获取）
- 级联下拉：先选厂商，再选模型
- 厂商与 Base URL 独立（选择厂商不会自动填充 Base URL）

## 设计

### 1. 新增 Provider（厂商）字段

在 ProfileForm 中，Model 字段之前新增厂商下拉选择框：

**可选厂商：**
- `anthropic` - Anthropic
- `openai` - OpenAI
- `google` - Google (Gemini)
- `deepseek` - DeepSeek
- `alibaba` - 阿里云 (通义千问)
- `zhipu` - 智谱 (GLM)
- `moonshot` - 月之暗面 (Kimi)
- `other` - 其他/自定义

**默认值：** `anthropic`

**交互：** 选择 `other` 时，Model 字段保持为自由输入模式。

### 2. Model 字段改为级联下拉

**行为：**
- 根据选中的厂商，显示对应的模型下拉列表（`<select>` 元素）
- 下拉列表末尾提供 "自定义..." 选项，允许用户切换到自由输入模式
- 自由输入模式下提供 "返回选择" 链接切回下拉模式

### 3. 数据结构变更

**types.ts 新增：**
```typescript
export type Provider = 'anthropic' | 'openai' | 'google' | 'deepseek' | 'alibaba' | 'zhipu' | 'moonshot' | 'other';
```

**RawProfile 接口新增字段：**
```typescript
provider?: Provider;
```

### 4. 新建模型列表配置文件

**路径：** `src/lib/models.ts`

**模型列表：**

```typescript
import type { Provider } from './types';

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
```

### 5. UI 变更

**ProfileForm.tsx 修改：**

1. 新增 Provider 下拉选择框（在 Model 字段之前）
2. Model 字段根据 provider 值动态渲染：
   - `provider === 'other'` 或自定义模式：`<input type="text">`
   - 其他情况：`<select>` 下拉框 + "自定义..." 选项
3. 切换厂商时，清空当前 model 值
4. 编辑已有档案时，根据 model 值反推 provider（如果 model 在某个厂商列表中）

### 6. 兼容性

- 已有的档案（无 provider 字段）在编辑时，尝试根据 model 值匹配厂商
- 匹配失败则默认显示 `other`，保持自由输入模式
- 新建的档案默认选中 `anthropic`

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `src/lib/types.ts` | 新增 `Provider` 类型，`RawProfile` 新增 `provider` 字段 |
| `src/lib/models.ts` | 新建，包含 `PROVIDER_MODELS` 配置 |
| `src/components/ProfileForm.tsx` | 重构 Model 字段为级联下拉 |
