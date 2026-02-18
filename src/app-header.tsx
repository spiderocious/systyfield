import { Link } from 'react-router-dom'
import { useUrlState, useTheme } from '@shared/hooks'
import type { DesignMode } from '@shared/types'
import { Sun, Moon, SunMoon, Bug, Sparkles } from '@shared/ui/icons'
import { cn } from '@shared/utils'
import { isDebugMode } from '@shared/utils'
import { ROUTES } from '@shared/constants'
import type { Theme } from '@shared/hooks'

const MODES: Array<{ value: DesignMode; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'ui', label: 'UI' },
  { value: 'service', label: 'Service' },
]

const THEME_ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: SunMoon,
}

const THEME_CYCLE: Theme[] = ['system', 'light', 'dark']

export function AppHeader() {
  const { state, setUrlState } = useUrlState()
  const { theme, setTheme } = useTheme()
  const debug = isDebugMode()

  const ThemeIcon = THEME_ICONS[theme]
  const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length]

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <AppLogo />
        <span className="text-sm font-medium text-muted-foreground hidden sm:block">
          system design open field
        </span>
      </div>

      {/* Mode tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-0.5">
        {MODES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setUrlState({ mode: value, nodeId: null, simId: null })}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-semibold transition-all',
              state.mode === value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {debug && (
          <div className="flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1">
            <Bug className="h-3 w-3 text-warning" />
            <span className="text-xs font-medium text-warning">debug</span>
          </div>
        )}
        <Link
          to={ROUTES.DEMO}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Examples
        </Link>
        <button
          onClick={() => setTheme(nextTheme)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={`Theme: ${theme} → ${nextTheme}`}
        >
          <ThemeIcon className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

function AppLogo() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-primary-foreground">
          <circle cx="3" cy="3" r="2" fill="currentColor" opacity="0.9" />
          <circle cx="11" cy="3" r="2" fill="currentColor" opacity="0.7" />
          <circle cx="3" cy="11" r="2" fill="currentColor" opacity="0.7" />
          <circle cx="11" cy="11" r="2" fill="currentColor" opacity="0.5" />
          <line x1="3" y1="3" x2="11" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="3" y1="3" x2="3" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        </svg>
      </div>
      <span className="text-sm font-bold tracking-tight text-foreground">systyfield</span>
    </div>
  )
}
