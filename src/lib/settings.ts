import fs from 'fs'
import path from 'path'
import os from 'os'

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')

/**
 * ~/.claude/settings.json 的结构（只约束本模块关心的字段）
 * 其余未知字段通过 [key: string]: unknown 透传保留
 */
interface ClaudeSettings {
  env?: Record<string, string>
  [key: string]: unknown
}

/**
 * 本模块管理的三个 env key，对应 Profile 的 apiKey / baseUrl / model
 */
export const MANAGED_ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_MODEL'
] as const

export type ManagedEnvKey = (typeof MANAGED_ENV_KEYS)[number]

/**
 * 读取 ~/.claude/settings.json
 *   - 文件不存在 → 返回 {}
 *   - JSON 损坏   → 抛出错误，不修改原文件
 */
function readSettings(): ClaudeSettings {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return {}
  }
  const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8')
  // JSON.parse 在损坏时抛出 SyntaxError，由调用方决定如何处理
  return JSON.parse(raw) as ClaudeSettings
}

/** 进程内串行写队列，防止并发写入竞态 */
let writeQueue: Promise<void> = Promise.resolve()

/**
 * Merge-upsert：仅更新 env 中的三个托管 key，其余字段原样保留。
 *
 * 传入值为 undefined/null 的 key 会被跳过（不删除已有值）。
 * 若需清除某个 key，传入空字符串 ""。
 *
 * 原子写入：先写 .tmp，成功后 rename 替换正式文件。
 * JSON 损坏时抛出错误，不修改原文件。
 */
export function upsertEnv(env: Partial<Record<ManagedEnvKey, string>>): Promise<void> {
  writeQueue = writeQueue.then(() => {
    const settings = readSettings() // 损坏时抛出，队列中止本次写入

    const incoming: Record<string, string> = {}
    for (const key of MANAGED_ENV_KEYS) {
      const val = env[key]
      if (val !== undefined && val !== null) {
        incoming[key] = val
      }
    }

    settings.env = { ...(settings.env ?? {}), ...incoming }

    const dir = path.dirname(SETTINGS_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const tmpPath = `${SETTINGS_PATH}.tmp`
    fs.writeFileSync(tmpPath, JSON.stringify(settings, null, 2), 'utf-8')
    fs.renameSync(tmpPath, SETTINGS_PATH)
  })

  return writeQueue
}

/**
 * 读取当前 env 中三个托管 key 的值。
 * 返回对象只包含在文件中实际存在的 key。
 */
export function readManagedEnv(): Partial<Record<ManagedEnvKey, string>> {
  const settings = readSettings()
  const env = settings.env ?? {}
  const result: Partial<Record<ManagedEnvKey, string>> = {}
  for (const key of MANAGED_ENV_KEYS) {
    if (key in env) {
      result[key] = env[key]
    }
  }
  return result
}
