/**
 * marketplace-api.ts
 * MarketplaceService 的 Electron IPC 实现，通过 window.electron.invoke 调用主进程。
 */

import type {
    MarketplacePlugin,
    MarketplaceSkill,
    InstalledSkill,
    MarketplaceService,
    PluginSource,
} from './types';

function getBase(): string {
    const port = import.meta.env.VITE_API_PORT ?? '3001';
    return `http://127.0.0.1:${port}/api/marketplace`;
}

/** 检查 IPC 返回值是否包含错误 */
function unwrap<T>(result: T | { error: string }): T {
    if (result !== null && typeof result === 'object' && 'error' in result) {
        throw new Error((result as { error: string }).error);
    }
    return result as T;
}

/** MarketplaceService 的 Electron IPC 实现 */
export const electronMarketplaceApi: MarketplaceService = {
    async fetchPlugins(): Promise<MarketplacePlugin[]> {
        const result = await window.electron.invoke('marketplace:fetch');
        return unwrap(result as MarketplacePlugin[] | { error: string });
    },

    async cachePlugin(source: PluginSource): Promise<{ skills: MarketplaceSkill[] }> {
        const result = await window.electron.invoke('marketplace:cache-plugin', {
            source,
        });
        return unwrap(result as { skills: MarketplaceSkill[] } | { error: string });
    },

    async installSkill(
        pluginSource: PluginSource,
        skillName: string,
    ): Promise<{ success: boolean }> {
        const result = await window.electron.invoke('marketplace:install', {
            pluginSource,
            skillName,
        });
        return unwrap(result as { success: boolean } | { error: string });
    },

    async uninstallSkill(skillName: string): Promise<{ success: boolean }> {
        const result = await window.electron.invoke('marketplace:uninstall', {
            skillName,
        });
        return unwrap(result as { success: boolean } | { error: string });
    },

    async getInstalledSkills(): Promise<InstalledSkill[]> {
        const result = await window.electron.invoke('marketplace:installed');
        return unwrap(result as InstalledSkill[] | { error: string });
    },

    async getSkillDetails(skillPath: string): Promise<{ content: string }> {
        const result = await window.electron.invoke('marketplace:details', {
            skillPath,
        });
        return unwrap(result as { content: string } | { error: string });
    },

    async refreshCache(): Promise<{ updated: number }> {
        const result = await window.electron.invoke('marketplace:refresh');
        return unwrap(result as { updated: number } | { error: string });
    },

    async addSource(gitUrl: string, name: string): Promise<{ success: boolean }> {
        const result = await window.electron.invoke('marketplace:add-source', {
            gitUrl,
            name,
        });
        return unwrap(result as { success: boolean } | { error: string });
    },

    async removeSource(id: string): Promise<{ success: boolean }> {
        const result = await window.electron.invoke('marketplace:remove-source', {
            id,
        });
        return unwrap(result as { success: boolean } | { error: string });
    },

    async importLocal(dirPath: string): Promise<{ installed: number }> {
        const result = await window.electron.invoke('marketplace:import-local', {
            dirPath,
        });
        return unwrap(result as { installed: number } | { error: string });
    },
};

/** MarketplaceService 的 HTTP 实现（Web 模式） */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${getBase()}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (res.status === 204) return undefined as T;
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
            (body as { error?: string }).error ?? `HTTP ${res.status}`,
        );
    }
    return res.json() as Promise<T>;
}

export const httpMarketplaceApi: MarketplaceService = {
    fetchPlugins(): Promise<MarketplacePlugin[]> {
        return request<MarketplacePlugin[]>('/plugins');
    },

    cachePlugin(source: PluginSource): Promise<{ skills: MarketplaceSkill[] }> {
        return request<{ skills: MarketplaceSkill[] }>('/cache-plugin', {
            method: 'POST',
            body: JSON.stringify({ source }),
        });
    },

    installSkill(
        pluginSource: PluginSource,
        skillName: string,
    ): Promise<{ success: boolean }> {
        return request<{ success: boolean }>('/install', {
            method: 'POST',
            body: JSON.stringify({ pluginSource, skillName }),
        });
    },

    uninstallSkill(skillName: string): Promise<{ success: boolean }> {
        return request<{ success: boolean }>('/uninstall', {
            method: 'POST',
            body: JSON.stringify({ skillName }),
        });
    },

    getInstalledSkills(): Promise<InstalledSkill[]> {
        return request<InstalledSkill[]>('/installed');
    },

    getSkillDetails(skillPath: string): Promise<{ content: string }> {
        return request<{ content: string }>(
            `/details?skillPath=${encodeURIComponent(skillPath)}`,
        );
    },

    refreshCache(): Promise<{ updated: number }> {
        return request<{ updated: number }>('/refresh', { method: 'POST' });
    },

    addSource(gitUrl: string, name: string): Promise<{ success: boolean }> {
        return request<{ success: boolean }>('/add-source', {
            method: 'POST',
            body: JSON.stringify({ gitUrl, name }),
        });
    },

    removeSource(id: string): Promise<{ success: boolean }> {
        return request<{ success: boolean }>('/remove-source', {
            method: 'POST',
            body: JSON.stringify({ id }),
        });
    },

    importLocal(dirPath: string): Promise<{ installed: number }> {
        return request<{ installed: number }>('/import-local', {
            method: 'POST',
            body: JSON.stringify({ dirPath }),
        });
    },
};

/** 环境感知的 MarketplaceService */
export const marketplaceApi: MarketplaceService =
    typeof window !== 'undefined' && 'electron' in window
        ? electronMarketplaceApi
        : httpMarketplaceApi;
