export const ROUTES = {
  ROOT: '/',
  DEMO: '/demo',
  CANVAS: {
    NEW: '/canvas/new',
    DESIGN: (id: string) => `/canvas/${id}`,
    DESIGN_PATTERN: '/canvas/:id',
  },
} as const
