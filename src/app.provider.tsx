import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { ReactNode } from 'react'
import { useTheme } from '@shared/hooks'
import { log } from '@shared/utils'
import { isDebugMode } from '@shared/utils'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function ThemeInitializer({ children }: { children: ReactNode }) {
  const { theme, resolved } = useTheme()
  log.theme.debug('ThemeInitializer mounted', { theme, resolved })
  return <>{children}</>
}

export function AppProvider({ children }: { children: ReactNode }) {
  const debug = isDebugMode()

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer>
        {children}
      </ThemeInitializer>
      {debug && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
