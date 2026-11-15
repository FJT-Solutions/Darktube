import { AsyncLocalStorage } from 'async_hooks'

// Usuario dono do token da chamada MCP em andamento; sem ele, vale o comportamento antigo (usuario padrao).
const store = new AsyncLocalStorage<{ userId: string }>()

export const runWithMcpUser = <T>(userId: string | undefined, fn: () => Promise<T>): Promise<T> =>
  userId ? store.run({ userId }, fn) : fn()

export const getMcpUserId = (): string | undefined => store.getStore()?.userId
