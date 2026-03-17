/**
 * server/index.ts
 * Web 模式本地 REST 服务器，替代 Electron IPC 提供 profile 管理和连通性检测。
 * 仅在 Web 模式（npm run dev:web）下使用。
 */

import express from 'express'
import { createServer } from 'net'
import { nanoid } from 'nanoid'
import { getStore, saveStore } from '../src/lib/storage'
import { upsertEnv } from '../src/lib/settings'
import type { RawProfile, Profile, ConnectivityResult } from '../src/lib/types'

const HOST = '127.0.0.1'
const PORT_MIN = 3001
const PORT_MAX = 3010

/** 检测给定端口是否空闲 */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createServer()
    srv.once('error', () => resolve(false))
    srv.once('listening', () => srv.close(() => resolve(true)))
    srv.listen(port, HOST)
  })
}

/** 从 3001 递增扫描到 3010，返回第一个可用端口；全部占用则报错退出 */
async function findPort(): Promise<number> {
  for (let p = PORT_MIN; p <= PORT_MAX; p++) {
    if (await isPortFree(p)) return p
  }
  console.error(`[server] No available port in range ${PORT_MIN}-${PORT_MAX}`)
  process.exit(1)
}

/** 构造 GET /v1/models 完整 URL，兼容 baseUrl 含 /v1 后缀的情况 */
function buildModelsUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  return base.endsWith('/v1') ? `${base}/models` : `${base}/v1/models`
}

/** 连通性检测：向 {baseUrl}/v1/models 发起 GET，按状态码分类判断 */
async function runConnectivityCheck(profileId: string): Promise<ConnectivityResult> {
  const store = getStore()
  const profile = store.profiles.find((p) => p.id === profileId)
  if (!profile) {
    return { ok: false, error: `Profile ${profileId} not found` }
  }

  const url = buildModelsUrl(profile.baseUrl)
  const start = Date.now()

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    let resp: Response
    try {
      resp = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': profile.apiKey,
          'anthropic-version': '2023-06-01'
        },
        signal: controller.signal
      })
    } finally {
      clearTimeout(timer)
    }

    const latency = Date.now() - start
    const status = resp.status

    if (status === 401) return { ok: false, statusCode: status, latency, error: 'Key invalid' }
    if (status === 403) return { ok: false, statusCode: status, latency, error: 'No permission' }
    if (status === 404) return { ok: false, statusCode: status, latency, error: 'Unreachable' }

    if (status >= 200 && status < 300) {
      try {
        await resp.json()
        return { ok: true, statusCode: status, latency }
      } catch {
        return { ok: false, statusCode: status, latency, error: 'Invalid JSON response' }
      }
    }

    return { ok: false, statusCode: status, latency }
  } catch (err: unknown) {
    const latency = Date.now() - start
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, latency, error: 'Timeout' }
    }
    return { ok: false, latency, error: String(err) }
  }
}

async function main(): Promise<void> {
  const port = await findPort()
  const app = express()

  // CORS：仅允许本机 Vite 开发服务器访问
  app.use((req, res, next) => {
    const origin = req.headers.origin ?? ''
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }
    next()
  })

  app.use(express.json())

  // GET /api/profiles → 返回 Profile[]
  app.get('/api/profiles', (_req, res) => {
    try {
      res.json(getStore().profiles)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  // POST /api/profiles → 创建 Profile（Body: RawProfile）
  app.post('/api/profiles', (req, res) => {
    try {
      const raw = req.body as RawProfile
      const store = getStore()
      const profile: Profile = {
        ...raw,
        id: nanoid(),
        createdAt: new Date().toISOString()
      }
      store.profiles.push(profile)
      saveStore(store)
      res.status(201).json(profile)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  // PUT /api/profiles/:id → 更新 Profile（Body: RawProfile）
  app.put('/api/profiles/:id', (req, res) => {
    try {
      const { id } = req.params
      const raw = req.body as RawProfile
      const store = getStore()
      const idx = store.profiles.findIndex((p) => p.id === id)
      if (idx === -1) {
        res.status(404).json({ error: `Profile ${id} not found` })
        return
      }
      store.profiles[idx] = { ...store.profiles[idx]!, ...raw }
      saveStore(store)
      res.json(store.profiles[idx])
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  // DELETE /api/profiles/:id → 删除 Profile
  app.delete('/api/profiles/:id', (req, res) => {
    try {
      const { id } = req.params
      const store = getStore()
      const before = store.profiles.length
      store.profiles = store.profiles.filter((p) => p.id !== id)
      if (store.profiles.length === before) {
        res.status(404).json({ error: `Profile ${id} not found` })
        return
      }
      if (store.activeProfileId === id) store.activeProfileId = null
      saveStore(store)
      res.status(204).send()
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  // POST /api/profiles/:id/activate → 激活 Profile，写入 ~/.claude/settings.json
  app.post('/api/profiles/:id/activate', async (req, res) => {
    try {
      const { id } = req.params
      const store = getStore()
      const profile = store.profiles.find((p) => p.id === id)
      if (!profile) {
        res.status(404).json({ error: `Profile ${id} not found` })
        return
      }
      await upsertEnv({
        ANTHROPIC_API_KEY: profile.apiKey,
        ANTHROPIC_BASE_URL: profile.baseUrl,
        ANTHROPIC_MODEL: profile.model
      })
      store.activeProfileId = id
      saveStore(store)
      res.json(profile)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  // POST /api/connectivity-check → 代理连通性检测（Body: { profileId }）
  app.post('/api/connectivity-check', async (req, res) => {
    try {
      const { profileId } = req.body as { profileId: string }
      if (!profileId) {
        res.status(400).json({ error: 'profileId is required' })
        return
      }
      const result = await runConnectivityCheck(profileId)
      res.json(result)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.listen(port, HOST, () => {
    process.stdout.write(`READY:PORT=${port}\n`)
  })
}

main().catch((err) => {
  console.error('[server] Fatal error:', err)
  process.exit(1)
})
