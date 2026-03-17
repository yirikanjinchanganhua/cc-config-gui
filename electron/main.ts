import { app, shell, BrowserWindow, ipcMain, net } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { nanoid } from 'nanoid'
import { getStore, saveStore } from '../src/lib/storage'
import { upsertEnv } from '../src/lib/settings'
import type { RawProfile, Profile, ConnectivityResult } from '../src/lib/types'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  // profiles:list → 返回 Profile[]
  ipcMain.handle('profiles:list', (): Profile[] | { error: string } => {
    try {
      return getStore().profiles
    } catch (err) {
      return { error: String(err) }
    }
  })

  // profiles:create → 入参 RawProfile，生成 id + createdAt，保存并返回 Profile
  ipcMain.handle('profiles:create', (_event, raw: RawProfile): Profile | { error: string } => {
    try {
      const store = getStore()
      const profile: Profile = {
        ...raw,
        id: nanoid(),
        createdAt: new Date().toISOString()
      }
      store.profiles.push(profile)
      saveStore(store)
      return profile
    } catch (err) {
      return { error: String(err) }
    }
  })

  // profiles:update → 入参 { id } & RawProfile，更新并返回 Profile
  ipcMain.handle(
    'profiles:update',
    (_event, payload: { id: string } & RawProfile): Profile | { error: string } => {
      try {
        const { id, ...raw } = payload
        const store = getStore()
        const idx = store.profiles.findIndex((p) => p.id === id)
        if (idx === -1) return { error: `Profile ${id} not found` }
        store.profiles[idx] = { ...store.profiles[idx], ...raw }
        saveStore(store)
        return store.profiles[idx]
      } catch (err) {
        return { error: String(err) }
      }
    }
  )

  // profiles:delete → 入参 { id }，删除档案
  ipcMain.handle(
    'profiles:delete',
    (_event, { id }: { id: string }): null | { error: string } => {
      try {
        const store = getStore()
        const before = store.profiles.length
        store.profiles = store.profiles.filter((p) => p.id !== id)
        if (store.profiles.length === before) return { error: `Profile ${id} not found` }
        if (store.activeProfileId === id) store.activeProfileId = null
        saveStore(store)
        return null
      } catch (err) {
        return { error: String(err) }
      }
    }
  )

  // profiles:activate → 写入 ~/.claude/settings.json env 字段，更新 activeProfileId
  ipcMain.handle(
    'profiles:activate',
    async (_event, { id }: { id: string }): Promise<Profile | { error: string }> => {
      try {
        const store = getStore()
        const profile = store.profiles.find((p) => p.id === id)
        if (!profile) return { error: `Profile ${id} not found` }
        await upsertEnv({
          ANTHROPIC_API_KEY: profile.apiKey,
          ANTHROPIC_BASE_URL: profile.baseUrl,
          ANTHROPIC_MODEL: profile.model
        })
        store.activeProfileId = id
        saveStore(store)
        return profile
      } catch (err) {
        return { error: String(err) }
      }
    }
  )

  // connectivity:check → 用 net.request 发 GET {baseUrl}/v1/models，返回 ConnectivityResult
  ipcMain.handle(
    'connectivity:check',
    (_event, { profileId }: { profileId: string }): Promise<ConnectivityResult> => {
      return new Promise<ConnectivityResult>((resolve) => {
        try {
          const store = getStore()
          const profile = store.profiles.find((p) => p.id === profileId)
          if (!profile) {
            resolve({ ok: false, error: `Profile ${profileId} not found` })
            return
          }

          const url = profile.baseUrl
          const start = Date.now()

          const request = net.request({
            method: 'GET',
            url,
            headers: {
              'x-api-key': profile.apiKey,
              'anthropic-version': '2023-06-01'
            }
          })

          request.on('response', (response) => {
            const latency = Date.now() - start
            // 消耗响应体，避免连接挂起
            response.on('data', () => {})
            response.on('end', () => {})
            resolve({
              ok: response.statusCode >= 200 && response.statusCode < 300,
              statusCode: response.statusCode,
              latency
            })
          })

          request.on('error', (err) => {
            resolve({ ok: false, error: err.message })
          })

          request.end()
        } catch (err) {
          resolve({ ok: false, error: String(err) })
        }
      })
    }
  )
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.cashcat.config-gui')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
