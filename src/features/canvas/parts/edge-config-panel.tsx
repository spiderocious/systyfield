import { X, Trash2 } from '@shared/ui/icons'
import { cn } from '@shared/utils'
import type { CanvasEdge } from '../hooks'

interface EdgeConfigPanelProps {
  edge: CanvasEdge
  onClose: () => void
  onUpdateEdge: (edgeId: string, updates: Partial<{ label: string; edgeType: string; latencyMs: number }>) => void
  onRemoveEdge: (edgeId: string) => void
}

const EDGE_TYPES = [
  { value: 'http', label: 'HTTP / REST', color: '#6366F1', dashed: false },
  { value: 'grpc', label: 'gRPC', color: '#8B5CF6', dashed: false },
  { value: 'event', label: 'Event / Async', color: '#F59E0B', dashed: true },
  { value: 'sql', label: 'SQL / DB Query', color: '#10B981', dashed: false },
  { value: 'graphql', label: 'GraphQL', color: '#EC4899', dashed: false },
  { value: 'websocket', label: 'WebSocket', color: '#06B6D4', dashed: true },
  { value: 'navigation', label: 'Navigation', color: '#F97316', dashed: true },
  { value: 'default', label: 'Generic', color: '#6B7280', dashed: false },
]

export function EdgeConfigPanel({ edge, onClose, onUpdateEdge, onRemoveEdge }: EdgeConfigPanelProps) {
  const edgeData = (edge.data ?? {}) as { label?: string; edgeType?: string; latencyMs?: number }
  const currentType = edgeData.edgeType ?? 'http'
  const currentLabel = edgeData.label ?? (typeof edge.label === 'string' ? edge.label : '') ?? ''
  const currentLatency = edgeData.latencyMs ?? 0
  const typeDef = EDGE_TYPES.find(t => t.value === currentType) ?? EDGE_TYPES[0]

  const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20'

  return (
    <div className="flex h-full w-72 flex-col border-l border-border bg-card">
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b border-border px-4 py-3"
        style={{ backgroundColor: `color-mix(in srgb, ${typeDef.color} 8%, transparent)` }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: typeDef.color }}
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
        {/* Edge type */}
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
                  style={{
                    borderTop: `2px ${t.dashed ? 'dashed' : 'solid'} ${currentType === t.value ? 'white' : t.color}`,
                  }}
                />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

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
          <p className="text-[10px] text-muted-foreground">Used in simulation for path-aware latency calculation. 0 = auto-detect from type.</p>
        </div>

        {/* Connection info */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Connection Info</p>
          <div className="text-[11px] font-mono text-muted-foreground">
            <span className="text-foreground">{edge.source.slice(0, 8)}…</span>
            {' → '}
            <span className="text-foreground">{edge.target.slice(0, 8)}…</span>
          </div>
        </div>
      </div>

      {/* Delete footer */}
      <div className="border-t border-border p-4">
        <button
          onClick={() => {
            onRemoveEdge(edge.id)
            onClose()
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove connection
        </button>
      </div>
    </div>
  )
}
