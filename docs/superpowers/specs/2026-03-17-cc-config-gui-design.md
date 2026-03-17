# CC Config Manager — 设计规格

**日期：** 2026-03-17
**状态：** 已确认

---

## 1. 项目概述

一个用于快速切换本地 Claude Code（CC）API 配置的 GUI 工具。支持打包为 macOS DMG 安装包，同时支持 `npm run dev` 在浏览器中以 Web 服务形式运行，方便开发者自用。

---

## 2. 核心需求

### 2.1 配置档案（Profile）

每个 Profile 包含三个字段：

| 字段     | 对应环境变量           | 说明                 |
| -------- | ---------------------- | -------------------- |
| API Key  | `ANTHROPIC_AUTH_TOKEN` | 默认遮掩显示         |
| Base URL | `ANTHROPIC_BASE_URL`   | 官方或第三方代理地址 |
| Model    | `ANTHROPIC_MODEL`      | 模型标识符           |

### 2.2 切换机制

激活某个 Profile 时，将三个字段**合并写入** `~/.claude/settings.json` 的 `env` 字段：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-ant-...",
    "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
    "ANTHROPIC_MODEL": "claude-sonnet-4-6"
  }
}
```

**写入策略（merge）：** 读取现有 settings.json → 仅 upsert 这三个 key → 保留 `env` 下的其他 key 及文件中其他所有字段不变。

**边界情况处理：**

- 文件不存在：创建文件，写入 `{ "env": { ... } }`
- 文件存在但无 `env` 字段：添加 `env` 字段
- 文件 JSON 格式损坏：写入失败，弹出错误提示，不修改文件，不回滚（原文件已损坏）
- 写入失败（权限等）：Toast 错误提示，激活状态不更新

CC 启动时会读取此文件中的 `env` 字段，无需重启 shell，也不污染 shell profile。

### 2.3 功能列表

- **CRUD**：创建、查看、编辑、删除 Profile
- **一键激活**：点击激活按钮，写入 settings.json，立即生效
- **激活状态指示**：标题栏常驻显示当前激活的 Profile 名称
- **连通性检测**：对选中 Profile 发起 API 测试，验证 Key + Base URL 是否可用
- **导入档案**：从 JSON 文件批量导入，与现有档案合并，同名提示覆盖
- **导出全部**：将所有 Profile 导出为 `cc-profiles-{YYYY-MM-DD}.json`，格式与导入格式相同（RawProfile 数组，无 id/createdAt），包含 API Key 明文，保存时弹出系统文件保存对话框
- **hover 引导**：导入/导出按钮 hover 时显示 tooltip，说明格式和用途

### 2.4 连通性检测实现

调用 `GET {baseUrl}`，附带 `x-api-key: {apiKey}` 请求头，超时 10 秒。

**CORS 处理：** 检测请求必须在 Node.js 进程中发出（不可从浏览器直接发，会被 CORS 拦截）：

- Electron 模式：主进程通过 `ipcMain` 处理，`net.request` 发出
- Web 模式：Express server 作为代理转发，前端调用 `POST /api/connectivity-check`

**成功判定：** HTTP 2xx 且响应体为合法 JSON。其他情况区分显示：

- 401 → 「API Key 无效」
- 403 → 「无权限」
- 404 / 连接超时 → 「地址不可达，请检查 Base URL」
- 其他 4xx/5xx → 显示状态码

### 2.5 激活状态持久化

`profiles.json` 中存储 `activeProfileId` 字段，记录当前激活的 Profile ID。

```json
{
  "activeProfileId": "profile-uuid-123",
  "profiles": [...]
}
```

App 启动时读取此字段，与 Profile 列表匹配后显示激活状态。用户手动编辑 `settings.json` 后，激活状态指示不会自动同步（明确的已知限制，开发者自用工具可接受）。

### 2.6 安全策略

API Key 明文存储于 app 自身的配置文件中，不使用 macOS Keychain。适合开发者自用工具的简单场景。

**安全加固措施：**

- `profiles.json` 创建时设置文件权限 `0600`（仅当前用户可读写）
- Web 模式 Express server **只绑定 `127.0.0.1`**，不对局域网开放
- 导出的 `profiles.json` 包含明文 API Key，导出时在 tooltip 中提示敏感性

### 2.7 导入/导出格式与校验

**格式：**

```json
[
  {
    "name": "官方 API",
    "apiKey": "sk-ant-api03-...",
    "baseUrl": "https://api.anthropic.com",
    "model": "claude-sonnet-4-6"
  }
]
```

**导入校验：**

- 必须是合法 JSON 数组
- 每项必须包含 `name`、`apiKey`、`baseUrl`、`model` 四个字符串字段
- `baseUrl` 必须是合法 URL（防止路径注入）
- 其他未知字段忽略
- 校验失败时整体拒绝导入，不做部分导入

---

## 3. 架构设计

### 3.1 双模式运行

```
npm run dev（Web 模式）
├── Vite dev server     → React 前端 (localhost:5173)
└── Express server      → 文件 I/O API (127.0.0.1:3001)

npm run dist（Electron 桌面模式）
└── Electron
    ├── 渲染进程        → 同一份 React 代码（由 electron-vite 构建）
    └── 主进程          → 相同文件操作逻辑，通过 IPC 暴露给渲染进程
```

**端口冲突处理：** Express server 启动时若 3001 端口被占用，自动尝试 3002、3003，找到可用端口后通过 stdout 输出实际端口，Vite 代理配置动态读取。

### 3.2 数据模型

```typescript
// Profile 完整结构
interface Profile {
  id: string          // UUID v4，创建时由前端生成（nanoid）
  name: string        // 显示名称，用户自定义
  apiKey: string      // ANTHROPIC_AUTH_TOKEN
  baseUrl: string     // ANTHROPIC_BASE_URL
  model: string       // ANTHROPIC_MODEL
  createdAt: number   // Unix timestamp ms
}

// profiles.json 文件结构
interface ProfilesStore {
  activeProfileId: string | null  // 当前激活的 Profile ID
  profiles: Profile[]             // Profile 列表，按 createdAt 升序
}

// 导入时的宽松格式（无 id / createdAt，导入时自动生成）
interface RawProfile {
  name: string
  apiKey: string
  baseUrl: string
  model: string
}
```

**API Key 显示规则：** 遮掩为 `sk-ant-••••••{末4位}`，提供眼睛图标 toggle 切换全文显示。

### 3.3 前端 API 抽象层

`src/lib/api-client.ts` 根据运行环境自动切换调用方式：

```typescript
// Electron 模式：使用 contextBridge 暴露的 IPC
// Web 模式：使用 fetch 调用 Express REST API
const isElectron = typeof window !== 'undefined' && !!window.electron

export const api = isElectron ? electronApi : httpApi
```

两套实现共享同一个 `ProfileService` 接口：

```typescript
interface ProfileService {
  listProfiles(): Promise<Profile[]>
  createProfile(data: RawProfile): Promise<Profile>   // 服务端生成 id + createdAt
  updateProfile(id: string, data: RawProfile): Promise<Profile>  // PUT 语义，需传完整字段
  deleteProfile(id: string): Promise<void>
  activateProfile(id: string): Promise<void>
  testConnectivity(profileId: string): Promise<ConnectivityResult>
  importProfiles(profiles: RawProfile[]): Promise<{ imported: number; skipped: number }>
  exportProfiles(): Promise<RawProfile[]>  // 导出时剥离 id/createdAt
}

interface ConnectivityResult {
  ok: boolean
  latency?: number    // ms，仅 ok=true 时有值
  statusCode?: number // HTTP 状态码，可区分 401/403/404 等
  error?: string      // 网络错误描述
}
```

### 3.4 API Contract

#### IPC Channels（Electron 模式）

| Channel              | 方向   | 入参                          | 返回                 |
| -------------------- | ------ | ----------------------------- | -------------------- |
| `profiles:list`      | invoke | —                             | `Profile[]`          |
| `profiles:create`    | invoke | `RawProfile`                  | `Profile`            |
| `profiles:update`    | invoke | `{ id: string } & RawProfile` | `Profile`            |
| `profiles:delete`    | invoke | `{ id: string }`              | `void`               |
| `profiles:activate`  | invoke | `{ id: string }`              | `void`               |
| `connectivity:check` | invoke | `{ profileId: string }`       | `ConnectivityResult` |

#### REST Routes（Web 模式，Express on 127.0.0.1）

| Method   | Path                         | 说明                                                  |
| -------- | ---------------------------- | ----------------------------------------------------- |
| `GET`    | `/api/profiles`              | 获取所有档案                                          |
| `POST`   | `/api/profiles`              | 新建档案（Body: RawProfile）                          |
| `PUT`    | `/api/profiles/:id`          | 更新档案（Body: RawProfile）                          |
| `DELETE` | `/api/profiles/:id`          | 删除档案                                              |
| `POST`   | `/api/profiles/:id/activate` | 激活档案                                              |
| `POST`   | `/api/connectivity-check`    | 连通性检测（Body: `{ profileId }`，Express 代理请求） |

### 3.4 数据存储

App 自身的 Profile 列表存储位置：

- **Electron 模式**：`~/Library/Application Support/CCConfigManager/profiles.json`（通过 `app.getPath('userData')` 获取）
- **Web 模式**：`~/.cc-config-manager/profiles.json`

两者文件权限均设为 `0600`。

激活写入目标：`~/.claude/settings.json`（仅 merge `env` 字段中的三个 key）

**原子写入策略：** 先写临时文件 `settings.json.tmp`，再 `fs.rename` 原子替换，防止写入中途崩溃损坏原文件。进程内使用写操作队列（Promise 串行），防止并发写入导致数据竞争。

**端口冲突处理：** Express server 从 3001 开始尝试，最多递增到 3010。找到可用端口后通过 stdout 输出 `READY:PORT=300x`，启动脚本等待此信号后再启动 Vite，并将端口注入 Vite 代理配置（`VITE_API_PORT` 环境变量）。超过 3010 仍无可用端口时退出并输出错误提示。

### 3.5 技术栈

| 层       | 技术                               |
| -------- | ---------------------------------- |
| 构建工具 | electron-vite + Vite               |
| 前端框架 | React 18 + TypeScript              |
| 样式     | Tailwind CSS（CSS 变量实现双主题） |
| Electron | Electron 28+                       |
| Web 后端 | Express（仅 Web 模式）             |
| 打包     | electron-builder → macOS DMG       |

---

## 4. UI 设计

### 4.1 整体布局

侧边栏 + 详情面板的双栏布局：

```
┌─────────────────────────────────────────────────────┐
│ ● ● ●    CC Config Manager    ● 代理服务器 已激活    │  ← 标题栏
├──────────────┬──────────────────────────────────────┤
│ 配置档案     │  测试账号                    [删除][编辑][⚡激活] │
│              │                                      │
│ ✓ 代理服务器 │  API Key    sk-ant-••••••9xkL  [显示] │
│   (当前激活) │  Base URL   https://api.anthropic.com │
│ > 测试账号   │  Model      claude-haiku-4-5          │
│   官方 API   │                                      │
│              │  [连通性检测] 上次检测：3分钟前 ✓ 正常  │
│              │                                      │
│ [+ 新建档案] │                                      │
├──────────────┴──────────────────────────────────────┤
│ 写入 ~/.claude/settings.json · env 字段    [导入][导出全部] │
└─────────────────────────────────────────────────────┘
```

### 4.2 主题

通过 CSS `prefers-color-scheme` 媒体查询自动跟随 macOS 系统设置，无需用户手动切换。

- **Dark 主题**：深色背景（`#111827`），绿色激活按钮（`#166534` / `#86efac`）
- **Light 主题**：白色背景，绿色激活按钮（`#dcfce7` / `#15803d`）

### 4.3 关键交互细节

- **API Key 默认遮掩**，提供「显示/隐藏」切换
- **激活按钮颜色**：绿色（区别于蓝色的 AI 产品感）
- **侧边栏双态高亮**：蓝色左边框 = 当前激活档案；灰色背景 = 当前查看档案
- **导入/导出 tooltip**：hover 时显示格式说明和用途描述

---

## 5. 关键文件结构

```
cc-config-gui/
├── electron/
│   ├── main.ts          # Electron 主进程，注册 IPC handlers
│   └── preload.ts       # contextBridge 暴露 window.electron API
├── server/
│   └── index.ts         # Express server（Web 模式文件 I/O）
├── src/
│   ├── lib/
│   │   ├── api-client.ts     # 环境感知 API 切换层
│   │   ├── electron-api.ts   # IPC 调用实现
│   │   ├── http-api.ts       # fetch 调用实现
│   │   └── settings.ts       # settings.json 读写逻辑（含 merge 策略）
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── DetailPanel.tsx
│   │   ├── ProfileForm.tsx
│   │   └── Tooltip.tsx
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── electron-vite.config.ts
└── electron-builder.config.ts
```

---

## 6. 已知限制

- 不支持 Windows / Linux 打包（仅 macOS DMG）
- 不使用 macOS Keychain 加密存储
- 不支持云端同步
- 不支持多用户权限管理
- macOS DMG 无 Apple Developer 证书签名，首次安装需用户手动在「系统设置 → 隐私与安全性」中允许（开发者自用工具的已知限制）
- 用户手动编辑 `~/.claude/settings.json` 后，app 内的激活状态指示不会自动同步
