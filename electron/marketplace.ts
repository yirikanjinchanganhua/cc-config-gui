/**
 * marketplace.ts
 * 注册所有 marketplace:* IPC handler。
 */

import { ipcMain, dialog } from 'electron';
import {
    fetchPlugins,
    cachePlugin,
    installSkill,
    uninstallSkill,
    getInstalledSkills,
    getSkillDetails,
    refreshCache,
    addSource,
    removeSource,
    importLocal,
} from './marketplace-service';
import type { PluginSource } from '../src/lib/types';

export function registerMarketplaceHandlers(): void {
    ipcMain.handle('marketplace:fetch', () => {
        try {
            return fetchPlugins();
        } catch (err) {
            return { error: String(err) };
        }
    });

    ipcMain.handle(
        'marketplace:cache-plugin',
        (_event, { source }: { source: PluginSource }) => {
            try {
                return cachePlugin(source);
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    ipcMain.handle(
        'marketplace:install',
        (
            _event,
            { pluginSource, skillName }: { pluginSource: PluginSource; skillName: string },
        ) => {
            try {
                return installSkill(pluginSource, skillName);
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    ipcMain.handle(
        'marketplace:uninstall',
        (_event, { skillName }: { skillName: string }) => {
            try {
                return uninstallSkill(skillName);
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    ipcMain.handle('marketplace:installed', () => {
        try {
            return getInstalledSkills();
        } catch (err) {
            return { error: String(err) };
        }
    });

    ipcMain.handle(
        'marketplace:details',
        (_event, { skillPath }: { skillPath: string }) => {
            try {
                return getSkillDetails(skillPath);
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    ipcMain.handle('marketplace:refresh', () => {
        try {
            return refreshCache();
        } catch (err) {
            return { error: String(err) };
        }
    });

    ipcMain.handle(
        'marketplace:add-source',
        (_event, { gitUrl, name }: { gitUrl: string; name: string }) => {
            try {
                return addSource(gitUrl, name);
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    ipcMain.handle(
        'marketplace:remove-source',
        (_event, { id }: { id: string }) => {
            try {
                return removeSource(id);
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    ipcMain.handle(
        'marketplace:import-local',
        (_event, { dirPath }: { dirPath: string }) => {
            try {
                return importLocal(dirPath);
            } catch (err) {
                return { error: String(err) };
            }
        },
    );

    // 选择本地目录对话框
    ipcMain.handle('marketplace:pick-directory', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
        });
        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0];
    });
}
