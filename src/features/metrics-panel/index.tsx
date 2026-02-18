import type { MetricsSnapshot } from '@shared/types/simulation.types'
import { Activity, Gauge, AlertCircle, Clock } from '@shared/ui/icons'
import { cn } from '@shared/utils'

interface MetricsPanelProps {
  metrics: MetricsSnapshot
  elapsedMs: number
  progressPercent: number
  simulationType: string
}

interface MetricCardProps {
  label: string
  value: string
  subValue?: string
  icon: React.ReactNode
  status?: 'good' | 'warn' | 'bad' | 'neutral'
}

function MetricCard({ label, value, subValue, icon, status = 'neutral' }: MetricCardProps) {
  const statusColors = {
    good: 'text-success',
    warn: 'text-warning',
    bad: 'text-destructive',
    neutral: 'text-foreground',
  }
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={cn('text-lg font-bold leading-none', statusColors[status])}>{value}</p>
      {subValue && <p className="text-[10px] text-muted-foreground">{subValue}</p>}
    </div>
  )
}

function getLatencyStatus(p99: number): MetricCardProps['status'] {
  if (p99 < 100) return 'good'
  if (p99 < 500) return 'warn'
  return 'bad'
}

function getErrorStatus(rate: number): MetricCardProps['status'] {
  if (rate === 0) return 'good'
  if (rate < 0.05) return 'warn'
  return 'bad'
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

function formatRps(rps: number): string {
  if (rps >= 1000) return `${(rps / 1000).toFixed(1)}k`
  return `${Math.round(rps)}`
}

export function MetricsPanel({ metrics, elapsedMs, progressPercent, simulationType }: MetricsPanelProps) {
  const elapsed = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <div className="flex h-full w-72 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-foreground">Live Metrics</h2>
            <p className="text-[10px] text-muted-foreground capitalize">
              {simulationType.replace(/-/g, ' ')}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="font-mono text-xs text-muted-foreground">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>
        {/* Progress */}
        <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Global metrics */}
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Global</p>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="Throughput"
            value={`${formatRps(metrics.totalRps)}`}
            subValue="req/s"
            icon={<Activity className="h-3 w-3" />}
            status="neutral"
          />
          <MetricCard
            label="Error Rate"
            value={`${(metrics.totalErrorRate * 100).toFixed(1)}%`}
            subValue={metrics.totalErrorRate === 0 ? 'No errors' : `${Math.round(metrics.nodes.filter(n => n.errorRate > 0).length)} nodes`}
            icon={<AlertCircle className="h-3 w-3" />}
            status={getErrorStatus(metrics.totalErrorRate)}
          />
        </div>

        {/* Latency */}
        <p className="pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Latency</p>
        <div className="grid grid-cols-3 gap-2">
          <MetricCard
            label="p50"
            value={formatMs(metrics.nodes.reduce((s, n) => s + n.latencyP50, 0) / (metrics.nodes.length || 1))}
            icon={<Clock className="h-3 w-3" />}
            status="good"
          />
          <MetricCard
            label="p95"
            value={formatMs(metrics.nodes.reduce((s, n) => s + n.latencyP95, 0) / (metrics.nodes.length || 1))}
            icon={<Clock className="h-3 w-3" />}
            status={getLatencyStatus(metrics.nodes.reduce((s, n) => s + n.latencyP95, 0) / (metrics.nodes.length || 1))}
          />
          <MetricCard
            label="p99"
            value={formatMs(metrics.avgLatencyP99)}
            icon={<Clock className="h-3 w-3" />}
            status={getLatencyStatus(metrics.avgLatencyP99)}
          />
        </div>

        {/* Per-node breakdown */}
        {metrics.nodes.length > 0 && (
          <>
            <p className="pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Per Node</p>
            <div className="space-y-2">
              {metrics.nodes.map(node => (
                <div key={node.nodeId} className="rounded-xl border border-border bg-background p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-semibold text-muted-foreground truncate">
                      {node.nodeId.slice(0, 8)}...
                    </span>
                    <span className={cn(
                      'text-[10px] font-bold',
                      node.errorRate > 0.05 ? 'text-destructive' : 'text-success'
                    )}>
                      {node.errorRate > 0 ? `${(node.errorRate * 100).toFixed(0)}% err` : 'OK'}
                    </span>
                  </div>
                  {/* Load bar */}
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-[9px] text-muted-foreground w-5">CPU</span>
                    <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(node.cpuPercent, 100)}%`,
                          backgroundColor: node.cpuPercent > 80 ? 'var(--color-destructive)' : node.cpuPercent > 60 ? 'var(--color-warning)' : 'var(--color-success)',
                        }}
                      />
                    </div>
                    <span className="shrink-0 text-[9px] font-mono text-muted-foreground w-8 text-right">
                      {Math.round(node.cpuPercent)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="shrink-0 text-[9px] text-muted-foreground w-5">RPS</span>
                    <span className="text-[9px] font-mono text-foreground">{formatRps(node.rps)}</span>
                    <span className="ml-auto text-[9px] font-mono text-muted-foreground">
                      p99 {formatMs(node.latencyP99)}
                    </span>
                  </div>
                  {(node.queueDepth ?? 0) > 0 && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="shrink-0 text-[9px] text-muted-foreground w-5">Q</span>
                      <span className={cn('text-[9px] font-mono', node.queueDepth! > 100 ? 'text-warning' : 'text-foreground')}>
                        {node.queueDepth} msgs
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Gauge className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">
            Metrics update every second
          </p>
        </div>
      </div>
    </div>
  )
}
