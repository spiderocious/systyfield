import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ROUTES } from '@shared/constants'
import { AppLayout } from './app-layout'

const CanvasPage = lazy(() =>
  import('@features/canvas').then(m => ({ default: m.CanvasPage }))
)

const DemoPage = lazy(() =>
  import('@features/demo').then(m => ({ default: m.DemoPage }))
)

const DesignsPage = lazy(() =>
  import('@features/session/pages/designs-page').then(m => ({ default: m.DesignsPage }))
)

const ViewPage = lazy(() =>
  import('@features/session/pages/view-page').then(m => ({ default: m.ViewPage }))
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
          path={ROUTES.DEMO}
          element={
            <Suspense fallback={<PageLoader />}>
              <DemoPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.DESIGNS}
          element={
            <Suspense fallback={<PageLoader />}>
              <DesignsPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.VIEW}
          element={
            <Suspense fallback={<PageLoader />}>
              <ViewPage />
            </Suspense>
          }
        />
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
