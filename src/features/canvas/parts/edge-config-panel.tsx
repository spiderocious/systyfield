import { X, Trash2, ArrowLeftRight, Route } from '@shared/ui/icons'
import { cn } from '@shared/utils'
import type { CanvasEdge } from '../hooks'
import type { CanvasNode } from '../types'

interface EdgeConfigPanelProps {
  edge: CanvasEdge
  nodes?: CanvasNode[]
  onClose: () => void
  onUpdateEdge: (edgeId: string, updates: Partial<{ label: string; edgeType: string; latencyMs: number; color: string | undefined }>) => void
  onRemoveEdge: (edgeId: string) => void
  onReverseEdge?: (edgeId: string) => void
  onRepointEdge?: (edgeId: string, updates: { source?: string; target?: string }) => void
}

const EDGE_TYPES = [
  { value: 'http',             label: 'HTTP / REST',      color: '#6366F1', dashed: false },
  { value: 'grpc',             label: 'gRPC',              color: '#8B5CF6', dashed: false },
  { value: 'event',            label: 'Event / Async',     color: '#F59E0B', dashed: true  },
  { value: 'sql',              label: 'SQL / DB Query',    color: '#10B981', dashed: false },
  { value: 'graphql',          label: 'GraphQL',            color: '#EC4899', dashed: false },
  { value: 'websocket',        label: 'WebSocket',          color: '#06B6D4', dashed: true  },
  { value: 'navigation',       label: 'Navigation',         color: '#F97316', dashed: true  },
  { value: 'state-flow',       label: 'State Flow',         color: '#0EA5E9', dashed: false },
  { value: 'redirect',         label: 'Redirect',           color: '#F97316', dashed: true  },
  { value: 'modal-trigger',    label: 'Modal Trigger',      color: '#A855F7', dashed: true  },
  // Behavioral / flow edges
  { value: 'condition-true',   label: 'Condition: True',    color: '#10B981', dashed: false },
  { value: 'condition-false',  label: 'Condition: False',   color: '#EF4444', dashed: true  },
  { value: 'flag-on',          label: 'Flag: On',           color: '#10B981', dashed: false },
  { value: 'flag-off',         label: 'Flag: Off',          color: '#EF4444', dashed: true  },
  { value: 'on-success',       label: 'On Success',         color: '#10B981', dashed: false },
  { value: 'on-error',         label: 'On Error',           color: '#EF4444', dashed: true  },
  { value: 'navigates-to',     label: 'Navigates To',       color: '#F97316', dashed: true  },
  { value: 'triggers',         label: 'Triggers',           color: '#A855F7', dashed: true  },
  { value: 'wraps',            label: 'Wraps / Contains',   color: '#6B7280', dashed: true  },
  { value: 'default',          label: 'Generic',            color: '#6B7280', dashed: false },
]

const COLOR_SWATCHES = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#3B82F6',
  '#F97316', '#84CC16', '#6B7280', '#D97706',
]

export function EdgeConfigPanel({
  edge,
  nodes = [],
  onClose,
  onUpdateEdge,
  onRemoveEdge,
  onReverseEdge,
  onRepointEdge,
}: EdgeConfigPanelProps) {
  const edgeData     = (edge.data ?? {}) as { label?: string; edgeType?: string; latencyMs?: number; color?: string }
  const currentType  = edgeData.edgeType ?? 'http'
  const currentLabel = edgeData.label ?? (typeof edge.label === 'string' ? edge.label : '') ?? ''
  const currentLatency = edgeData.latencyMs ?? 0
  const currentColor = edgeData.color
  const typeDef      = EDGE_TYPES.find(t => t.value === currentType) ?? EDGE_TYPES[0]

  // Resolved display color: custom override or type default
  const displayColor = currentColor ?? typeDef.color

  const sourceNode = nodes.find(n => n.id === edge.source)
  const targetNode = nodes.find(n => n.id === edge.target)

  const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20'

  return (
    <div className="flex h-full w-72 flex-col border-l border-border bg-card">
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b border-border px-4 py-3"
        style={{ backgroundColor: `color-mix(in srgb, ${displayColor} 8%, transparent)` }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: displayColor }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Connection</p>
          <p className="text-xs text-muted-foreground truncate">{typeDef.label}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          {onReverseEdge && (
            <button
              type="button"
              onClick={() => onReverseEdge(edge.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-muted/80"
              title="Swap source and target"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Reverse
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemoveEdge(edge.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
            title="Delete this connection"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>

        {/* Connection type */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">Connection Type</label>
          <div className="grid grid-cols-2 gap-1.5">
            {EDGE_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => onUpdateEdge(edge.id, { edgeType: t.value })}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all text-left',
                  currentType === t.value
                    ? 'border-transparent text-white'
                    : 'border-border text-foreground hover:border-primary/30 hover:bg-muted'
                )}
                style={currentType === t.value ? { backgroundColor: t.color } : {}}
              >
                <div
                  className="h-0 w-4 shrink-0"
                  style={{ borderTop: `2px ${t.dashed ? 'dashed' : 'solid'} ${currentType === t.value ? 'white' : t.color}` }}
                />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color override */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">Color Override</label>
            {currentColor && (
              <button
                type="button"
                onClick={() => onUpdateEdge(edge.id, { color: undefined })}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset to type default
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {COLOR_SWATCHES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => onUpdateEdge(edge.id, { color: currentColor === c ? undefined : c })}
                className={cn(
                  'h-5 w-5 rounded-full border-2 transition-all',
                  currentColor === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Repoint: change source / target */}
        {onRepointEdge && nodes.length > 0 && (
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Route className="h-3.5 w-3.5 text-muted-foreground" />
              Repoint Connection
            </label>
            <div className="space-y-1.5">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From</span>
                <select
                  value={edge.source}
                  onChange={e => onRepointEdge(edge.id, { source: e.target.value })}
                  className={cn(inputClass, 'text-xs cursor-pointer')}
                >
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.data.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">To</span>
                <select
                  value={edge.target}
                  onChange={e => onRepointEdge(edge.id, { target: e.target.value })}
                  className={cn(inputClass, 'text-xs cursor-pointer')}
                >
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.data.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Label */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Label</label>
          <input
            type="text"
            value={currentLabel}
            onChange={e => onUpdateEdge(edge.id, { label: e.target.value })}
            placeholder="REST, gRPC, Kafka event..."
            className={inputClass}
          />
          <p className="text-[10px] text-muted-foreground">Shown as a floating label on the connection</p>
        </div>

        {/* Latency */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">Expected Latency</label>
            <span className="text-[10px] font-mono text-muted-foreground">{currentLatency > 0 ? `${currentLatency}ms` : 'Auto'}</span>
          </div>
          <input
            type="range"
            min={0}
            max={2000}
            step={5}
            value={currentLatency}
            onChange={e => onUpdateEdge(edge.id, { latencyMs: Number(e.target.value) })}
            className="w-full accent-primary"
          />
          <p className="text-[10px] text-muted-foreground">Used in simulation for path-aware latency. 0 = auto-detect from type.</p>
        </div>

        {/* Connection info */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Connection Info</p>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground truncate max-w-[44%]">
              {sourceNode?.data.label ?? edge.source.slice(0, 8) + '…'}
            </span>
            <svg width="16" height="10" viewBox="0 0 16 10" className="shrink-0 text-muted-foreground">
              <line x1="0" y1="5" x2="12" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <polyline points="8 1 13 5 8 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground truncate max-w-[44%]">
              {targetNode?.data.label ?? edge.target.slice(0, 8) + '…'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
