import { app, shell, BrowserWindow, ipcMain, net } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { nanoid } from 'nanoid';
import { getStore, saveStore } from '../src/lib/storage';
import { upsertEnv } from '../src/lib/settings';
import { registerMarketplaceHandlers } from './marketplace';
import type {
    RawProfile,
    Profile,
    ConnectivityResult,
    ApiStyle,
} from '../src/lib/types';

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(__dirname, '../preload/preload.mjs'),
            sandbox: false,
        },
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: 'deny' };
    });

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
}

function registerIpcHandlers(): void {
    // profiles:reorder → 入参 { orderedIds: string[] }，按新顺序更新 order 字段
    ipcMain.handle(
        'profiles:reorder',
        (
            _event,
            { orderedIds }: { orderedIds: string[] },
        ): null | { error: string } => {
            try {
                const store = getStore();
                orderedIds.forEach((id, idx) => {
                    const p = store.profiles.find((p) => p.id === id);
                    if (p) p.order = idx;
                });
                saveStore(store);
                return null;
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    // store:get → 返回完整 ProfilesStore（含 activeProfileId）
    ipcMain.handle(
        'store:get',
        ():
            | { activeProfileId: string | null; profiles: Profile[] }
            | { error: string } => {
            try {
                const store = getStore();
                return {
                    activeProfileId: store.activeProfileId,
                    profiles: store.profiles,
                };
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    // profiles:list → 返回 Profile[]
    ipcMain.handle('profiles:list', (): Profile[] | { error: string } => {
        try {
            return getStore().profiles;
        } catch (err) {
            return { error: String(err) };
        }
    });

    // profiles:create → 入参 RawProfile，生成 id + createdAt，保存并返回 Profile
    ipcMain.handle(
        'profiles:create',
        (_event, raw: RawProfile): Profile | { error: string } => {
            try {
                const store = getStore();
                const profile: Profile = {
                    ...raw,
                    id: nanoid(),
                    createdAt: new Date().toISOString(),
                };
                store.profiles.push(profile);
                saveStore(store);
                return profile;
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    // profiles:update → 入参 { id } & RawProfile，更新并返回 Profile
    ipcMain.handle(
        'profiles:update',
        async (
            _event,
            payload: { id: string } & RawProfile,
        ): Promise<Profile | { error: string }> => {
            try {
                const { id, ...raw } = payload;
                const store = getStore();
                const idx = store.profiles.findIndex((p) => p.id === id);
                if (idx === -1) return { error: `Profile ${id} not found` };
                store.profiles[idx] = { ...store.profiles[idx], ...raw };
                saveStore(store);
                // 若修改的是当前激活档案，同步写入 settings.json
                if (store.activeProfileId === id) {
                    const updated = store.profiles[idx];
                    await upsertEnv({
                        ANTHROPIC_API_KEY: updated.apiKey,
                        ANTHROPIC_BASE_URL: updated.baseUrl,
                        ANTHROPIC_MODEL: updated.model,
                    });
                }
                return store.profiles[idx];
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    // profiles:delete → 入参 { id }，删除档案
    ipcMain.handle(
        'profiles:delete',
        (_event, { id }: { id: string }): null | { error: string } => {
            try {
                const store = getStore();
                const before = store.profiles.length;
                store.profiles = store.profiles.filter((p) => p.id !== id);
                if (store.profiles.length === before)
                    return { error: `Profile ${id} not found` };
                if (store.activeProfileId === id) store.activeProfileId = null;
                saveStore(store);
                return null;
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    // profiles:activate → 写入 ~/.claude/settings.json env 字段，更新 activeProfileId
    ipcMain.handle(
        'profiles:activate',
        async (
            _event,
            { id }: { id: string },
        ): Promise<Profile | { error: string }> => {
            try {
                const store = getStore();
                const profile = store.profiles.find((p) => p.id === id);
                if (!profile) return { error: `Profile ${id} not found` };
                await upsertEnv({
                    ANTHROPIC_API_KEY: profile.apiKey,
                    ANTHROPIC_BASE_URL: profile.baseUrl,
                    ANTHROPIC_MODEL: profile.model,
                });
                store.activeProfileId = id;
                saveStore(store);
                return profile;
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    // connectivity:check → 根据 apiStyle 自动选择 Anthropic 或 OpenAI 兼容风格发起检测
    ipcMain.handle(
        'connectivity:check',
        (
            _event,
            { profileId }: { profileId: string },
        ): Promise<ConnectivityResult> => {
            return new Promise<ConnectivityResult>((resolve) => {
                try {
                    const store = getStore();
                    const profile = store.profiles.find(
                        (p) => p.id === profileId,
                    );
                    if (!profile) {
                        resolve({
                            ok: false,
                            error: `Profile ${profileId} not found`,
                        });
                        return;
                    }

                    /** 根据 baseUrl 自动推断 API 风格 */
                    function detectApiStyle(
                        baseUrl: string,
                    ): 'anthropic' | 'openai-compat' {
                        return baseUrl.includes('anthropic.com')
                            ? 'anthropic'
                            : 'openai-compat';
                    }

                    /** 解析最终使用的 API 风格（处理 'auto' 的情况） */
                    function resolveApiStyle(
                        style: ApiStyle | undefined,
                        baseUrl: string,
                    ): 'anthropic' | 'openai-compat' {
                        if (!style || style === 'auto')
                            return detectApiStyle(baseUrl);
                        return style;
                    }

                    /** 将 HTTP 状态码映射为用户友好的错误描述 */
                    function statusToError(status: number): string {
                        if (status === 401) return 'API Key 无效';
                        if (status === 403) return '无权限';
                        if (status === 404)
                            return '地址不可达，请检查 Base URL';
                        return `请求失败（HTTP ${status}）`;
                    }

                    const resolvedStyle = resolveApiStyle(
                        profile.apiStyle,
                        profile.baseUrl,
                    );
                    const base = profile.baseUrl.replace(/\/+$/, '');
                    const start = Date.now();

                    let method: string;
                    let url: string;
                    let headers: Record<string, string>;
                    let body: string | undefined;

                    if (resolvedStyle === 'anthropic') {
                        // Anthropic 风格：GET /v1/models + x-api-key header
                        method = 'GET';
                        url = base.endsWith('/v1')
                            ? `${base}/models`
                            : `${base}/v1/models`;
                        headers = {
                            'x-api-key': profile.apiKey,
                            'anthropic-version': '2023-06-01',
                        };
                        body = undefined;
                    } else {
                        // OpenAI 兼容风格：POST /v1/chat/completions + Authorization: Bearer header
                        method = 'POST';
                        url = base.endsWith('/v1')
                            ? `${base}/chat/completions`
                            : `${base}/v1/chat/completions`;
                        headers = {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${profile.apiKey}`,
                        };
                        body = JSON.stringify({
                            model: profile.model,
                            messages: [{ role: 'user', content: 'hi' }],
                            max_tokens: 1,
                        });
                    }

                    const request = net.request({ method, url, headers });

                    // 超时 10 秒
                    const timer = setTimeout(() => {
                        request.abort();
                        resolve({ ok: false, error: '连接超时（10s）' });
                    }, 10_000);

                    request.on('response', (response) => {
                        clearTimeout(timer);
                        const latency = Date.now() - start;
                        const status = response.statusCode;
                        // 消耗响应体，避免连接挂起
                        response.on('data', () => {});
                        response.on('end', () => {});

                        if (status >= 200 && status < 300) {
                            resolve({ ok: true, statusCode: status, latency });
                        } else {
                            resolve({
                                ok: false,
                                statusCode: status,
                                latency,
                                error: statusToError(status),
                            });
                        }
                    });

                    request.on('error', (err) => {
                        clearTimeout(timer);
                        resolve({ ok: false, error: err.message });
                    });

                    if (body) {
                        request.write(body);
                    }
                    request.end();
                } catch (err) {
                    resolve({ ok: false, error: String(err) });
                }
            });
        },
    );
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.cashcat.config-gui');

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    registerIpcHandlers();
    registerMarketplaceHandlers();

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
