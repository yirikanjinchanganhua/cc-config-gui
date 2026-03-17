/**
 * api-client.ts
 * 环境感知的 API 切换层：检测 window.electron 决定使用 IPC 还是 HTTP。
 * React 组件统一 import { api } from '@/lib/api-client'，无需感知运行环境。
 */

import type { ProfileService } from './types'
import { electronApi } from './electron-api'
import { httpApi } from './http-api'

export type { ProfileService }

export const api: ProfileService =
  typeof window !== 'undefined' && 'electron' in window ? electronApi : httpApi
