/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_PORT?: string
}

interface Window {
  electron: {
    invoke(channel: string, ...args: unknown[]): Promise<unknown>
  }
}
