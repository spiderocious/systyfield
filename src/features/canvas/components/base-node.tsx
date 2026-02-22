import { useState, useContext } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position } from '@xyflow/react'
import type { CanvasNodeProps } from '../types'
import { NODE_TYPE_REGISTRY } from '@shared/constants'
import { cn } from '@shared/utils'
import * as Icons from '@shared/ui/icons'
import type { LucideIcon } from '@shared/ui/icons'
import { CinematicContext } from '../context/cinematic-context'

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

// ─── Rendering strategy helpers ────────────────────────────────────────────────

const STRATEGY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CSR:  { bg: '#F97316', text: 'white', border: '#EA580C' },
  SSR:  { bg: '#3B82F6', text: 'white', border: '#2563EB' },
  SSG:  { bg: '#10B981', text: 'white', border: '#059669' },
  ISR:  { bg: '#A855F7', text: 'white', border: '#9333EA' },
}

const STRATEGY_TINT: Record<string, string> = {
  CSR: 'rgba(249,115,22,0.06)',
  SSR: 'rgba(59,130,246,0.06)',
  SSG: 'rgba(16,185,129,0.06)',
  ISR: 'rgba(168,85,247,0.06)',
}

// ─── Device frame for screen / page nodes ─────────────────────────────────────

function DeviceFrame({ size }: { size: 'mobile' | 'tablet' | 'desktop' | undefined }) {
  if (size === 'mobile') {
    return (
      <div className="mx-2 mb-2 flex items-center justify-center">
        <div className="relative rounded-[8px] border-2 border-muted-foreground/25 bg-muted/20 px-1.5 py-2 w-[52px]" style={{ minHeight: 36 }}>
          <div className="mx-auto mb-1 h-1 w-5 rounded-full bg-muted-foreground/30" />
          <div className="space-y-0.5">
            <div className="h-1 w-full rounded-full bg-muted-foreground/15" />
            <div className="h-1 w-3/4 rounded-full bg-muted-foreground/10" />
          </div>
          <div className="mx-auto mt-1.5 h-2 w-2 rounded-full border border-muted-foreground/20" />
        </div>
      </div>
    )
  }
  if (size === 'tablet') {
    return (
      <div className="mx-2 mb-2 flex items-center justify-center">
        <div className="relative rounded-[6px] border-2 border-muted-foreground/25 bg-muted/20 px-1.5 py-2 w-[68px]" style={{ minHeight: 42 }}>
          <div className="space-y-0.5">
            <div className="flex gap-0.5 mb-0.5">
              <div className="h-1 w-8 rounded-full bg-muted-foreground/20" />
              <div className="ml-auto h-1 w-3 rounded-full bg-muted-foreground/15" />
            </div>
            <div className="h-1 w-full rounded-full bg-muted-foreground/15" />
            <div className="h-1 w-2/3 rounded-full bg-muted-foreground/10" />
          </div>
          <div className="mx-auto mt-1.5 h-1.5 w-4 rounded-full bg-muted-foreground/20" />
        </div>
      </div>
    )
  }
  // desktop (default)
  return (
    <div className="mx-2 mb-2 flex flex-col items-center">
      <div className="rounded-[4px] border-2 border-muted-foreground/25 bg-muted/20 p-1.5 w-full">
        <div className="space-y-0.5">
          <div className="flex gap-0.5 mb-0.5">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
            <div className="ml-auto flex gap-0.5">
              {[0,1,2].map(i => <div key={i} className="h-1 w-1 rounded-full bg-muted-foreground/15" />)}
            </div>
          </div>
          <div className="h-1 w-full rounded-full bg-muted-foreground/15" />
          <div className="h-1 w-3/4 rounded-full bg-muted-foreground/10" />
          <div className="h-1 w-1/2 rounded-full bg-muted-foreground/10" />
        </div>
      </div>
      <div className="w-6 h-1 bg-muted-foreground/20 rounded-b" />
      <div className="w-10 h-0.5 bg-muted-foreground/20 rounded" />
    </div>
  )
}

// ─── Main BaseNode ─────────────────────────────────────────────────────────────

export function BaseNode({ data, selected, id }: CanvasNodeProps) {
  const [showMetrics, setShowMetrics] = useState(false)
  const [showReplicas, setShowReplicas] = useState(false)
  const { cinematicMode, focusNodeId } = useContext(CinematicContext)
  const isCinematicFocus = cinematicMode && focusNodeId === id
  const isCinematicDimmed = cinematicMode && focusNodeId !== null && focusNodeId !== id

  const { label, nodeType, isSimulating, errorRate, loadFactor, simStatus, color, rps, latencyP99 } = data
  const def = NODE_TYPE_REGISTRY[nodeType]
  if (!def) return null

  const IconComponent = (Icons as Record<string, LucideIcon>)[def.icon] ?? Icons.Server
  const colorVar = color ?? `var(${def.colorVar})`

  // Replica stacking — max 4 ghost cards (= 5 total visible)
  const replicas = (data.data as { replicas?: number }).replicas ?? 1
  const stackCount = Math.min(replicas - 1, 4)

  // Screen / page node data
  const nodeDataRaw = data.data as unknown as Record<string, unknown>
  const isScreenLike = nodeType === 'screen' || nodeType === 'page' || nodeType === 'layout' || nodeType === 'modal'
  const imageUrl = (nodeType === 'screen' || nodeType === 'page') ? (nodeDataRaw.imageUrl as string | undefined) : undefined
  const showWireframe = (nodeType === 'screen' || nodeType === 'page') && !imageUrl
  const screenSize = (nodeDataRaw.screenSize as 'mobile' | 'tablet' | 'desktop' | undefined) ?? 'desktop'
  const renderStrategy = nodeDataRaw.renderStrategy as string | undefined
  const routePath = nodeDataRaw.path as string | undefined

  // Rendering strategy tint for the card background
  const strategyTint = renderStrategy ? STRATEGY_TINT[renderStrategy] : undefined
  const strategyColor = renderStrategy ? STRATEGY_COLORS[renderStrategy] : undefined

  // Component type badge
  const componentType = nodeDataRaw.componentType as string | undefined
  const isServerComponent = nodeType === 'server-component' || componentType === 'server'
  const isClientComponent = nodeType === 'client-component' || componentType === 'client'
  const isLazy = (nodeDataRaw.lazyLoaded as boolean | undefined) ?? false
  const isMemo = (nodeDataRaw.memoized as boolean | undefined) ?? false

  // Behavioral node data
  const isFlowActive = (nodeDataRaw.isActive as boolean | undefined) ?? false
  const responseBranches = Array.isArray(nodeDataRaw.responseBranches)
    ? (nodeDataRaw.responseBranches as Array<{ value: string; label: string; statusCode?: number }>)
    : []
  const selectedBranch = nodeDataRaw.selectedBranch as string | undefined
  const apiEndpoint = nodeDataRaw.endpoint as string | undefined
  const apiMethod = nodeDataRaw.method as string | undefined
  const intervalMs = nodeDataRaw.intervalMs as number | undefined
  const pollingCycle = nodeDataRaw.pollingCycle as number | undefined
  const navRoute = nodeDataRaw.route as string | undefined
  const navStrategy = nodeDataRaw.strategy as string | undefined
  const exposedMethods = nodeDataRaw.exposedMethods as string[] | undefined
  const stateName = nodeDataRaw.stateName as string | undefined
  const isTerminalState = (nodeDataRaw.isTerminal as boolean | undefined) ?? false

  // Status ring
  const statusRing = simStatus && simStatus !== 'idle' ? (SIM_STATUS_RING[simStatus] ?? '') : ''

  // ─── Diamond gate early return (decision-gate & feature-flag-gate) ───────────

  if (nodeType === 'decision-gate' || nodeType === 'feature-flag-gate') {
    const isDecision = nodeType === 'decision-gate'
    const condition = nodeDataRaw.condition as string | undefined
    const flagName = nodeDataRaw.flagName as string | undefined
    const trueLabel = (nodeDataRaw.trueLabel ?? nodeDataRaw.onLabel ?? 'Yes') as string
    const falseLabel = (nodeDataRaw.falseLabel ?? nodeDataRaw.offLabel ?? 'No') as string
    const rollout = nodeDataRaw.rolloutPercent as number | undefined
    const gateColor = isDecision ? '#6366F1' : '#F59E0B'

    return (
      <div
        className={cn('relative group flex items-center justify-center transition-opacity duration-500', isCinematicDimmed && 'opacity-30')}
        style={{ width: 148, height: 120 }}
      >
        {/* Rotated diamond */}
        <div
          className="absolute"
          style={{
            width: 88,
            height: 88,
            transform: 'rotate(45deg)',
            backgroundColor: `color-mix(in srgb, ${gateColor} ${isFlowActive ? '22%' : '11%'}, var(--color-card, #fff))`,
            border: `2px solid ${selected ? 'var(--color-primary)' : gateColor}`,
            borderRadius: 8,
            boxShadow: isCinematicFocus
              ? `0 0 0 4px ${gateColor}50, 0 0 24px ${gateColor}60`
              : isFlowActive ? `0 0 14px ${gateColor}60` : selected ? `0 0 0 3px ${gateColor}25` : undefined,
            transition: 'all 0.3s',
          }}
        />
        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center text-center px-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-md mb-1" style={{ backgroundColor: gateColor }}>
            <IconComponent className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-[9px] font-bold text-foreground leading-tight max-w-[72px] truncate">
            {isDecision ? (condition || label) : (flagName || label)}
          </p>
          {!isDecision && rollout !== undefined && (
            <p className="text-[8px] text-muted-foreground">{rollout}%</p>
          )}
        </div>

        {/* Input handle — top */}
        <Handle
          id="input"
          type="target"
          position={Position.Top}
          className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-card"
          style={{ backgroundColor: gateColor, top: 2 }}
        />
        {/* True / On handle — right + label */}
        <Handle
          id={isDecision ? 'condition-true' : 'flag-on'}
          type="source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-card !z-30"
          style={{ backgroundColor: '#10B981', right: 2 }}
        />
        <div className="absolute right-[-34px] top-1/2 -translate-y-1/2 text-[8px] font-bold z-20 whitespace-nowrap" style={{ color: '#10B981' }}>
          {trueLabel}
        </div>
        {/* False / Off handle — bottom + label */}
        <Handle
          id={isDecision ? 'condition-false' : 'flag-off'}
          type="source"
          position={Position.Bottom}
          className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-card !z-30"
          style={{ backgroundColor: '#EF4444', bottom: 2 }}
        />
        <div className="absolute bottom-[-16px] left-1/2 -translate-x-1/2 text-[8px] font-bold z-20 whitespace-nowrap" style={{ color: '#EF4444' }}>
          {falseLabel}
        </div>
      </div>
    )
  }

  // ─── Flow Group early return ──────────────────────────────────────────────────

  if (nodeType === 'flow-group') {
    const groupLabel = (nodeDataRaw.groupLabel as string | undefined) || label
    const groupColor = (nodeDataRaw.groupColor as string | undefined) ?? '#6366F1'
    return (
      <div
        className={cn(
          'relative group min-w-[220px] min-h-[140px] rounded-2xl border-2 border-dashed transition-all',
          selected ? 'border-primary' : 'hover:border-primary/40'
        )}
        style={{ borderColor: selected ? undefined : groupColor, backgroundColor: `color-mix(in srgb, ${groupColor} 5%, transparent)` }}
      >
        {/* Label pill */}
        <div
          className="absolute -top-3 left-4 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 shadow-sm"
          style={{ backgroundColor: groupColor }}
        >
          <IconComponent className="h-3 w-3 text-white" />
          <span className="text-[9px] font-bold text-white">{groupLabel}</span>
        </div>
        {(['top', 'right', 'bottom', 'left'] as const).map(side => (
          <Handle
            key={side}
            id={side}
            type="source"
            position={side === 'top' ? Position.Top : side === 'right' ? Position.Right : side === 'bottom' ? Position.Bottom : Position.Left}
            className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-card !opacity-0 group-hover:!opacity-100 !transition-opacity"
            style={{ backgroundColor: groupColor }}
          />
        ))}
      </div>
    )
  }

  // ─── Epic Annotation early return ─────────────────────────────────────────────

  if (nodeType === 'epic-annotation') {
    const epicName = (nodeDataRaw.epicName as string | undefined) || label
    const owner = nodeDataRaw.owner as string | undefined
    const baseline = nodeDataRaw.baseline as string | undefined
    const target = nodeDataRaw.target as string | undefined
    const unit = (nodeDataRaw.unit as string | undefined) ?? ''
    const linkedTicket = nodeDataRaw.linkedTicket as string | undefined
    const annotColor = '#F59E0B'

    return (
      <div
        className={cn(
          'relative group min-w-[160px] rounded-xl border-2 shadow-sm transition-all',
          selected ? 'border-primary shadow-md' : 'hover:border-primary/30'
        )}
        style={{ borderColor: selected ? undefined : '#F59E0B50', backgroundColor: 'color-mix(in srgb, #F59E0B 8%, var(--color-card, #fff))' }}
      >
        <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5 border-b border-amber-200/30">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded" style={{ backgroundColor: annotColor }}>
            <IconComponent className="h-3 w-3 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-foreground truncate">{epicName}</p>
            {owner && <p className="text-[8px] text-muted-foreground">{owner}</p>}
          </div>
        </div>
        {(baseline || target) && (
          <div className="flex items-center gap-3 px-3 py-2">
            {baseline && (
              <div>
                <p className="text-[8px] text-muted-foreground">Baseline</p>
                <p className="text-[11px] font-bold text-foreground">{baseline}{unit}</p>
              </div>
            )}
            {baseline && target && <div className="text-muted-foreground/40 text-sm">→</div>}
            {target && (
              <div>
                <p className="text-[8px] text-muted-foreground">Target</p>
                <p className="text-[11px] font-bold" style={{ color: annotColor }}>{target}{unit}</p>
              </div>
            )}
          </div>
        )}
        {linkedTicket && (
          <div className="px-3 pb-2">
            <span className="text-[8px] font-mono font-bold rounded px-1.5 py-0.5" style={{ backgroundColor: `${annotColor}20`, color: annotColor }}>
              {linkedTicket}
            </span>
          </div>
        )}
        <Handle id="wraps" type="source" position={Position.Right} className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-card !opacity-0 group-hover:!opacity-100 !transition-opacity" style={{ backgroundColor: annotColor }} />
        <Handle id="input" type="target" position={Position.Left} className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-card !opacity-0 group-hover:!opacity-100 !transition-opacity" style={{ backgroundColor: annotColor }} />
      </div>
    )
  }

  return (
    <div
      className={cn('relative group transition-opacity duration-500', isCinematicDimmed && 'opacity-30')}
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
      <div
        className={cn(
          'relative z-10 min-w-[140px] rounded-xl border bg-card shadow-sm transition-all',
          selected
            ? 'border-primary shadow-md shadow-primary/20 ring-2 ring-primary/30'
            : isCinematicFocus
              ? 'border-primary shadow-xl shadow-primary/30 ring-4 ring-primary/40'
              : isFlowActive
                ? 'border-primary/60 shadow-lg ring-2 ring-primary/40'
                : statusRing
                  ? cn('border-border', statusRing)
                  : 'border-border hover:border-primary/40 hover:shadow-md'
        )}
        style={strategyTint ? { backgroundColor: strategyTint } : undefined}
      >
        <NodeStatusBadge errorRate={errorRate} loadFactor={loadFactor} simStatus={simStatus} />

        {/* Rendering strategy badge */}
        {strategyColor && renderStrategy && (
          <div
            className="absolute -top-2 -right-2 z-20 rounded-full px-1.5 py-0.5 text-[8px] font-bold tracking-wider shadow-sm"
            style={{ backgroundColor: strategyColor.bg, color: strategyColor.text, border: `1px solid ${strategyColor.border}` }}
          >
            {renderStrategy}
          </div>
        )}

        {/* Component type badge (SC / CC) */}
        {!renderStrategy && (isServerComponent || isClientComponent) && (
          <div
            className="absolute -top-2 -right-2 z-20 rounded-full px-1.5 py-0.5 text-[8px] font-bold shadow-sm"
            style={{
              backgroundColor: isServerComponent ? '#1E40AF' : '#D97706',
              color: 'white',
            }}
          >
            {isServerComponent ? 'SC' : 'CC'}
          </div>
        )}

        {/* Lazy / memo badges */}
        <div className="absolute -top-2 left-1 z-20 flex gap-0.5">
          {isLazy && (
            <span className="rounded-full bg-slate-600 px-1.5 py-0.5 text-[7px] font-bold text-white shadow-sm">lazy</span>
          )}
          {isMemo && (
            <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[7px] font-bold text-white shadow-sm">memo</span>
          )}
        </div>

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

        {/* Route path badge */}
        {routePath && (
          <div className="flex items-center gap-1 px-3 py-1 border-b border-border/50">
            <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[160px]">
              {routePath.split('/').map((seg, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-muted-foreground/50">/</span>}
                  <span style={{ color: seg.startsWith(':') ? '#F59E0B' : undefined }}>
                    {seg}
                  </span>
                </span>
              ))}
            </span>
          </div>
        )}

        {/* Screen image */}
        {imageUrl && (
          <div className="overflow-hidden rounded-b-xl border-t border-border">
            <img src={imageUrl} alt={label} className="w-full object-cover max-h-32" />
          </div>
        )}

        {/* Device frame + wireframe for screen/page nodes without image */}
        {showWireframe && isScreenLike && <DeviceFrame size={screenSize} />}

        {/* Generic wireframe for screen node (backward compat if not screen-like above) */}
        {showWireframe && !isScreenLike && <ScreenWireframe />}

        {/* ── api-call: method + endpoint + branch chips ─────────────────── */}
        {nodeType === 'api-call' && (
          <div className="border-t border-border/50 px-3 py-2 space-y-1.5">
            {(apiMethod || apiEndpoint) && (
              <div className="flex items-center gap-1.5">
                {apiMethod && (
                  <span className="rounded px-1 py-0.5 text-[8px] font-bold text-white" style={{ backgroundColor: colorVar }}>
                    {apiMethod}
                  </span>
                )}
                {apiEndpoint && (
                  <span className="text-[9px] font-mono text-muted-foreground truncate">{apiEndpoint}</span>
                )}
              </div>
            )}
            {responseBranches.length > 0 && (
              <div className="space-y-0.5">
                {responseBranches.map((b, idx) => {
                  const isSelected = selectedBranch === b.value
                  const isErr = b.value === 'error' || (b.statusCode !== undefined && b.statusCode >= 400)
                  const chipColor = isErr ? '#EF4444' : '#10B981'
                  return (
                    <div key={b.value} className="relative flex items-center gap-1.5 rounded-lg px-2 py-1"
                      style={{
                        backgroundColor: isSelected ? `${chipColor}18` : 'var(--color-muted, #f1f5f9)',
                        border: `1px solid ${isSelected ? chipColor : 'transparent'}`,
                        boxShadow: isSelected && isFlowActive ? `0 0 6px ${chipColor}50` : undefined,
                      }}
                    >
                      <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: chipColor }} />
                      <span className="text-[9px] font-semibold flex-1 truncate" style={{ color: isSelected ? chipColor : 'var(--color-muted-foreground)' }}>
                        {b.label}
                      </span>
                      {b.statusCode && (
                        <span className="text-[8px] font-mono opacity-50">{b.statusCode}</span>
                      )}
                      <Handle
                        id={`branch-${b.value}`}
                        type="source"
                        position={Position.Right}
                        className="!h-2 !w-2 !rounded-full !border !border-card !z-30"
                        style={{ backgroundColor: chipColor, right: -8, top: `${50 + idx * 0}%` }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── polling-node: interval display ─────────────────────────────── */}
        {nodeType === 'polling-node' && (
          <div className="border-t border-border/50 px-3 py-1.5 flex items-center gap-2">
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <span>every</span>
              <span className="font-mono font-bold text-foreground">
                {intervalMs ? (intervalMs >= 1000 ? `${intervalMs / 1000}s` : `${intervalMs}ms`) : '—'}
              </span>
            </div>
            {pollingCycle !== undefined && (
              <div className="ml-auto flex items-center gap-1 text-[9px]">
                <span className="text-muted-foreground">cycle</span>
                <span className="font-mono font-bold" style={{ color: colorVar }}>{pollingCycle}</span>
              </div>
            )}
          </div>
        )}

        {/* ── named-state: state name + terminal badge ───────────────────── */}
        {nodeType === 'named-state' && stateName && (
          <div className="border-t border-border/50 px-3 py-1.5 flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold text-foreground truncate">{stateName}</span>
            {isTerminalState && (
              <span className="ml-auto rounded-full px-1.5 py-0.5 text-[7px] font-bold text-white bg-destructive/80">terminal</span>
            )}
          </div>
        )}

        {/* ── navigation-trigger: route + strategy ──────────────────────── */}
        {nodeType === 'navigation-trigger' && navRoute && (
          <div className="border-t border-border/50 px-3 py-1.5 flex items-center gap-1.5">
            {navStrategy && (
              <span className="rounded px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${colorVar}20`, color: colorVar }}>
                {navStrategy}
              </span>
            )}
            <span className="text-[9px] font-mono text-muted-foreground truncate">{navRoute}</span>
          </div>
        )}

        {/* ── service-singleton: exposed methods list ────────────────────── */}
        {nodeType === 'service-singleton' && exposedMethods && exposedMethods.length > 0 && (
          <div className="border-t border-border/50 px-3 py-1.5 space-y-0.5">
            {exposedMethods.slice(0, 3).map(m => (
              <div key={m} className="text-[9px] font-mono text-muted-foreground truncate">{m}</div>
            ))}
            {exposedMethods.length > 3 && (
              <div className="text-[8px] text-muted-foreground/60">+{exposedMethods.length - 3} more</div>
            )}
          </div>
        )}

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

        {/* 4-sided connection handles — hidden until hovered
            api-call skips the right handle (branches provide per-branch source handles) */}
        {(['top', 'right', 'bottom', 'left'] as const)
          .filter(side => !(nodeType === 'api-call' && side === 'right'))
          .map(side => (
            <Handle
              key={side}
              id={side}
              type={side === 'left' ? 'target' : 'source'}
              position={
                side === 'top' ? Position.Top
                : side === 'right' ? Position.Right
                : side === 'bottom' ? Position.Bottom
                : Position.Left
              }
              className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-card !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-150 !z-30"
              style={{ backgroundColor: colorVar }}
            />
          ))}
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
