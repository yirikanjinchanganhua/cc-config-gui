/**
 * electron-api.ts
 * ProfileService 的 Electron IPC 实现，通过 window.electron.invoke 调用主进程。
 * IPC handler 以 { error: string } 对象表示错误，此处统一转换为 throw。
 */

import type { Profile, RawProfile, ConnectivityResult, ProfileService } from './types'

/** 检查 IPC 返回值是否包含错误，若是则抛出 */
function unwrap<T>(result: T | { error: string }): T {
  if (result !== null && typeof result === 'object' && 'error' in result) {
    throw new Error((result as { error: string }).error)
  }
  return result as T
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

export const electronApi: ProfileService = {
  async listProfiles(): Promise<Profile[]> {
    const result = await window.electron.invoke('profiles:list')
    return unwrap(result as Profile[] | { error: string })
  },

  async createProfile(raw: RawProfile): Promise<Profile> {
    const result = await window.electron.invoke('profiles:create', raw)
    return unwrap(result as Profile | { error: string })
  },

  async updateProfile(id: string, raw: RawProfile): Promise<Profile> {
    const result = await window.electron.invoke('profiles:update', { id, ...raw })
    return unwrap(result as Profile | { error: string })
  },

  async deleteProfile(id: string): Promise<void> {
    const result = await window.electron.invoke('profiles:delete', { id })
    unwrap(result as null | { error: string })
  },

  async activateProfile(id: string): Promise<Profile> {
    const result = await window.electron.invoke('profiles:activate', { id })
    return unwrap(result as Profile | { error: string })
  },

  async testConnectivity(profileId: string): Promise<ConnectivityResult> {
    const result = await window.electron.invoke('connectivity:check', { profileId })
    return result as ConnectivityResult
  },

  async importProfiles(profiles: RawProfile[]): Promise<{ imported: number; skipped: number }> {
    validateRawProfiles(profiles)
    let imported = 0
    for (const raw of profiles) {
      await electronApi.createProfile(raw)
      imported++
    }
    return { imported, skipped: 0 }
  },

  async exportProfiles(): Promise<RawProfile[]> {
    const profiles = await electronApi.listProfiles()
    return profiles.map(({ name, apiKey, baseUrl, model }) => ({ name, apiKey, baseUrl, model }))
  },
}
