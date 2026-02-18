import { isDebugMode } from './debug'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogNamespace =
  | 'canvas'
  | 'sim'
  | 'api'
  | 'session'
  | 'ui'
  | 'storage'
  | 'theme'
  | 'app'

const NAMESPACE_COLORS: Record<LogNamespace, string> = {
  canvas: '#4F46E5',
  sim: '#059669',
  api: '#0891B2',
  session: '#D97706',
  ui: '#7C3AED',
  storage: '#BE185D',
  theme: '#6B7280',
  app: '#111827',
}

function isLoggingEnabled(): boolean {
  if (import.meta.env.PROD) {
    return isDebugMode()
  }
  return true
}

function createLogger(namespace: LogNamespace) {
  const color = NAMESPACE_COLORS[namespace]
  const prefix = `%c[${namespace}]`
  const style = `color: ${color}; font-weight: 600;`

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (!isLoggingEnabled()) return
      // eslint-disable-next-line no-console
      console.debug(prefix, style, message, ...args)
    },
    info: (message: string, ...args: unknown[]) => {
      if (!isLoggingEnabled()) return
      // eslint-disable-next-line no-console
      console.info(prefix, style, message, ...args)
    },
    warn: (message: string, ...args: unknown[]) => {
      if (!isLoggingEnabled()) return
      // eslint-disable-next-line no-console
      console.warn(prefix, style, message, ...args)
    },
    error: (message: string, ...args: unknown[]) => {
      // Errors always log, even in prod, unless explicitly silenced
      if (import.meta.env.PROD && !isDebugMode()) return
      // eslint-disable-next-line no-console
      console.error(prefix, style, message, ...args)
    },
    group: (label: string) => {
      if (!isLoggingEnabled()) return
      // eslint-disable-next-line no-console
      console.group(`${prefix.replace('%c', '')} ${label}`)
    },
    groupEnd: () => {
      if (!isLoggingEnabled()) return
      // eslint-disable-next-line no-console
      console.groupEnd()
    },
    table: (data: unknown) => {
      if (!isLoggingEnabled()) return
      // eslint-disable-next-line no-console
      console.table(data)
    },
  }
}

export const log = {
  canvas: createLogger('canvas'),
  sim: createLogger('sim'),
  api: createLogger('api'),
  session: createLogger('session'),
  ui: createLogger('ui'),
  storage: createLogger('storage'),
  theme: createLogger('theme'),
  app: createLogger('app'),
  level: (_level: LogLevel) => {}, // placeholder for future level filtering
}
