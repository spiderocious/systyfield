import type { Design, Canvas } from "@shared/types";
import { log } from "@shared/utils";

// ─── JSON export ──────────────────────────────────────────────────────────────

export function exportDesignAsJson(design: Design): void {
  const json = JSON.stringify(design, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${design.meta.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.systyfield.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  log.session.info("Design exported as JSON", { id: design.id });
}

// ─── JSON import ──────────────────────────────────────────────────────────────

export function importDesignFromJson(file: File): Promise<Design> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string;
        const parsed = JSON.parse(raw) as Design;
        // Basic validation
        if (!parsed.id || !parsed.canvas || !parsed.meta) {
          reject(new Error("Invalid design file: missing required fields"));
          return;
        }
        log.session.info("Design imported from JSON", {
          id: parsed.id,
          title: parsed.meta.title,
        });
        resolve(parsed);
      } catch (err) {
        reject(new Error("Failed to parse JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ─── CSV metrics export ────────────────────────────────────────────────────────

export interface MetricsRow {
  elapsedSec: number;
  totalRps: number;
  totalErrorRate: number;
  avgLatencyP99: number;
}

export function exportMetricsAsCsv(
  rows: MetricsRow[],
  designTitle: string,
): void {
  const header = "elapsed_sec,total_rps,error_rate_pct,p99_latency_ms\n";
  const body = rows
    .map(
      (r) =>
        `${r.elapsedSec},${r.totalRps.toFixed(1)},${(r.totalErrorRate * 100).toFixed(2)},${r.avgLatencyP99.toFixed(0)}`,
    )
    .join("\n");
  const csv = header + body;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${designTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-metrics.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  log.session.info("Metrics exported as CSV", { rows: rows.length });
}

// ─── PNG canvas export ─────────────────────────────────────────────────────────

export async function exportCanvasAsPng(
  element: HTMLElement,
  designTitle: string,
): Promise<void> {
  try {
    // Dynamic import of html-to-image (may not be installed yet — graceful fallback)
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: "var(--background)",
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${designTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-canvas.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    log.session.info("Canvas exported as PNG", { title: designTitle });
  } catch (err) {
    log.session.error(
      "PNG export failed (html-to-image may not be installed)",
      err,
    );
    throw new Error(
      "PNG export requires the html-to-image package. Run: npm install html-to-image",
    );
  }
}

// ─── SVG canvas export ─────────────────────────────────────────────────────────

export async function exportCanvasAsSvg(
  element: HTMLElement,
  designTitle: string,
): Promise<void> {
  try {
    const { toSvg } = await import("html-to-image");
    const dataUrl = await toSvg(element, {
      backgroundColor: "var(--background)",
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${designTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-canvas.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    log.session.info("Canvas exported as SVG", { title: designTitle });
  } catch (err) {
    log.session.error(
      "SVG export failed (html-to-image may not be installed)",
      err,
    );
    throw new Error(
      "SVG export requires the html-to-image package. Run: npm install html-to-image",
    );
  }
}

// ─── OpenAPI 3.0 export from service-mode graph ────────────────────────────────

export function exportOpenApiFromCanvas(canvas: Canvas, title: string): void {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const node of canvas.nodes) {
    if (node.type !== "api-endpoint") continue;
    const d = node.data as {
      method?: string;
      path?: string;
      authRequired?: boolean;
      requestBodyExample?: string;
      statusCode?: number;
    };
    const method = (d.method ?? "GET").toLowerCase();
    const path = d.path ?? "/";
    const pathKey = path.startsWith("/") ? path : `/${path}`;

    const operation: Record<string, unknown> = {
      operationId: `${method}${pathKey.replace(/\//g, "_").replace(/[^a-z0-9_]/gi, "")}`,
      summary: node.label,
      tags: [title],
      security: d.authRequired ? [{ bearerAuth: [] }] : [],
      responses: {
        [(d.statusCode ?? 200).toString()]: {
          description: "Success",
          content: { "application/json": { schema: { type: "object" } } },
        },
      },
    };

    if (d.requestBodyExample && method !== "get") {
      let parsedBody: unknown = {};
      try {
        parsedBody = JSON.parse(d.requestBodyExample);
      } catch {}
      operation.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object" },
            example: parsedBody,
          },
        },
      };
    }

    if (!paths[pathKey]) paths[pathKey] = {};
    paths[pathKey][method] = operation;
  }

  const openapi = {
    openapi: "3.0.3",
    info: {
      title,
      version: "1.0.0",
      description: `Generated from systyfield service design`,
    },
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  };

  const json = JSON.stringify(openapi, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-openapi.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  log.session.info("OpenAPI spec exported", {
    paths: Object.keys(paths).length,
  });
}

// ─── Helper: trigger file download ─────────────────────────────────────────────

function triggerDownload(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function slug(s: string): string {
  return s.replace(/[^a-z0-9]/gi, '-').toLowerCase()
}

function pascalCase(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase())
}

// ─── TypeScript Types export (UI mode) ────────────────────────────────────────

export function exportTypescriptFromCanvas(canvas: Canvas, title: string): void {
  const lines: string[] = [
    `// Generated from Systyfield UI design: ${title}`,
    `// ${new Date().toISOString()}`,
    `// ─────────────────────────────────────────────────────────────────────────────`,
    '',
  ]

  // 1. API Binding response shapes
  const bindings = canvas.nodes.filter(n => n.type === 'api-binding' || n.type === 'data-fetcher')
  if (bindings.length > 0) {
    lines.push('// ─── API Response Types ──────────────────────────────────────────────────────')
    lines.push('')
    for (const node of bindings) {
      const d = node.data as unknown as Record<string, unknown>
      const name = pascalCase(node.label || 'Unnamed')
      const responseShape = d.responseShape
      if (responseShape && typeof responseShape === 'object') {
        lines.push(`/** Response type for ${node.label} (${(d.method as string) ?? 'GET'} ${(d.path as string) ?? '/'}) */`)
        lines.push(`export interface ${name}Response ${JSON.stringify(responseShape, null, 2).replace(/"/g, '')}`)
        lines.push('')
      } else {
        lines.push(`/** Response type for ${node.label} — add a Response Shape in the config panel */`)
        lines.push(`export interface ${name}Response {`)
        lines.push(`  // TODO: define response shape in the api-binding config panel`)
        lines.push(`}`)
        lines.push('')
      }
    }
  }

  // 2. State store slices
  const stores = canvas.nodes.filter(n => n.type === 'state-store')
  if (stores.length > 0) {
    lines.push('// ─── State Store Types ───────────────────────────────────────────────────────')
    lines.push('')
    for (const node of stores) {
      const d = node.data as unknown as Record<string, unknown>
      const name = pascalCase(node.label || 'Store')
      const slices = (d.slices as string[]) ?? []
      lines.push(`export interface ${name}State {`)
      for (const slice of slices) {
        lines.push(`  ${slice}: unknown // TODO: type this slice`)
      }
      if (slices.length === 0) lines.push(`  // TODO: define slices in the state-store config panel`)
      lines.push(`}`)
      lines.push('')
    }
  }

  // 3. Component props interfaces
  const components = canvas.nodes.filter(n =>
    n.type === 'component' || n.type === 'client-component' || n.type === 'server-component'
  )
  if (components.length > 0) {
    lines.push('// ─── Component Props ─────────────────────────────────────────────────────────')
    lines.push('')
    for (const node of components) {
      const d = node.data as unknown as Record<string, unknown>
      const name = pascalCase(node.label || 'Component')
      const props = (d.componentProps as Array<{ name: string; propType: string; required: boolean }>) ?? []
      const type = (d.componentType as string) ?? 'client'
      const isLazy = (d.lazyLoaded as boolean) ?? false
      const isMemo = (d.memoized as boolean) ?? false

      lines.push(`/** ${type === 'server' ? 'Server' : 'Client'} Component${isMemo ? ' (memoized)' : ''}${isLazy ? ' (lazy loaded)' : ''} */`)
      lines.push(`export interface ${name}Props {`)
      for (const p of props) {
        lines.push(`  ${p.name}${p.required ? '' : '?'}: ${p.propType}`)
      }
      if (props.length === 0) lines.push(`  // TODO: add props in the component config panel`)
      lines.push(`}`)
      lines.push('')
    }
  }

  // 4. Context value types
  const contexts = canvas.nodes.filter(n => n.type === 'context-provider')
  if (contexts.length > 0) {
    lines.push('// ─── Context Value Types ─────────────────────────────────────────────────────')
    lines.push('')
    for (const node of contexts) {
      const d = node.data as unknown as Record<string, unknown>
      const name = pascalCase(node.label || 'Context')
      const valueShape = (d.valueShape as string) ?? ''
      lines.push(`export type ${name}Value = ${valueShape || 'unknown // TODO: define value shape in config panel'}`)
      lines.push('')
    }
  }

  if (lines.length <= 4) {
    lines.push('// No typed nodes found in this UI design.')
    lines.push('// Add component, api-binding, state-store, or context-provider nodes to generate types.')
  }

  triggerDownload(lines.join('\n'), `${slug(title)}-types.ts`)
  log.session.info('TypeScript types exported', { nodes: canvas.nodes.length })
}

// ─── Folder structure export (UI mode) ────────────────────────────────────────

export function exportFolderStructure(canvas: Canvas, title: string): void {
  const framework = (canvas.nodes.find(n =>
    n.type === 'page' || n.type === 'screen'
  )?.data as unknown as Record<string, unknown>)?.framework as string ?? 'nextjs-app'

  const lines: string[] = [
    `# Folder Structure — ${title}`,
    `# Framework: ${framework}`,
    `# Generated by Systyfield — ${new Date().toISOString()}`,
    '',
  ]

  if (framework === 'nextjs-app') {
    lines.push('app/')
    const layouts = canvas.nodes.filter(n => n.type === 'layout')
    if (layouts.length > 0) {
      lines.push('  layout.tsx                   # Root layout')
      for (const node of layouts) {
        const d = node.data as unknown as Record<string, unknown>
        if (!d.wrapsAll) {
          const name = slug(node.label).replace(/-/g, '-')
          lines.push(`  (${name})/`)
          lines.push(`    layout.tsx               # ${node.label}`)
        }
      }
    }
    const pages = canvas.nodes.filter(n => n.type === 'page' || n.type === 'screen')
    for (const node of pages) {
      const d = node.data as unknown as Record<string, unknown>
      const path = ((d.path as string) ?? `/${slug(node.label)}`).replace(/^\//, '')
      const parts = path.split('/').filter(Boolean)
      const indent = '  ' + parts.map(() => '  ').join('')
      lines.push(`  ${path}/`)
      lines.push(`${indent}  page.tsx                 # ${node.label} (${(d.renderStrategy as string) ?? 'CSR'})`)
      if (d.authProtected) lines.push(`${indent}  # ⚠ auth-protected — wrap in auth guard`)
      const hasSuspense = (d.loadingBehavior as string) === 'Suspense'
      if (hasSuspense) lines.push(`${indent}  loading.tsx              # Suspense fallback`)
      if (d.hasErrorBoundary) lines.push(`${indent}  error.tsx               # Error boundary`)
    }
    lines.push('')
    const errorPages = canvas.nodes.filter(n => n.type === 'error-page')
    if (errorPages.length > 0) lines.push('  error.tsx                    # Global error boundary')
    const notFoundPages = canvas.nodes.filter(n => n.type === 'not-found-page')
    if (notFoundPages.length > 0) lines.push('  not-found.tsx                # 404 page')
    lines.push('')
    lines.push('components/')
    const comps = canvas.nodes.filter(n =>
      n.type === 'component' || n.type === 'client-component' || n.type === 'server-component'
    )
    for (const node of comps) {
      const d = node.data as unknown as Record<string, unknown>
      const isClient = (d.componentType as string) === 'client' || node.type === 'client-component'
      const name = pascalCase(node.label)
      const isLazy = (d.lazyLoaded as boolean) ?? false
      lines.push(`  ${name}.tsx${isClient ? "                 # 'use client'" : ''}${isLazy ? ' (lazy)' : ''}`)
    }
    lines.push('')
    lines.push('lib/')
    const fetchers = canvas.nodes.filter(n => n.type === 'data-fetcher' || n.type === 'api-binding')
    if (fetchers.length > 0) {
      lines.push('  api/')
      for (const node of fetchers) {
        lines.push(`    ${slug(node.label)}.ts`)
      }
    }
    const actions = canvas.nodes.filter(n => n.type === 'server-action')
    if (actions.length > 0) {
      lines.push('  actions/')
      for (const node of actions) {
        lines.push(`    ${slug(node.label)}.ts               # 'use server'`)
      }
    }
    const stores = canvas.nodes.filter(n => n.type === 'state-store')
    if (stores.length > 0) {
      lines.push('  store/')
      for (const node of stores) {
        lines.push(`    ${slug(node.label)}.ts`)
      }
    }
  } else if (framework === 'react-router') {
    lines.push('src/')
    lines.push('  routes/')
    const pages = canvas.nodes.filter(n => n.type === 'page' || n.type === 'screen')
    for (const node of pages) {
      const d = node.data as unknown as Record<string, unknown>
      const path = ((d.path as string) ?? `/${slug(node.label)}`).replace(/^\//, '')
      lines.push(`    ${path.replace(/\//g, '.') || 'index'}.tsx              # ${node.label}`)
    }
    lines.push('  components/')
    const comps = canvas.nodes.filter(n =>
      n.type === 'component' || n.type === 'client-component' || n.type === 'server-component'
    )
    for (const node of comps) {
      lines.push(`    ${pascalCase(node.label)}.tsx`)
    }
  }

  triggerDownload(lines.join('\n'), `${slug(title)}-folder-structure.md`)
  log.session.info('Folder structure exported')
}

// ─── Component scaffolding export (UI mode) ───────────────────────────────────

export function exportComponentScaffolds(canvas: Canvas, title: string): void {
  const files: Array<{ name: string; content: string }> = []

  const componentNodes = canvas.nodes.filter(n =>
    n.type === 'component' || n.type === 'client-component' || n.type === 'server-component'
  )

  for (const node of componentNodes) {
    const d = node.data as unknown as Record<string, unknown>
    const name = pascalCase(node.label || 'Component')
    const isClient = (d.componentType as string) === 'client' || node.type === 'client-component'
    const isLazy = (d.lazyLoaded as boolean) ?? false
    const isMemo = (d.memoized as boolean) ?? false
    const props = (d.componentProps as Array<{ name: string; propType: string; required: boolean }>) ?? []
    const usesHooks = (d.usesHooks as string[]) ?? []
    const renderCondition = d.renderCondition as string | undefined
    const notes = (node.data as unknown as Record<string, unknown>).notes as string | undefined

    const lines: string[] = []
    if (isClient) lines.push("'use client'", '')
    if (notes) lines.push(`/**`, ` * ${notes}`, ` */`, '')
    if (renderCondition) lines.push(`// Render condition: ${renderCondition}`, '')

    lines.push(`export interface ${name}Props {`)
    for (const p of props) {
      lines.push(`  ${p.name}${p.required ? '' : '?'}: ${p.propType}`)
    }
    lines.push(`}`, '')

    const hooksToImport = usesHooks.filter(h => ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext'].includes(h))
    if (hooksToImport.length > 0) {
      lines.push(`import { ${hooksToImport.join(', ')} } from 'react'`, '')
    }

    const propsParam = props.length > 0
      ? `{ ${props.map(p => p.name).join(', ')} }: ${name}Props`
      : `_props: ${name}Props`

    if (isMemo && !isLazy) lines.push(`import { memo } from 'react'`, '')

    lines.push(`function ${name}(${propsParam}) {`)
    lines.push(`  // TODO: implement`)
    lines.push(`  return (`)
    lines.push(`    <div>`)
    lines.push(`      {/* ${name} */}`)
    lines.push(`    </div>`)
    lines.push(`  )`)
    lines.push(`}`, '')

    if (isMemo) {
      lines.push(`export default memo(${name})`)
    } else {
      lines.push(`export default ${name}`)
    }

    files.push({ name: `${name}.tsx`, content: lines.join('\n') })
  }

  // Server actions
  const actionNodes = canvas.nodes.filter(n => n.type === 'server-action')
  for (const node of actionNodes) {
    const d = node.data as unknown as Record<string, unknown>
    const name = (d.name as string) || slug(node.label)
    const inputSchema = (d.inputSchema as string) || ''
    const revalidatesPath = (d.revalidatesPath as string) || ''
    const redirectsTo = (d.redirectsTo as string) || ''

    const lines: string[] = [
      "'use server'",
      '',
      `// Server Action: ${node.label}`,
      inputSchema ? `// Input: ${inputSchema}` : '',
      '',
      `export async function ${name}(formData: FormData) {`,
      `  // TODO: implement`,
      revalidatesPath ? `  // revalidatePath('${revalidatesPath}')` : '',
      redirectsTo ? `  // redirect('${redirectsTo}')` : '',
      `}`,
    ].filter(l => l !== undefined)

    files.push({ name: `actions/${name}.ts`, content: lines.join('\n') })
  }

  if (files.length === 0) {
    triggerDownload('// No component or server-action nodes found in this UI design.', `${slug(title)}-components.txt`)
    return
  }

  // Bundle all files into a single downloadable text with delimiters
  const combined = files.map(f =>
    `// ═══════════════════════════════════════════════════════\n// FILE: ${f.name}\n// ═══════════════════════════════════════════════════════\n\n${f.content}`
  ).join('\n\n\n')

  triggerDownload(combined, `${slug(title)}-component-scaffolds.tsx`)
  log.session.info('Component scaffolds exported', { count: files.length })
}

// ─── Route config export (UI mode) ────────────────────────────────────────────

export function exportRouteConfig(canvas: Canvas, title: string): void {
  const pageNodes = canvas.nodes.filter(n => n.type === 'page' || n.type === 'screen')
  const layoutNodes = canvas.nodes.filter(n => n.type === 'layout')
  const framework = (pageNodes[0]?.data as unknown as Record<string, unknown>)?.framework as string ?? 'nextjs-app'

  const lines: string[] = [
    `// Route configuration — ${title}`,
    `// Framework: ${framework}`,
    `// Generated by Systyfield — ${new Date().toISOString()}`,
    '',
  ]

  if (framework === 'react-router') {
    lines.push(`import { createBrowserRouter } from 'react-router-dom'`, '')
    // Import components
    for (const node of pageNodes) {
      const name = pascalCase(node.label)
      lines.push(`import ${name}Page from './routes/${slug(node.label)}'`)
    }
    for (const node of layoutNodes) {
      const name = pascalCase(node.label)
      lines.push(`import ${name} from './layouts/${slug(node.label)}'`)
    }
    lines.push('')
    lines.push(`export const router = createBrowserRouter([`)
    const rootLayout = layoutNodes.find(n => (n.data as unknown as Record<string, unknown>).wrapsAll)
    if (rootLayout) {
      lines.push(`  {`)
      lines.push(`    path: '/',`)
      lines.push(`    element: <${pascalCase(rootLayout.label)} />,`)
      lines.push(`    children: [`)
      for (const node of pageNodes) {
        const d = node.data as unknown as Record<string, unknown>
        const path = ((d.path as string) ?? `/${slug(node.label)}`).replace(/^\//, '')
        const name = pascalCase(node.label)
        const isProtected = (d.authProtected as boolean) ?? false
        lines.push(`      {`)
        lines.push(`        path: '${path}',`)
        lines.push(`        element: ${isProtected ? `<ProtectedRoute><${name}Page /></ProtectedRoute>` : `<${name}Page />`},`)
        lines.push(`      },`)
      }
      lines.push(`    ],`)
      lines.push(`  },`)
    } else {
      for (const node of pageNodes) {
        const d = node.data as unknown as Record<string, unknown>
        const path = ((d.path as string) ?? `/${slug(node.label)}`).replace(/^\//, '')
        const name = pascalCase(node.label)
        lines.push(`  { path: '${path}', element: <${name}Page /> },`)
      }
    }
    lines.push(`])`)
  } else if (framework === 'nextjs-app') {
    lines.push(`// Next.js App Router — routes defined by folder structure`)
    lines.push(`// Reference: https://nextjs.org/docs/app/building-your-application/routing`)
    lines.push('')
    lines.push(`export const routes = {`)
    for (const node of pageNodes) {
      const d = node.data as unknown as Record<string, unknown>
      const path = ((d.path as string) ?? `/${slug(node.label)}`)
      const name = slug(node.label).replace(/-/g, '_').toUpperCase()
      const strategy = (d.renderStrategy as string) ?? 'CSR'
      lines.push(`  ${name}: '${path}', // ${strategy}${(d.authProtected as boolean) ? ' — auth protected' : ''}`)
    }
    lines.push(`} as const`)
    lines.push('')
    lines.push(`export type Route = typeof routes[keyof typeof routes]`)
  }

  triggerDownload(lines.join('\n'), `${slug(title)}-routes.tsx`)
  log.session.info('Route config exported', { pages: pageNodes.length })
}

// ─── API client export (UI mode) ──────────────────────────────────────────────

export function exportApiClient(canvas: Canvas, title: string): void {
  const bindingNodes = canvas.nodes.filter(n => n.type === 'api-binding')

  const lines: string[] = [
    `// API Client — ${title}`,
    `// Generated by Systyfield — ${new Date().toISOString()}`,
    `// Typed fetch wrappers derived from api-binding nodes`,
    '',
    `const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''`,
    '',
    `async function apiFetch<T>(`,
    `  path: string,`,
    `  options?: RequestInit,`,
    `): Promise<T> {`,
    `  const res = await fetch(\`\${BASE_URL}\${path}\`, options)`,
    `  if (!res.ok) throw new Error(\`API error \${res.status}: \${path}\`)`,
    `  return res.json() as Promise<T>`,
    `}`,
    '',
  ]

  for (const node of bindingNodes) {
    const d = node.data as unknown as Record<string, unknown>
    const method = ((d.method as string) ?? 'GET').toUpperCase()
    const path = (d.path as string) ?? '/api/'
    const cacheStrategy = (d.cacheStrategy as string) ?? 'default'
    const revalidateSeconds = (d.revalidateSeconds as number) ?? 60
    const authHeader = (d.authHeader as string) ?? 'None'
    const name = `${method.toLowerCase()}${pascalCase(path.replace(/[^a-zA-Z0-9]/g, ' ').trim() || 'data')}`
    const returnType = `${pascalCase(node.label || 'data')}Response`

    lines.push(`/** ${method} ${path} */`)
    lines.push(`export async function ${name}(`)

    // Add path params as arguments
    const pathParams = path.match(/:([a-zA-Z]+)/g)?.map(p => p.slice(1)) ?? []
    if (pathParams.length > 0) {
      lines.push(`  params: { ${pathParams.map(p => `${p}: string`).join('; ')} },`)
    }
    if (method !== 'GET' && method !== 'DELETE') {
      lines.push(`  body: unknown,`)
    }
    lines.push(`): Promise<${returnType}> {`)

    let resolvedPath = `'${path}'`
    for (const param of pathParams) {
      resolvedPath = resolvedPath.replace(`:${param}`, `\${params.${param}}`)
    }
    if (pathParams.length > 0) resolvedPath = '`' + resolvedPath.slice(1, -1) + '`'

    const fetchOptions: string[] = []
    if (method !== 'GET') fetchOptions.push(`method: '${method}'`)
    if (method !== 'GET' && method !== 'DELETE') fetchOptions.push(`body: JSON.stringify(body)`, `headers: { 'Content-Type': 'application/json' }`)
    if (authHeader === 'Bearer token') fetchOptions.push(`// headers: { Authorization: 'Bearer ' + getToken() }`)
    if (cacheStrategy === 'force-cache') fetchOptions.push(`cache: 'force-cache'`)
    if (cacheStrategy === 'no-store') fetchOptions.push(`cache: 'no-store'`)
    if (cacheStrategy === 'revalidate') fetchOptions.push(`next: { revalidate: ${revalidateSeconds} }`)

    lines.push(`  return apiFetch<${returnType}>(${resolvedPath}${fetchOptions.length > 0 ? `, { ${fetchOptions.join(', ')} }` : ''})`)
    lines.push(`}`)
    lines.push('')
  }

  if (bindingNodes.length === 0) {
    lines.push(`// No api-binding nodes found in this UI design.`)
    lines.push(`// Add api-binding nodes to generate typed fetch functions.`)
  }

  triggerDownload(lines.join('\n'), `${slug(title)}-api-client.ts`)
  log.session.info('API client exported', { bindings: bindingNodes.length })
}
