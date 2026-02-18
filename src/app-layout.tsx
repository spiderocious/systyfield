import { Outlet } from 'react-router-dom'
import { AppHeader } from './app-header'
import { DebugOverlay } from '@features/settings'

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <AppHeader />
      <main className="relative flex flex-1 overflow-hidden">
        <Outlet />
      </main>
      <DebugOverlay />
    </div>
  )
}
