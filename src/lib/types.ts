export interface Profile {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  model: string
  createdAt: string
}

export interface ProfilesStore {
  activeProfileId: string | null
  profiles: Profile[]
}

/** 用于创建/更新 Profile 的输入，不含自动生成字段 */
export interface RawProfile {
  name: string
  apiKey: string
  baseUrl: string
  model: string
}

export interface ConnectivityResult {
  ok: boolean
  latency?: number
  statusCode?: number
  error?: string
}

export interface ProfileService {
  listProfiles(): Promise<Profile[]>
  createProfile(raw: RawProfile): Promise<Profile>
  updateProfile(id: string, raw: RawProfile): Promise<Profile>
  deleteProfile(id: string): Promise<void>
  activateProfile(id: string): Promise<Profile>
  testConnectivity(profileId: string): Promise<ConnectivityResult>
  importProfiles(profiles: RawProfile[]): Promise<{ imported: number; skipped: number }>
  exportProfiles(): Promise<RawProfile[]>
}
