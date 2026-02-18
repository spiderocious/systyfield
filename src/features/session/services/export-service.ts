import type { Design, Canvas } from '@shared/types'
import { log } from '@shared/utils'

// ─── JSON export ──────────────────────────────────────────────────────────────

export function exportDesignAsJson(design: Design): void {
  const json = JSON.stringify(design, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${design.meta.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.systyfield.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  log.session.info('Design exported as JSON', { id: design.id })
}

// ─── JSON import ──────────────────────────────────────────────────────────────

export function importDesignFromJson(file: File): Promise<Design> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const raw = ev.target?.result as string
        const parsed = JSON.parse(raw) as Design
        // Basic validation
        if (!parsed.id || !parsed.canvas || !parsed.meta) {
          reject(new Error('Invalid design file: missing required fields'))
          return
        }
        log.session.info('Design imported from JSON', { id: parsed.id, title: parsed.meta.title })
        resolve(parsed)
      } catch (err) {
        reject(new Error('Failed to parse JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// ─── CSV metrics export ────────────────────────────────────────────────────────

export interface MetricsRow {
  elapsedSec: number
  totalRps: number
  totalErrorRate: number
  avgLatencyP99: number
}

export function exportMetricsAsCsv(rows: MetricsRow[], designTitle: string): void {
  const header = 'elapsed_sec,total_rps,error_rate_pct,p99_latency_ms\n'
  const body = rows
    .map(r => `${r.elapsedSec},${r.totalRps.toFixed(1)},${(r.totalErrorRate * 100).toFixed(2)},${r.avgLatencyP99.toFixed(0)}`)
    .join('\n')
  const csv = header + body
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${designTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-metrics.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  log.session.info('Metrics exported as CSV', { rows: rows.length })
}

// ─── PNG canvas export ─────────────────────────────────────────────────────────

export async function exportCanvasAsPng(
  element: HTMLElement,
  designTitle: string
): Promise<void> {
  try {
    // Dynamic import of html-to-image (may not be installed yet — graceful fallback)
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: 'var(--background)',
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${designTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-canvas.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    log.session.info('Canvas exported as PNG', { title: designTitle })
  } catch (err) {
    log.session.error('PNG export failed (html-to-image may not be installed)', err)
    throw new Error('PNG export requires the html-to-image package. Run: npm install html-to-image')
  }
}

// ─── OpenAPI 3.0 export from service-mode graph ────────────────────────────────


export function exportOpenApiFromCanvas(canvas: Canvas, title: string): void {
  const paths: Record<string, Record<string, unknown>> = {}

  for (const node of canvas.nodes) {
    if (node.type !== 'api-endpoint') continue
    const d = node.data as {
      method?: string
      path?: string
      authRequired?: boolean
      requestBodyExample?: string
      statusCode?: number
    }
    const method = (d.method ?? 'GET').toLowerCase()
    const path = d.path ?? '/'
    const pathKey = path.startsWith('/') ? path : `/${path}`

    const operation: Record<string, unknown> = {
      operationId: `${method}${pathKey.replace(/\//g, '_').replace(/[^a-z0-9_]/gi, '')}`,
      summary: node.label,
      tags: [title],
      security: d.authRequired ? [{ bearerAuth: [] }] : [],
      responses: {
        [(d.statusCode ?? 200).toString()]: {
          description: 'Success',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    }

    if (d.requestBodyExample && method !== 'get') {
      let parsedBody: unknown = {}
      try { parsedBody = JSON.parse(d.requestBodyExample) } catch {}
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: parsedBody,
          },
        },
      }
    }

    if (!paths[pathKey]) paths[pathKey] = {}
    paths[pathKey][method] = operation
  }

  const openapi = {
    openapi: '3.0.3',
    info: { title, version: '1.0.0', description: `Generated from systyfield service design` },
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  }

  const json = JSON.stringify(openapi, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-openapi.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  log.session.info('OpenAPI spec exported', { paths: Object.keys(paths).length })
}

// ─── TypeScript types export from UI-mode graph ────────────────────────────────

export function exportTypescriptFromCanvas(canvas: Canvas, title: string): void {
  const lines: string[] = [
    `// Generated from systyfield UI design: ${title}`,
    `// ${new Date().toISOString()}`,
    '',
  ]

  for (const node of canvas.nodes) {
    if (node.type !== 'component') continue
    const d = node.data as { componentType?: string; componentProps?: Array<{ name: string; type: string; required: boolean }> }
    const componentName = node.label.replace(/\s+/g, '')
    const props = d.componentProps ?? []

    lines.push(`export interface ${componentName}Props {`)
    for (const p of props) {
      lines.push(`  ${p.name}${p.required ? '' : '?'}: ${p.type};`)
    }
    lines.push('}')
    lines.push('')
  }

  if (lines.length <= 3) {
    lines.push('// No component nodes found in UI design')
    lines.push('// Add component nodes to generate TypeScript interfaces')
  }

  const ts = lines.join('\n')
  const blob = new Blob([ts], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-types.ts`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  log.session.info('TypeScript types exported', { components: canvas.nodes.filter(n => n.type === 'component').length })
}
