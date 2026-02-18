import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ReactFlow, Background, Controls, MiniMap, BackgroundVariant, ReactFlowProvider, type NodeTypes } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Design, NodeType } from '@shared/types'
import { storageAdapter } from '@shared/services/storage-adapter'
import { BaseNode } from '@features/canvas/components/base-node'
import { NODE_TYPE_REGISTRY } from '@shared/constants'
import { ROUTES } from '@shared/constants'
import { cn } from '@shared/utils'

const NODE_TYPES: NodeTypes = {
  base: BaseNode as NodeTypes[string],
}

const MODE_COLORS: Record<string, string> = {
  system: 'bg-primary/10 text-primary border-primary/20',
  ui: 'bg-warning/10 text-warning border-warning/20',
  service: 'bg-success/10 text-success border-success/20',
}

function minimapNodeColor(nodeType: string | undefined): string {
  if (!nodeType) return 'var(--color-muted)'
  const def = NODE_TYPE_REGISTRY[nodeType as NodeType]
  if (!def) return 'var(--color-muted)'
  switch (def.category) {
    case 'Compute': return '#6366F1'
    case 'Networking': return '#06B6D4'
    case 'Security': return '#EF4444'
    case 'Storage': return '#10B981'
    case 'Messaging': return '#F59E0B'
    case 'Integrations': return '#8B5CF6'
    case 'Operations': return '#F97316'
    default: return 'var(--color-muted)'
  }
}

function ViewInner({ design }: { design: Design }) {
  const nodes = design.canvas.nodes.map(n => ({
    id: n.id,
    type: 'base' as const,
    position: n.position,
    data: {
      label: n.label,
      nodeType: n.type as NodeType,
      data: n.data,
      notes: n.notes,
      tags: n.tags,
      color: n.color,
      isSelected: false,
    },
  }))

  const edges = design.canvas.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'default' as const,
    label: e.label ?? '',
    animated: e.type === 'event',
    data: { label: e.label ?? '', edgeType: e.type ?? 'http', latencyMs: e.data?.latencyMs ?? 0 },
  }))

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Read-only header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2">
        <Link to={ROUTES.CANVAS.NEW} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="text-primary-foreground">
              <circle cx="3" cy="3" r="2" fill="currentColor" opacity="0.9" />
              <circle cx="11" cy="3" r="2" fill="currentColor" opacity="0.7" />
              <circle cx="3" cy="11" r="2" fill="currentColor" opacity="0.7" />
              <circle cx="11" cy="11" r="2" fill="currentColor" opacity="0.5" />
              <line x1="3" y1="3" x2="11" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3" y1="3" x2="3" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
        </Link>
        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize', MODE_COLORS[design.mode] ?? 'bg-muted text-muted-foreground border-border')}>
          {design.mode}
        </span>
        <span className="flex-1 text-sm font-semibold text-foreground truncate">{design.meta.title}</span>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Read-only view
        </div>
        <Link
          to={ROUTES.CANVAS.NEW}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Open editor
        </Link>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="var(--color-canvas-dot)" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={node => minimapNodeColor((node.data as { nodeType?: string }).nodeType)}
            maskColor="rgba(0,0,0,0.05)"
          />
        </ReactFlow>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 border-t border-border bg-card/80 px-4 py-1.5">
        <span className="text-[10px] text-muted-foreground">
          {nodes.length} node{nodes.length !== 1 ? 's' : ''} · {edges.length} connection{edges.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[10px] text-muted-foreground">·</span>
        <span className="text-[10px] text-muted-foreground">
          Last updated {new Date(design.meta.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

export function ViewPage() {
  const [params] = useSearchParams()
  const [design, setDesign] = useState<Design | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Option 1: ?d=<base64-encoded-JSON>
        const encoded = params.get('d')
        if (encoded) {
          const decoded = atob(encoded)
          const parsed = JSON.parse(decoded) as Design
          setDesign(parsed)
          return
        }

        // Option 2: ?id=<designId>
        const id = params.get('id')
        if (id) {
          const found = await storageAdapter.getDesign(id)
          if (found) {
            setDesign(found)
          } else {
            setError('Design not found')
          }
          return
        }

        setError('No design specified. Use ?id=<id> or ?d=<encoded>')
      } catch (err) {
        setError('Failed to load design: ' + (err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params])

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
        <Link
          to={ROUTES.CANVAS.NEW}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Open Editor
        </Link>
      </div>
    )
  }

  if (!design) return null

  return (
    <ReactFlowProvider>
      <ViewInner design={design} />
    </ReactFlowProvider>
  )
}
