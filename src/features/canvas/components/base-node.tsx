import { Handle, Position } from '@xyflow/react'
import type { CanvasNodeProps } from '../types'
import { NODE_TYPE_REGISTRY } from '@shared/constants'
import { cn } from '@shared/utils'
import * as Icons from '@shared/ui/icons'
import type { LucideIcon } from '@shared/ui/icons'

function NodeStatusBadge({ errorRate, loadFactor }: { errorRate?: number; loadFactor?: number }) {
  const hasError = (errorRate ?? 0) > 0.05
  const highLoad = (loadFactor ?? 0) > 0.8
  if (!hasError && !highLoad) return null
  return (
    <div className="absolute -top-1.5 -right-1.5 flex gap-1">
      {hasError && (
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">!</span>
      )}
      {highLoad && (
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-warning text-[8px] font-bold text-warning-foreground">↑</span>
      )}
    </div>
  )
}

export function BaseNode({ data, selected }: CanvasNodeProps) {
  const { label, nodeType, isSimulating, errorRate, loadFactor } = data
  const def = NODE_TYPE_REGISTRY[nodeType]
  if (!def) return null
  const IconComponent = (Icons as Record<string, LucideIcon>)[def.icon] ?? Icons.Server
  const colorVar = `var(${def.colorVar})`

  return (
    <div className={cn(
      'relative min-w-[140px] rounded-xl border bg-card shadow-sm transition-all',
      selected ? 'border-primary shadow-md shadow-primary/20 ring-2 ring-primary/30' : 'border-border hover:border-primary/40 hover:shadow-md'
    )}>
      <NodeStatusBadge errorRate={errorRate} loadFactor={loadFactor} />
      <div className="flex items-center gap-2 rounded-t-xl px-3 py-2" style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 12%, transparent)` }}>
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: colorVar }}>
          <IconComponent className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground leading-tight">{label}</p>
          <p className="text-[10px] font-medium" style={{ color: colorVar }}>{def.label}</p>
        </div>
      </div>
      {isSimulating && loadFactor !== undefined && (
        <div className="border-t border-border px-3 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">load</span>
            <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(loadFactor * 100, 100)}%`,
                backgroundColor: loadFactor > 0.8 ? 'var(--color-destructive)' : loadFactor > 0.6 ? 'var(--color-warning)' : 'var(--color-success)',
              }} />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{Math.round(loadFactor * 100)}%</span>
          </div>
          {(errorRate ?? 0) > 0 && (
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">err</span>
              <span className="text-[10px] font-mono text-destructive">{((errorRate ?? 0) * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !rounded-full !border-2 !border-card" style={{ backgroundColor: colorVar }} />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !rounded-full !border-2 !border-card" style={{ backgroundColor: colorVar }} />
    </div>
  )
}
