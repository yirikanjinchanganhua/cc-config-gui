/// <reference types="vite/client" />

interface Window {
  electron: {
    invoke(channel: string, ...args: unknown[]): Promise<unknown>
  }
}
