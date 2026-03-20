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
