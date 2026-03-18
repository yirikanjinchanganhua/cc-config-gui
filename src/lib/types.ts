/**
 * API 风格：
 * - 'auto'         根据 baseUrl 自动探测（默认）
 * - 'anthropic'    Anthropic 官方风格（GET /v1/models + x-api-key header）
 * - 'openai-compat' OpenAI 兼容风格（POST /v1/chat/completions + Authorization: Bearer header）
 */
export type ApiStyle = 'auto' | 'anthropic' | 'openai-compat';

export interface Profile {
    id: string;
    name: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    createdAt: string;
    /** API 风格，用于连通性检测时选择正确的请求方式，默认 'auto' */
    apiStyle?: ApiStyle;
}

export interface ProfilesStore {
    activeProfileId: string | null;
    profiles: Profile[];
}

/** 用于创建/更新 Profile 的输入，不含自动生成字段 */
export interface RawProfile {
    name: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    /** API 风格，用于连通性检测时选择正确的请求方式，默认 'auto' */
    apiStyle?: ApiStyle;
}

export interface ConnectivityResult {
    ok: boolean;
    latency?: number;
    statusCode?: number;
    error?: string;
}

export interface ProfileService {
    listProfiles(): Promise<Profile[]>;
    createProfile(raw: RawProfile): Promise<Profile>;
    updateProfile(id: string, raw: RawProfile): Promise<Profile>;
    deleteProfile(id: string): Promise<void>;
    activateProfile(id: string): Promise<Profile>;
    testConnectivity(profileId: string): Promise<ConnectivityResult>;
    importProfiles(
        profiles: RawProfile[],
    ): Promise<{ imported: number; skipped: number }>;
    exportProfiles(): Promise<RawProfile[]>;
}
