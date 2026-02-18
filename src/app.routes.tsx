import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ROUTES } from '@shared/constants'
import { AppLayout } from './app-layout'

const CanvasPage = lazy(() =>
  import('@features/canvas').then(m => ({ default: m.CanvasPage }))
)

function PageLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.CANVAS.NEW} replace />} />
      <Route element={<AppLayout />}>
        <Route
          path={ROUTES.CANVAS.NEW}
          element={
            <Suspense fallback={<PageLoader />}>
              <CanvasPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.CANVAS.DESIGN_PATTERN}
          element={
            <Suspense fallback={<PageLoader />}>
              <CanvasPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}
