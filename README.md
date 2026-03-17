# CC Config Manager

Claude Code 配置文件管理工具，基于 Electron + React 构建的桌面应用。

## 开发

```bash
npm install
npm run dev
```

## 构建 DMG 安装包

### 前置步骤：准备图标

1. 将 1024x1024 的 PNG 图标放置到 `resources/icon.png`
2. 运行图标生成脚本：
   ```bash
   ./resources/create-icns.sh
   ```

### 构建

```bash
npm run dist
```

构建完成后，`dist/` 目录下会生成：
- `CC Config Manager-<version>-arm64.dmg`（Apple Silicon）
- `CC Config Manager-<version>-x64.dmg`（Intel）

## 安装说明

### ⚠️ 首次安装注意事项

本应用**未经 Apple Developer 证书签名**（自用工具），macOS 会阻止直接打开。

首次安装步骤：

1. 双击 `.dmg` 文件，将 `CC Config Manager.app` 拖入 `/Applications`
2. 直接双击运行时，系统会提示「无法打开，因为无法验证开发者」
3. 前往 **系统设置 → 隐私与安全性**，在底部找到被阻止的应用，点击 **「仍要打开」**
4. 在弹出的对话框中再次点击 **「打开」**

后续启动不再需要此步骤。

### 使用命令行绕过（可选）

```bash
xattr -cr /Applications/CC\ Config\ Manager.app
```

## 技术栈

- Electron 31
- React 18 + TypeScript
- Vite (electron-vite)
- Tailwind CSS
