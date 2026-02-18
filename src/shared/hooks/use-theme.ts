import { useState, useEffect, useCallback } from 'react'
import { log } from '../utils/log'

export type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'systyfield_theme'

function getSystemPreference(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'light' | 'dark'): void {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  root.setAttribute('data-theme', resolved)
  log.theme.debug('Applied theme class', { resolved })
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null
    return stored ?? 'system'
  })

  // Track resolved state reactively so UI re-renders when OS preference changes
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(getSystemPreference)

  const resolved: 'light' | 'dark' = theme === 'system' ? systemPreference : theme

  // Apply theme class to DOM
  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  // Listen for OS theme changes (only matters in 'system' mode but always active for accuracy)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const pref = e.matches ? 'dark' : 'light'
      setSystemPreference(pref)
      log.theme.debug('System theme changed', { dark: e.matches })
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    log.theme.info('Theme changed', { from: theme, to: next })
    localStorage.setItem(THEME_KEY, next)
    setThemeState(next)
  }, [theme])

  return { theme, resolved, setTheme }
}
