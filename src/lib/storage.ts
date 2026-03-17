import fs from 'fs'
import path from 'path'
import os from 'os'
import type { ProfilesStore } from './types'

const DEFAULT_STORE: ProfilesStore = {
  activeProfileId: null,
  profiles: []
}

/**
 * 返回 profiles.json 所在目录：
 *   Electron 主进程: ~/Library/Application Support/CCConfigManager/ (macOS)
 *                    %APPDATA%/CCConfigManager/ (Windows)
 *                    ~/.config/CCConfigManager/ (Linux)
 *   Web / Node 服务器: ~/.cc-config-manager/
 */
function getDataDir(): string {
  if (process.versions?.electron) {
    const home = os.homedir()
    switch (process.platform) {
      case 'darwin':
        return path.join(home, 'Library', 'Application Support', 'CCConfigManager')
      case 'win32':
        return path.join(
          process.env['APPDATA'] ?? path.join(home, 'AppData', 'Roaming'),
          'CCConfigManager'
        )
      default:
        return path.join(home, '.config', 'CCConfigManager')
    }
  }
  return path.join(os.homedir(), '.cc-config-manager')
}

function getStorePath(): string {
  return path.join(getDataDir(), 'profiles.json')
}

/** 读取 ProfilesStore；文件不存在时返回空 Store */
export function getStore(): ProfilesStore {
  const storePath = getStorePath()

  if (!fs.existsSync(storePath)) {
    return { ...DEFAULT_STORE, profiles: [] }
  }

  const raw = fs.readFileSync(storePath, 'utf-8')
  return JSON.parse(raw) as ProfilesStore
}

/** 持久化 ProfilesStore；目录不存在时自动创建，文件权限设为 0600 */
export function saveStore(store: ProfilesStore): void {
  const storePath = getStorePath()
  const dir = path.dirname(storePath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}
