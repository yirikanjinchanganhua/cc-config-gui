/**
 * server/index.ts
 * 本地服务端入口（供主进程调用或独立运行）
 * 可在此处集成 Express/Fastify 等提供 IPC-over-HTTP 能力
 */

export function startServer(port = 3000): void {
  console.log(`[server] ready on port ${port}`)
}
