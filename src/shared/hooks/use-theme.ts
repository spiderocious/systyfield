import { useState, useEffect, useCallback } from 'react'
import { log } from '../utils/log'

export type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'systyfield_theme'

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

function applyTheme(resolved: 'light' | 'dark'): void {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  log.theme.debug('Applied theme class', { resolved })
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null
    return stored ?? 'system'
  })

  const resolved = resolveTheme(theme)

  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? 'dark' : 'light')
      log.theme.debug('System theme changed', { dark: e.matches })
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    log.theme.info('Theme changed', { from: theme, to: next })
    localStorage.setItem(THEME_KEY, next)
    setThemeState(next)
  }, [theme])

  return { theme, resolved, setTheme }
}
