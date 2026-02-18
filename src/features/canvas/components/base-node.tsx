import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position } from '@xyflow/react'
import type { CanvasNodeProps } from '../types'
import { NODE_TYPE_REGISTRY } from '@shared/constants'
import { cn } from '@shared/utils'
import * as Icons from '@shared/ui/icons'
import type { LucideIcon } from '@shared/ui/icons'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRps(rps: number): string {
  if (rps >= 1000) return `${(rps / 1000).toFixed(1)}k`
  return `${Math.round(rps)}`
}

function fmtMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

// ─── Status ring colors ────────────────────────────────────────────────────────

const SIM_STATUS_RING: Record<string, string> = {
  healthy:  'ring-2 ring-success/60 shadow-lg shadow-success/20',
  degraded: 'ring-2 ring-warning/60 shadow-lg shadow-warning/20',
  failing:  'ring-2 ring-destructive/60 shadow-lg shadow-destructive/20',
  down:     'ring-2 ring-destructive border-destructive/60 opacity-60',
  idle: '',
}

const SIM_STATUS_DOT: Record<string, string> = {
  healthy:  'bg-success',
  degraded: 'bg-warning',
  failing:  'bg-destructive animate-pulse',
  down:     'bg-destructive',
}

const SIM_STATUS_LABEL: Record<string, string> = {
  healthy: 'Healthy', degraded: 'Degraded', failing: 'Failing', down: 'Down', idle: 'Idle',
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function NodeStatusBadge({ errorRate, loadFactor, simStatus }: {
  errorRate?: number; loadFactor?: number; simStatus?: string
}) {
  if (simStatus && simStatus !== 'idle' && simStatus in SIM_STATUS_DOT) {
    return (
      <div className="absolute -top-1.5 -right-1.5 z-20">
        <span className={cn('flex h-3 w-3 rounded-full border border-card', SIM_STATUS_DOT[simStatus])} />
      </div>
    )
  }
  const hasError = (errorRate ?? 0) > 0.05
  const highLoad = (loadFactor ?? 0) > 0.8
  if (!hasError && !highLoad) return null
  return (
    <div className="absolute -top-1.5 -right-1.5 z-20 flex gap-1">
      {hasError && <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">!</span>}
      {highLoad && <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-warning text-[8px] font-bold text-warning-foreground">↑</span>}
    </div>
  )
}

// ─── Screen wireframe ──────────────────────────────────────────────────────────

function ScreenWireframe() {
  return (
    <div className="mx-3 mb-2 mt-1 rounded-lg border border-dashed border-border bg-muted/30 p-2 space-y-1.5">
      <div className="flex items-center gap-1">
        <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
        <div className="ml-auto h-1 w-4 rounded-full bg-muted-foreground/20" />
      </div>
      <div className="h-2.5 w-full rounded bg-muted-foreground/20" />
      <div className="space-y-1">
        <div className="h-1.5 w-3/4 rounded-full bg-muted-foreground/15" />
        <div className="h-1.5 w-1/2 rounded-full bg-muted-foreground/10" />
        <div className="h-1.5 w-2/3 rounded-full bg-muted-foreground/15" />
      </div>
      <div className="h-2.5 w-1/3 rounded bg-primary/30" />
    </div>
  )
}

// ─── Hover metrics tooltip (shown on node hover during simulation) ─────────────

function SimMetricsTooltip({ rps, latencyP99, errorRate, loadFactor, simStatus, colorVar }: {
  rps?: number; latencyP99?: number; errorRate?: number
  loadFactor?: number; simStatus?: string; colorVar: string
}) {
  const statusLabel = simStatus ? (SIM_STATUS_LABEL[simStatus] ?? 'Running') : 'Running'
  const statusCls = simStatus === 'failing' || simStatus === 'down'
    ? 'text-destructive'
    : simStatus === 'degraded' ? 'text-warning' : 'text-success'

  return (
    <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 shadow-2xl whitespace-nowrap">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorVar }} />
          <span className={cn('text-[10px] font-bold', statusCls)}>{statusLabel}</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <span className="text-[10px] text-muted-foreground">
          RPS <span className="font-mono font-bold text-foreground">{fmtRps(rps ?? 0)}</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          p99 <span className="font-mono font-bold text-foreground">{fmtMs(latencyP99 ?? 0)}</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          err <span className={cn('font-mono font-bold', (errorRate ?? 0) > 0.05 ? 'text-destructive' : 'text-success')}>
            {((errorRate ?? 0) * 100).toFixed(1)}%
          </span>
        </span>
        {loadFactor !== undefined && (
          <span className="text-[10px] text-muted-foreground">
            cpu <span className={cn('font-mono font-bold', loadFactor > 0.8 ? 'text-destructive' : 'text-foreground')}>
              {Math.round(loadFactor * 100)}%
            </span>
          </span>
        )}
      </div>
      <div className="flex justify-center -mt-0.5">
        <div className="h-2 w-2 rotate-45 border-b border-r border-border bg-card" />
      </div>
    </div>
  )
}

// ─── Replica expand modal ─────────────────────────────────────────────────────

function ReplicaModal({ label, replicas, colorVar, isSimulating, rps, errorRate, loadFactor, onClose }: {
  label: string; replicas: number; colorVar: string
  isSimulating?: boolean; rps?: number; errorRate?: number; loadFactor?: number
  onClose: () => void
}) {
  const perRps = (rps ?? 0) / replicas
  const err = errorRate ?? 0
  const load = loadFactor ?? 0

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[500px] max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">{label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{replicas} replica{replicas !== 1 ? 's' : ''} running</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Icons.X className="h-4 w-4" />
          </button>
        </div>

        {/* Replica grid */}
        <div className="p-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: replicas }, (_, i) => {
            const v = (Math.sin(i * 2.1 + 0.7) + 1) / 2  // stable variance 0..1
            const repRps   = isSimulating ? perRps * (0.75 + v * 0.5) : 0
            const repLoad  = isSimulating ? Math.min(load * (0.7 + v * 0.45), 1) : 0
            const repErr   = isSimulating && err > 0 ? Math.min(err * (0.6 + v * 0.8), 1) : 0
            const repSt    = repErr > 0.2 ? 'failing' : repErr > 0.05 ? 'degraded'
              : repLoad > 0.8 ? 'degraded' : isSimulating ? 'healthy' : 'idle'

            return (
              <div key={i} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md text-white text-[9px] font-bold shrink-0" style={{ backgroundColor: colorVar }}>
                    {i + 1}
                  </div>
                  <span className="text-[10px] font-semibold text-foreground truncate">pod-{String(i + 1).padStart(2, '0')}</span>
                  {isSimulating && (
                    <span className={cn('ml-auto flex h-2 w-2 rounded-full shrink-0', SIM_STATUS_DOT[repSt] ?? 'bg-muted')} />
                  )}
                </div>

                {isSimulating ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-muted-foreground w-7 shrink-0">CPU</span>
                      <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${Math.min(repLoad * 100, 100)}%`,
                          backgroundColor: repLoad > 0.8 ? 'var(--color-destructive)' : repLoad > 0.6 ? 'var(--color-warning)' : 'var(--color-success)',
                        }} />
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground w-7 text-right shrink-0">{Math.round(repLoad * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-muted-foreground">RPS</span>
                      <span className="font-mono font-bold text-foreground">{fmtRps(repRps)}</span>
                    </div>
                    {repErr > 0 && (
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-muted-foreground">Err</span>
                        <span className="font-mono font-bold text-destructive">{(repErr * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[9px] text-muted-foreground">Standby</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Aggregate footer */}
        {isSimulating && (
          <div className="border-t border-border px-5 py-3 flex items-center gap-4">
            <span className="text-[10px] font-semibold text-muted-foreground">Totals</span>
            <span className="text-[10px] text-muted-foreground">
              RPS <span className="font-mono font-bold text-foreground">{fmtRps(rps ?? 0)}</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              Err <span className={cn('font-mono font-bold', err > 0.05 ? 'text-destructive' : 'text-success')}>{(err * 100).toFixed(1)}%</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              Avg CPU <span className={cn('font-mono font-bold', load > 0.8 ? 'text-destructive' : 'text-foreground')}>{Math.round(load * 100)}%</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main BaseNode ─────────────────────────────────────────────────────────────

export function BaseNode({ data, selected }: CanvasNodeProps) {
  const [showMetrics, setShowMetrics] = useState(false)
  const [showReplicas, setShowReplicas] = useState(false)

  const { label, nodeType, isSimulating, errorRate, loadFactor, simStatus, color, rps, latencyP99 } = data
  const def = NODE_TYPE_REGISTRY[nodeType]
  if (!def) return null

  const IconComponent = (Icons as Record<string, LucideIcon>)[def.icon] ?? Icons.Server
  const colorVar = color ?? `var(${def.colorVar})`

  // Replica stacking — max 4 ghost cards (= 5 total visible)
  const replicas = (data.data as { replicas?: number }).replicas ?? 1
  const stackCount = Math.min(replicas - 1, 4)

  // Screen node
  const imageUrl = nodeType === 'screen' ? (data.data as { imageUrl?: string }).imageUrl : undefined
  const showWireframe = nodeType === 'screen' && !imageUrl

  // Status ring
  const statusRing = simStatus && simStatus !== 'idle' ? (SIM_STATUS_RING[simStatus] ?? '') : ''

  return (
    <div
      className="relative"
      onMouseEnter={() => { if (isSimulating) setShowMetrics(true) }}
      onMouseLeave={() => setShowMetrics(false)}
    >
      {/* Ghost replica cards (book-stack effect, lower z-index, peeking behind) */}
      {stackCount > 0 && Array.from({ length: stackCount }, (_, i) => {
        const depth = stackCount - i
        return (
          <div
            key={i}
            className="absolute inset-0 rounded-xl border border-border bg-card"
            style={{
              transform: `translate(${depth * 3}px, ${depth * 4}px)`,
              zIndex: -depth,
              opacity: 1 - depth * 0.15,
            }}
          />
        )
      })}

      {/* Hover metrics tooltip */}
      {showMetrics && isSimulating && (
        <SimMetricsTooltip
          rps={rps} latencyP99={latencyP99} errorRate={errorRate}
          loadFactor={loadFactor} simStatus={simStatus} colorVar={colorVar}
        />
      )}

      {/* Main card */}
      <div className={cn(
        'relative z-10 min-w-[140px] rounded-xl border bg-card shadow-sm transition-all',
        selected
          ? 'border-primary shadow-md shadow-primary/20 ring-2 ring-primary/30'
          : statusRing
            ? cn('border-border', statusRing)
            : 'border-border hover:border-primary/40 hover:shadow-md'
      )}>
        <NodeStatusBadge errorRate={errorRate} loadFactor={loadFactor} simStatus={simStatus} />

        {/* Replica badge */}
        {replicas > 1 && (
          <button
            type="button"
            title={`${replicas} replicas — click to expand`}
            onClick={e => { e.stopPropagation(); setShowReplicas(true) }}
            className="absolute -top-2 -left-2 z-20 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md transition-transform hover:scale-110 active:scale-95"
            style={{ backgroundColor: colorVar }}
          >
            ×{replicas}
          </button>
        )}

        {/* Header */}
        <div
          className="flex items-center gap-2 rounded-t-xl px-3 py-2"
          style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 12%, transparent)` }}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: colorVar }}>
            <IconComponent className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground leading-tight">{label}</p>
            <p className="text-[10px] font-medium" style={{ color: colorVar }}>{def.label}</p>
          </div>
        </div>

        {/* Screen image */}
        {imageUrl && (
          <div className="overflow-hidden rounded-b-xl border-t border-border">
            <img src={imageUrl} alt={label} className="w-full object-cover max-h-32" />
          </div>
        )}

        {/* Screen wireframe */}
        {showWireframe && <ScreenWireframe />}

        {/* Simulation load bar */}
        {isSimulating && loadFactor !== undefined && (
          <div className="border-t border-border px-3 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">load</span>
              <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(loadFactor * 100, 100)}%`,
                    backgroundColor: loadFactor > 0.8
                      ? 'var(--color-destructive)'
                      : loadFactor > 0.6 ? 'var(--color-warning)' : 'var(--color-success)',
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{Math.round(loadFactor * 100)}%</span>
            </div>
            {(errorRate ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">err</span>
                <span className="text-[10px] font-mono text-destructive">{((errorRate ?? 0) * 100).toFixed(1)}%</span>
              </div>
            )}
            {(rps ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">rps</span>
                <span className="text-[10px] font-mono text-foreground">{fmtRps(rps ?? 0)}</span>
              </div>
            )}
          </div>
        )}

        <Handle type="target" position={Position.Left}
          className="!h-3 !w-3 !rounded-full !border-2 !border-card"
          style={{ backgroundColor: colorVar }}
        />
        <Handle type="source" position={Position.Right}
          className="!h-3 !w-3 !rounded-full !border-2 !border-card"
          style={{ backgroundColor: colorVar }}
        />
      </div>

      {/* Replica expand modal (portalled to body to escape transform context) */}
      {showReplicas && replicas > 1 && createPortal(
        <ReplicaModal
          label={label} replicas={replicas} colorVar={colorVar}
          isSimulating={isSimulating} rps={rps} errorRate={errorRate} loadFactor={loadFactor}
          onClose={() => setShowReplicas(false)}
        />,
        document.body,
      )}
    </div>
  )
}
