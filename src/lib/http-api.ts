/**
 * http-api.ts
 * ProfileService 的 HTTP 实现，通过 fetch 调用 Web 模式下的 Express REST 服务器。
 * 服务器端口由 Vite 注入的 VITE_API_PORT 环境变量决定，默认 3001。
 */

import type { Profile, RawProfile, ConnectivityResult, ProfileService } from './types'

function getBase(): string {
  const port = import.meta.env.VITE_API_PORT ?? '3001'
  return `http://127.0.0.1:${port}/api`
}

/** 发起 fetch 请求，非 2xx 时解析 body.error 并 throw */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

/** schema 校验：name/apiKey/baseUrl/model 必填，baseUrl 合法 URL；任意失败则整批拒绝 */
function validateRawProfiles(profiles: RawProfile[]): void {
  for (const p of profiles) {
    if (!p.name?.trim()) throw new Error('Profile name is required')
    if (!p.apiKey?.trim()) throw new Error('Profile apiKey is required')
    if (!p.baseUrl?.trim()) throw new Error('Profile baseUrl is required')
    if (!p.model?.trim()) throw new Error('Profile model is required')
    try {
      new URL(p.baseUrl)
    } catch {
      throw new Error(`Invalid baseUrl: "${p.baseUrl}"`)
    }
  }
}

export const httpApi: ProfileService = {
  listProfiles(): Promise<Profile[]> {
    return request<Profile[]>('/profiles')
  },

  createProfile(raw: RawProfile): Promise<Profile> {
    return request<Profile>('/profiles', {
      method: 'POST',
      body: JSON.stringify(raw),
    })
  },

  updateProfile(id: string, raw: RawProfile): Promise<Profile> {
    return request<Profile>(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(raw),
    })
  },

  deleteProfile(id: string): Promise<void> {
    return request<void>(`/profiles/${id}`, { method: 'DELETE' })
  },

  activateProfile(id: string): Promise<Profile> {
    return request<Profile>(`/profiles/${id}/activate`, { method: 'POST' })
  },

  testConnectivity(profileId: string): Promise<ConnectivityResult> {
    return request<ConnectivityResult>('/connectivity-check', {
      method: 'POST',
      body: JSON.stringify({ profileId }),
    })
  },

  async importProfiles(profiles: RawProfile[]): Promise<{ imported: number; skipped: number }> {
    validateRawProfiles(profiles)
    let imported = 0
    for (const raw of profiles) {
      await httpApi.createProfile(raw)
      imported++
    }
    return { imported, skipped: 0 }
  },

  async exportProfiles(): Promise<RawProfile[]> {
    const profiles = await httpApi.listProfiles()
    return profiles.map(({ name, apiKey, baseUrl, model }) => ({ name, apiKey, baseUrl, model }))
  },
}
