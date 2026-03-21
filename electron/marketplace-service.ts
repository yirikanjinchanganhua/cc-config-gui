/**
 * marketplace-service.ts
 * Skill 市场核心业务逻辑：fetch/cache/install/uninstall，运行在 Electron 主进程。
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync, execFileSync } from 'child_process';
import type {
    MarketplacePlugin,
    MarketplaceSkill,
    InstalledSkill,
    CustomSource,
    PluginSource,
} from '../src/lib/types';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const PLUGINS_DIR = path.join(CLAUDE_DIR, 'plugins');
const MARKETPLACE_DIR = path.join(PLUGINS_DIR, 'marketplaces');
const CACHE_DIR = path.join(PLUGINS_DIR, 'cache');
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
const CUSTOM_SOURCES_PATH = path.join(CLAUDE_DIR, 'custom-sources.json');

// 官方 marketplace.json 路径
const OFFICIAL_MARKETPLACE = path.join(
    MARKETPLACE_DIR,
    'claude-plugins-official',
    '.claude-plugin',
    'marketplace.json',
);

/** 确保目录存在 */
function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/** 解析 git URL 中的仓库名作为 cache key */
function sourceToCacheKey(source: string): string {
    // 对于 URL，用仓库名的 hash 作为 key
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
        const char = source.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(36);
}

/** 从任意源类型提取可 clone 的 git URL */
function getGitUrl(pluginSource: PluginSource): string | null {
    if (typeof pluginSource === 'string') {
        // 本地相对路径，不是 git URL
        if (pluginSource.startsWith('./')) return null;
        return pluginSource;
    }
    if (pluginSource.source === 'url') return pluginSource.url;
    if (pluginSource.source === 'git-subdir') return pluginSource.url;
    if (pluginSource.source === 'github') return `https://github.com/${pluginSource.repo}`;
    return null;
}

/** 获取 git-subdir 源的子目录路径 */
function getSubdir(pluginSource: PluginSource): string | null {
    if (typeof pluginSource === 'object' && pluginSource.source === 'git-subdir') {
        return pluginSource.subdir;
    }
    return null;
}

/** 从 SKILL.md 文件解析 frontmatter */
function parseSkillFrontmatter(
    skillDir: string,
    pluginName: string,
): MarketplaceSkill | null {
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) return null;

    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;

    const fm = fmMatch[1];
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    const descMatch = fm.match(/^description:\s*(.+)$/m);

    const name = nameMatch?.[1]?.trim().replace(/^["']|["']$/g, '') ?? path.basename(skillDir);
    const description = descMatch?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';

    // 收集同目录下的其他文件
    const supportFiles: string[] = [];
    try {
        const entries = fs.readdirSync(skillDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name !== 'SKILL.md') {
                supportFiles.push(entry.name);
            }
        }
    } catch {
        // ignore
    }

    return {
        name,
        description,
        pluginName,
        filePath: skillDir,
        supportFiles,
    };
}

/** 扫描 plugin 目录下的 skills */
function scanPluginSkills(pluginDir: string, pluginName: string): MarketplaceSkill[] {
    const skills: MarketplaceSkill[] = [];
    const skillsDir = path.join(pluginDir, 'skills');

    if (!fs.existsSync(skillsDir)) return skills;

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillDir = path.join(skillsDir, entry.name);
        const skill = parseSkillFrontmatter(skillDir, pluginName);
        if (skill) skills.push(skill);
    }

    return skills;
}

/** 读取自定义源列表 */
function getCustomSources(): CustomSource[] {
    if (!fs.existsSync(CUSTOM_SOURCES_PATH)) return [];
    try {
        const raw = fs.readFileSync(CUSTOM_SOURCES_PATH, 'utf-8');
        return JSON.parse(raw) as CustomSource[];
    } catch {
        return [];
    }
}

/** 保存自定义源列表 */
function saveCustomSources(sources: CustomSource[]): void {
    ensureDir(path.dirname(CUSTOM_SOURCES_PATH));
    fs.writeFileSync(CUSTOM_SOURCES_PATH, JSON.stringify(sources, null, 2), 'utf-8');
}

/** 读取官方 marketplace.json */
function readOfficialMarketplace(): MarketplacePlugin[] {
    if (!fs.existsSync(OFFICIAL_MARKETPLACE)) return [];
    try {
        const raw = fs.readFileSync(OFFICIAL_MARKETPLACE, 'utf-8');
        const data = JSON.parse(raw) as { plugins?: MarketplacePlugin[] };
        return data.plugins ?? [];
    } catch {
        return [];
    }
}

/** 从自定义源读取 marketplace.json */
function readCustomSourceMarketplace(sourceDir: string): MarketplacePlugin[] {
    const mpPath = path.join(sourceDir, '.claude-plugin', 'marketplace.json');
    if (!fs.existsSync(mpPath)) {
        // 也尝试直接在根目录找 marketplace.json
        const rootMpPath = path.join(sourceDir, 'marketplace.json');
        if (!fs.existsSync(rootMpPath)) return [];
        try {
            const raw = fs.readFileSync(rootMpPath, 'utf-8');
            const data = JSON.parse(raw) as { plugins?: MarketplacePlugin[] };
            return data.plugins ?? [];
        } catch {
            return [];
        }
    }
    try {
        const raw = fs.readFileSync(mpPath, 'utf-8');
        const data = JSON.parse(raw) as { plugins?: MarketplacePlugin[] };
        return data.plugins ?? [];
    } catch {
        return [];
    }
}

/**
 * 获取 marketplace 插件列表
 * 返回所有插件（官方 + 自定义源），标记哪些已在本地缓存
 */
export function fetchPlugins(): MarketplacePlugin[] {
    const plugins: MarketplacePlugin[] = [];

    // 判断 skills 是否为有效对象数组（非字符串数组）
    const hasValidSkills = (skills: unknown): boolean =>
        Array.isArray(skills) && skills.length > 0 && typeof skills[0] === 'object';

    // 官方插件
    const officialPlugins = readOfficialMarketplace();
    for (const p of officialPlugins) {
        const cached = isPluginCached(p.source, p.name);
        let skills = p.skills;
        // 已缓存时自动扫描 skills（marketplace.json 可能不含 skills 或 skills 是字符串数组）
        if (cached && !hasValidSkills(skills)) {
            const dir = getPluginLocalDir(p.source, p.name);
            if (dir) {
                skills = scanPluginSkills(dir, p.name);
            }
        }
        plugins.push({ ...p, cached, skills });
    }

    // 自定义源插件
    const customSources = getCustomSources();
    for (const src of customSources) {
        const cacheDir = path.join(CACHE_DIR, `custom-${src.id}`);
        if (fs.existsSync(cacheDir)) {
            const customPlugins = readCustomSourceMarketplace(cacheDir);
            for (const p of customPlugins) {
                const cached = isPluginCached(p.source, p.name);
                let skills = p.skills;
                if (cached && !hasValidSkills(skills)) {
                    const dir = getPluginLocalDir(p.source, p.name);
                    if (dir) {
                        skills = scanPluginSkills(dir, p.name);
                    }
                }
                plugins.push({ ...p, cached, skills });
            }
        }
    }

    return plugins;
}

/**
 * 查找 Claude Code 官方插件缓存目录
 * 路径：~/.claude/plugins/cache/claude-plugins-official/{pluginName}/{version}/
 * 返回最新版本的目录路径，不存在则返回 null
 */
function findOfficialPluginDir(pluginName: string): string | null {
    const officialCacheBase = path.join(CACHE_DIR, 'claude-plugins-official', pluginName);
    if (!fs.existsSync(officialCacheBase)) return null;

    const entries = fs.readdirSync(officialCacheBase, { withFileTypes: true });
    const versions = entries.filter(e => e.isDirectory()).map(e => e.name);
    if (versions.length === 0) return null;

    // 选最新版本（按 semver 排序取最大）
    versions.sort((a, b) => {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
            if (diff !== 0) return diff;
        }
        return 0;
    });
    return path.join(officialCacheBase, versions[versions.length - 1]!);
}

/** 检查插件是否已缓存 */
function isPluginCached(source: PluginSource, pluginName?: string): boolean {
    // 本地源（字符串路径）直接检查
    if (typeof source === 'string') {
        if (source.startsWith('./')) {
            const localDir = path.join(
                MARKETPLACE_DIR,
                'claude-plugins-official',
                source,
            );
            if (fs.existsSync(localDir)) return true;
            // 也检查官方缓存目录（带版本号）
            if (pluginName) {
                return findOfficialPluginDir(pluginName) !== null;
            }
            // 尝试用 basename 推断
            const basename = path.basename(source);
            return findOfficialPluginDir(basename) !== null;
        }
        return false;
    }
    // URL / git-subdir / github 源：先检查官方缓存，再检查 hash 缓存
    if (pluginName && findOfficialPluginDir(pluginName) !== null) return true;
    const gitUrl = getGitUrl(source);
    if (gitUrl) {
        const key = sourceToCacheKey(gitUrl);
        return fs.existsSync(path.join(CACHE_DIR, key));
    }
    return false;
}

/** 获取插件的本地目录（已缓存时） */
function getPluginLocalDir(source: PluginSource, pluginName?: string): string | null {
    if (typeof source === 'string' && source.startsWith('./')) {
        const localDir = path.join(MARKETPLACE_DIR, 'claude-plugins-official', source);
        if (fs.existsSync(localDir)) return localDir;
        // 检查官方缓存目录（带版本号）
        if (pluginName) {
            const officialDir = findOfficialPluginDir(pluginName);
            if (officialDir) return officialDir;
        }
        const basename = path.basename(source);
        return findOfficialPluginDir(basename);
    }
    const gitUrl = getGitUrl(source);
    if (gitUrl) {
        // 先检查官方缓存
        if (pluginName) {
            const officialDir = findOfficialPluginDir(pluginName);
            if (officialDir) return officialDir;
        }
        const key = sourceToCacheKey(gitUrl);
        const cacheDir = path.join(CACHE_DIR, key);
        if (!fs.existsSync(cacheDir)) return null;
        // git-subdir 源需要拼接子目录
        const subdir = getSubdir(source);
        if (subdir) {
            const subDir = path.join(cacheDir, subdir);
            return fs.existsSync(subDir) ? subDir : null;
        }
        return cacheDir;
    }
    return null;
}

/**
 * 缓存插件（git clone 到本地 cache），然后扫描 skills
 */
export function cachePlugin(source: PluginSource): { skills: MarketplaceSkill[] } {
    // 本地源直接扫描
    if (typeof source === 'string' && source.startsWith('./')) {
        const localDir = path.join(MARKETPLACE_DIR, 'claude-plugins-official', source);
        if (!fs.existsSync(localDir)) {
            throw new Error(`本地插件目录不存在: ${localDir}`);
        }
        const pluginName = path.basename(source);
        const skills = scanPluginSkills(localDir, pluginName);
        return { skills };
    }

    // URL / git-subdir / github 源：clone 或已缓存
    const gitUrl = getGitUrl(source);
    if (!gitUrl) {
        throw new Error('不支持的插件源格式');
    }

    const key = sourceToCacheKey(gitUrl);
    const cacheDir = path.join(CACHE_DIR, key);

    if (!fs.existsSync(cacheDir)) {
        ensureDir(cacheDir);
        try {
            execFileSync('git', ['clone', '--depth', '1', gitUrl, cacheDir], {
                timeout: 60_000,
                stdio: 'pipe',
            });
        } catch (err) {
            // 清理失败的 clone
            try {
                fs.rmSync(cacheDir, { recursive: true, force: true });
            } catch {
                // ignore
            }
            throw new Error(`git clone 失败: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    // 扫描目录：git-subdir 使用子目录，其他使用 cacheDir 根
    const scanDir = getPluginLocalDir(source) ?? cacheDir;
    const pluginName = typeof source === 'string'
        ? path.basename(source)
        : gitUrl.replace(/\.git$/, '').split('/').pop() ?? 'unknown';
    const skills = scanPluginSkills(scanDir, pluginName);
    return { skills };
}

/**
 * 安装单个 skill：从缓存复制到 ~/.claude/skills/
 */
export function installSkill(
    source: PluginSource,
    skillName: string,
): { success: boolean } {
    // 获取插件本地目录
    let pluginDir: string | null = getPluginLocalDir(source);
    if (!pluginDir) {
        // 未缓存，先 clone
        cachePlugin(source);
        pluginDir = getPluginLocalDir(source);
        if (!pluginDir) throw new Error('缓存插件失败');
    }

    // 查找 skill 目录
    const skillsDir = path.join(pluginDir, 'skills');
    const skillDir = path.join(skillsDir, skillName);
    if (!fs.existsSync(skillDir)) {
        throw new Error(`Skill "${skillName}" 未找到`);
    }

    // 目标目录
    const targetDir = path.join(SKILLS_DIR, skillName);
    if (fs.existsSync(targetDir)) {
        throw new Error(`Skill "${skillName}" 已安装`);
    }

    // 复制整个 skill 目录
    ensureDir(SKILLS_DIR);
    copyDirRecursive(skillDir, targetDir);

    // 写入安装元数据
    const gitUrl = getGitUrl(source);
    const pluginName = typeof source === 'string'
        ? path.basename(source)
        : (gitUrl?.replace(/\.git$/, '').split('/').pop() ?? 'unknown');

    const files = fs.readdirSync(targetDir).filter((f) => !f.startsWith('.'));
    const meta = {
        sourcePlugin: pluginName,
        installedAt: new Date().toISOString(),
        files,
    };
    fs.writeFileSync(
        path.join(targetDir, '.install-meta.json'),
        JSON.stringify(meta, null, 2),
        'utf-8',
    );

    return { success: true };
}

/** 递归复制目录 */
function copyDirRecursive(src: string, dest: string): void {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * 卸载 skill：删除 ~/.claude/skills/<skillName>/
 */
export function uninstallSkill(skillName: string): { success: boolean } {
    const skillDir = path.join(SKILLS_DIR, skillName);
    if (!fs.existsSync(skillDir)) {
        throw new Error(`Skill "${skillName}" 未安装`);
    }
    fs.rmSync(skillDir, { recursive: true, force: true });
    return { success: true };
}

/**
 * 获取已安装 skills 列表
 * 合并 ~/.claude/skills/ 和官方插件缓存目录中的 skills
 */
export function getInstalledSkills(): InstalledSkill[] {
    const skillsMap = new Map<string, InstalledSkill>();

    // 1. 扫描 ~/.claude/skills/（通过我们应用安装的 skills）
    if (fs.existsSync(SKILLS_DIR)) {
        const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const skillDir = path.join(SKILLS_DIR, entry.name);
            const metaPath = path.join(skillDir, '.install-meta.json');

            if (fs.existsSync(metaPath)) {
                try {
                    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as {
                        sourcePlugin: string;
                        installedAt: string;
                        files: string[];
                    };
                    skillsMap.set(entry.name, {
                        name: entry.name,
                        sourcePlugin: meta.sourcePlugin,
                        installedAt: meta.installedAt,
                        files: meta.files,
                    });
                } catch {
                    skillsMap.set(entry.name, {
                        name: entry.name,
                        sourcePlugin: 'unknown',
                        installedAt: '',
                        files: [],
                    });
                }
            } else {
                skillsMap.set(entry.name, {
                    name: entry.name,
                    sourcePlugin: 'unknown',
                    installedAt: '',
                    files: [],
                });
            }
        }
    }

    // 2. 扫描官方插件缓存目录
    // 路径：~/.claude/plugins/cache/claude-plugins-official/{pluginName}/{version}/skills/{skillName}/
    const officialCacheRoot = path.join(CACHE_DIR, 'claude-plugins-official');
    if (fs.existsSync(officialCacheRoot)) {
        const pluginDirs = fs.readdirSync(officialCacheRoot, { withFileTypes: true });
        for (const pluginEntry of pluginDirs) {
            if (!pluginEntry.isDirectory()) continue;
            const pluginName = pluginEntry.name;
            const pluginPath = path.join(officialCacheRoot, pluginName);

            // 找最新版本
            const pluginDir = findOfficialPluginDir(pluginName);
            if (!pluginDir) continue;

            const skillsDir = path.join(pluginDir, 'skills');
            if (!fs.existsSync(skillsDir)) continue;

            const skillEntries = fs.readdirSync(skillsDir, { withFileTypes: true });
            for (const skillEntry of skillEntries) {
                if (!skillEntry.isDirectory()) continue;
                // 只添加尚未记录的 skill（~/.claude/skills 优先级更高）
                if (!skillsMap.has(skillEntry.name)) {
                    skillsMap.set(skillEntry.name, {
                        name: skillEntry.name,
                        sourcePlugin: pluginName,
                        installedAt: '',
                        files: [],
                    });
                }
            }
        }
    }

    return Array.from(skillsMap.values());
}

/**
 * 获取 skill 详情（SKILL.md 全文）
 */
export function getSkillDetails(skillPath: string): { content: string } {
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
        throw new Error('SKILL.md 不存在');
    }
    return { content: fs.readFileSync(skillMdPath, 'utf-8') };
}

/**
 * 刷新所有已缓存插件（git pull）
 */
export function refreshCache(): { updated: number } {
    let updated = 0;
    if (!fs.existsSync(CACHE_DIR)) return { updated: 0 };

    const entries = fs.readdirSync(CACHE_DIR, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const dir = path.join(CACHE_DIR, entry.name);
        const gitDir = path.join(dir, '.git');
        if (!fs.existsSync(gitDir)) continue;

        try {
            execSync('git pull --ff-only', { cwd: dir, timeout: 30_000, stdio: 'pipe' });
            updated++;
        } catch {
            // pull 失败保留旧缓存
        }
    }

    return { updated };
}

/**
 * 添加自定义源
 */
export function addSource(gitUrl: string, name: string): { success: boolean } {
    const sources = getCustomSources();
    const id = Math.random().toString(36).substring(2, 10);
    sources.push({ id, name, gitUrl });
    saveCustomSources(sources);

    // 立即 clone
    const cacheDir = path.join(CACHE_DIR, `custom-${id}`);
    ensureDir(cacheDir);
    try {
        execFileSync('git', ['clone', '--depth', '1', gitUrl, cacheDir], {
            timeout: 60_000,
            stdio: 'pipe',
        });
    } catch (err) {
        // clone 失败也保留源记录，下次可重试
        console.error(`Clone custom source failed: ${err}`);
    }

    return { success: true };
}

/**
 * 移除自定义源
 */
export function removeSource(id: string): { success: boolean } {
    const sources = getCustomSources();
    const filtered = sources.filter((s) => s.id !== id);
    if (filtered.length === sources.length) {
        throw new Error(`自定义源 ${id} 不存在`);
    }
    saveCustomSources(filtered);

    // 清理缓存
    const cacheDir = path.join(CACHE_DIR, `custom-${id}`);
    if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
    }

    return { success: true };
}

/**
 * 从本地目录导入 skills
 */
export function importLocal(dirPath: string): { installed: number } {
    if (!fs.existsSync(dirPath)) {
        throw new Error(`目录不存在: ${dirPath}`);
    }

    let installed = 0;
    ensureDir(SKILLS_DIR);

    // 情况 1：所选目录本身就是一个 skill（SKILL.md 在根目录）
    const rootSkillMd = path.join(dirPath, 'SKILL.md');
    if (fs.existsSync(rootSkillMd)) {
        const skillName = path.basename(dirPath);
        const targetDir = path.join(SKILLS_DIR, skillName);
        if (!fs.existsSync(targetDir)) {
            copyDirRecursive(dirPath, targetDir);
            const files = fs.readdirSync(targetDir).filter((f) => !f.startsWith('.'));
            const meta = {
                sourcePlugin: 'local-import',
                installedAt: new Date().toISOString(),
                files,
            };
            fs.writeFileSync(
                path.join(targetDir, '.install-meta.json'),
                JSON.stringify(meta, null, 2),
                'utf-8',
            );
            installed++;
        }
        return { installed };
    }

    // 情况 2：所选目录包含多个 skill 子目录
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillDir = path.join(dirPath, entry.name);
        const skillMdPath = path.join(skillDir, 'SKILL.md');
        if (!fs.existsSync(skillMdPath)) continue;

        const targetDir = path.join(SKILLS_DIR, entry.name);
        if (fs.existsSync(targetDir)) continue; // 已安装跳过

        copyDirRecursive(skillDir, targetDir);

        const files = fs.readdirSync(targetDir).filter((f) => !f.startsWith('.'));
        const meta = {
            sourcePlugin: 'local-import',
            installedAt: new Date().toISOString(),
            files,
        };
        fs.writeFileSync(
            path.join(targetDir, '.install-meta.json'),
            JSON.stringify(meta, null, 2),
            'utf-8',
        );

        installed++;
    }

    return { installed };
}
