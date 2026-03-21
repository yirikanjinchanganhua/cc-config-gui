# Skill 市场功能设计文档

## 概述

为 CC Config Manager 添加 Skill 市场功能，允许用户浏览 Claude Code 官方插件市场中的 skills，按需安装/卸载单个 skill，管理已安装 skills，并支持自定义插件源导入。

## 架构方案

采用 **Electron IPC 深度集成方案（方案 B）**。所有市场数据获取、插件缓存、文件操作均在 Electron main process 中完成，通过 IPC 通道与渲染进程通信。

```
┌─────────────────────────────────────────────────┐
│  Renderer (React)                               │
│  TabBar [配置管理] [Skill 市场]                  │
│  Marketplace 页面 (浏览/搜索/安装/管理)           │
│  marketplace-api.ts (IPC 客户端)                 │
├─────────────────────────────────────────────────┤
│  Main Process (Electron)                        │
│  IPC Handlers (marketplace:*)                   │
│  ├─ marketplace:fetch     → 远程拉取列表         │
│  ├─ marketplace:cache     → git clone 到 cache   │
│  ├─ marketplace:install   → 复制 skill 到安装目录 │
│  ├─ marketplace:uninstall → 删除已安装 skill     │
│  ├─ marketplace:installed → 扫描已安装列表       │
│  ├─ marketplace:details   → 读取 SKILL.md 全文   │
│  ├─ marketplace:refresh   → git pull 更新缓存    │
│  ├─ marketplace:add-source    → 添加自定义源     │
│  ├─ marketplace:remove-source → 移除自定义源     │
│  └─ marketplace:import-local  → 本地目录导入     │
├─────────────────────────────────────────────────┤
│  文件系统                                       │
│  ~/.claude/plugins/cache/    (Plugin 缓存)       │
│  ~/.claude/plugins/marketplaces/ (市场数据)      │
│  ~/.claude/skills/           (已安装 skills)     │
│  ~/.claude/custom-sources.json (自定义源列表)    │
└─────────────────────────────────────────────────┘
```

## 数据模型

### Plugin 级别

```typescript
interface MarketplacePlugin {
  name: string;           // marketplace.json 中的 name
  description: string;    // marketplace.json 中的 description
  category?: string;      // 分类标签 (development/productivity/testing 等)
  homepage?: string;      // 项目主页
  source: string;         // git 仓库地址
  skills: MarketplaceSkill[];
  cached: boolean;        // 是否已 clone 到本地 cache
}
```

### Skill 级别（安装单位）

```typescript
interface MarketplaceSkill {
  name: string;           // 从 SKILL.md frontmatter 解析
  description: string;    // 从 SKILL.md frontmatter 解析
  pluginName: string;     // 所属 Plugin 名
  filePath: string;       // skill 目录在 cache 中的绝对路径
  supportFiles: string[]; // 同目录下的其他文件路径
}

interface InstalledSkill {
  name: string;           // 目录名，如 "brainstorming"
  sourcePlugin: string;   // 来源 Plugin 名
  installedAt: string;    // 安装时间 ISO 字符串
  files: string[];        // 该 skill 目录下的所有文件名
}
```

### 自定义源

```typescript
interface CustomSource {
  id: string;             // nanoid 生成
  name: string;           // 用户自定义名称
  gitUrl: string;         // git 仓库地址
  description?: string;
}
```

## 存储路径

| 数据 | 路径 | 说明 |
|------|------|------|
| Plugin 缓存 | `~/.claude/plugins/cache/<source-hash>/` | clone 的完整仓库 |
| 官方市场数据 | `~/.claude/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json` | 已有 |
| 已安装 skills | `~/.claude/skills/<skill-name>/` | 每个 skill 一个子目录 |
| 自定义源列表 | `~/.claude/custom-sources.json` | JSON 数组 |
| 元数据 | `~/.claude/skills/<skill-name>/.install-meta.json` | 记录来源 Plugin、安装时间 |

## IPC 通道定义

| Channel | 参数 | 返回值 | 说明 |
|---------|------|--------|------|
| `marketplace:fetch` | `{ customUrl?: string }` | `MarketplacePlugin[]` | 从 GitHub 拉取官方 marketplace.json + 自定义源列表，解析 Plugin 列表（不含 skills 详情） |
| `marketplace:cache-plugin` | `{ source: string }` | `{ skills: MarketplaceSkill[] }` | clone Plugin 到 cache（已缓存则跳过），扫描 `skills/` 目录解析 SKILL.md frontmatter |
| `marketplace:install` | `{ pluginSource: string, skillName: string }` | `{ success: boolean }` | 从 cache 复制 skill 目录到 `~/.claude/skills/`，写入 `.install-meta.json` |
| `marketplace:uninstall` | `{ skillName: string }` | `{ success: boolean }` | 删除 `~/.claude/skills/<skillName>/` |
| `marketplace:installed` | 无 | `InstalledSkill[]` | 扫描 `~/.claude/skills/` 目录 |
| `marketplace:details` | `{ skillPath: string }` | `{ content: string }` | 读取指定 SKILL.md 全文内容 |
| `marketplace:refresh` | 无 | `{ updated: number }` | 对所有已缓存 Plugin 执行 `git pull` |
| `marketplace:add-source` | `{ gitUrl: string, name: string }` | `{ success: boolean }` | 添加自定义源到 `custom-sources.json` |
| `marketplace:remove-source` | `{ id: string }` | `{ success: boolean }` | 从 `custom-sources.json` 移除 |
| `marketplace:import-local` | `{ dirPath: string }` | `{ installed: number }` | 扫描本地目录，复制含 SKILL.md 的子目录到 `~/.claude/skills/` |

## 前端 UI 布局

### 顶部 Tab 栏

在现有标题栏下方新增两个 Tab：`⚙ 配置管理` 和 ` Skill 市场`，点击切换视图。

### Skill 市场页面结构

```
┌──────────────────────────────────────────────┐
│  Skill 市场                                  │
│  [🔍 搜索...]  [分类▼]  [⟳ 刷新]            │
│                                              │
│  ┌─ Plugin: superpowers ─────────────────┐   │
│  │  超能力技能包  14 skills   [展开 ▾]   │   │
│  ├───────────────────────────────────────┤   │
│  │  brainstorming     [安装] [预览]      │   │
│  │  test-driven-dev   [✓已安装] [预览]   │   │
│  │  systematic-debug  [✓已安装] [预览]   │   │
│  │  writing-plans     [安装] [预览]      │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  ┌─ Plugin: code-review ─────────────────┐   │
│  │  自动化代码审查   3 skills  [展开 ▶]  │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  ┌─ 已安装 (2) ──────────────────────────┐   │
│  │  test-driven-dev   superpowers [卸载] │   │
│  │  systematic-debug  superpowers [卸载] │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  [＋ 添加自定义源]  [↑ 从本地导入]           │
└──────────────────────────────────────────────┘
```

### 交互流程

1. **浏览市场**：切换到市场 Tab → `marketplace:fetch` → 显示 Plugin 分组
2. **展开 Plugin**：点击展开 → `marketplace:cache-plugin` → 显示 skills 列表
3. **安装 Skill**：点击安装 → `marketplace:install` → 按钮变「✓ 已安装」
4. **卸载 Skill**：点击卸载 → `marketplace:uninstall` → 按钮恢复「安装」
5. **预览 Skill**：点击预览 → `marketplace:details` → 弹窗显示 SKILL.md
6. **搜索过滤**：关键词本地搜索 plugin 名 + skill 名 + description
7. **分类过滤**：下拉选择 category 过滤 Plugin
8. **刷新**：`marketplace:refresh` → 更新已缓存仓库
9. **添加自定义源**：弹窗填写 name + gitUrl → `marketplace:add-source`
10. **本地导入**：选择本地目录 → `marketplace:import-local`

## 新增文件清单

### 前端

| 文件 | 职责 |
|------|------|
| `src/components/TabBar.tsx` | 顶部 Tab 切换组件 |
| `src/components/marketplace/Marketplace.tsx` | 市场主页面 |
| `src/components/marketplace/PluginGroup.tsx` | Plugin 分组（可展开折叠） |
| `src/components/marketplace/SkillCard.tsx` | 单个 Skill 卡片 |
| `src/components/marketplace/InstalledList.tsx` | 已安装列表 |
| `src/components/marketplace/SkillPreview.tsx` | SKILL.md 预览弹窗 |
| `src/components/marketplace/AddSourceModal.tsx` | 添加自定义源弹窗 |
| `src/lib/marketplace-api.ts` | MarketplaceService IPC 实现 |

### 后端（Electron main process）

| 文件 | 职责 |
|------|------|
| `electron/marketplace.ts` | 所有 marketplace:* IPC handler 的注册 |
| `electron/marketplace-service.ts` | 核心业务逻辑（fetch/cache/install/uninstall） |

### 类型定义

| 文件 | 变更 |
|------|------|
| `src/lib/types.ts` | 新增 MarketplacePlugin / MarketplaceSkill / InstalledSkill / CustomSource 类型 |

## 安装流程详解

```
用户点击「安装」
  │
  ▼
检查 ~/.claude/plugins/cache/ 是否已缓存该 Plugin
  │
  ├─ 未缓存 → git clone <source> ~/.claude/plugins/cache/<hash>/
  │           扫描 skills/ 目录，解析 SKILL.md frontmatter
  │
  └─ 已缓存 → 直接读取本地 skills/ 目录
  │
  ▼
从 cache 中复制 skills/<skillName>/ 整个目录
  → ~/.claude/skills/<skillName>/
  │
  ▼
写入 ~/.claude/skills/<skillName>/.install-meta.json
  { sourcePlugin, installedAt, files }
  │
  ▼
更新 UI：按钮变为「✓ 已安装」，已安装列表更新
```

## 自定义源流程

```
用户填写 name + gitUrl
  │
  ▼
保存到 ~/.claude/custom-sources.json
  │
  ▼
立即 git clone 到 ~/.claude/plugins/cache/<hash>/
  │
  ▼
扫描 skills/ 解析可用 skills
  │
  ▼
合并到市场 Plugin 列表显示
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 网络不可达（fetch 阶段） | 显示「网络连接失败」Toast，保留本地缓存 |
| git clone 失败 | 显示具体错误信息 Toast，不写入 cache |
| skill 目录不存在 | 安装按钮置灰，显示「该 Plugin 无可安装的 skills」 |
| 已安装 skill 重复安装 | 按钮显示「✓ 已安装」，点击提示「已安装」 |
| 卸载不存在的 skill | 提示「未找到该 skill」 |
| git pull 失败 | 显示警告 Toast，保留旧缓存继续使用 |
