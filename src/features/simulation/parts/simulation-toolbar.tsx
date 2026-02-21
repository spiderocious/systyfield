import { useState, useCallback } from 'react'
import { Play, Pause, Square, RotateCcw, Activity, ChevronDown, FastForward, SlidersHorizontal, Target, History } from '@shared/ui/icons'
import { cn } from '@shared/utils'
import { SIM_REGISTRY, SIM_CATEGORIES } from '../types/sim-registry'
import type { SimulationCategory, SimulationType, SimulationConfig } from '@shared/types/simulation.types'
import type { CanvasNode } from '@features/canvas/types'

interface SimulationToolbarProps {
  isRunning: boolean
  isPaused: boolean
  progressPercent: number
  nodes?: CanvasNode[]
  onStart: (config: Omit<SimulationConfig, 'id' | 'createdAt'>) => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  speedMultiplier?: number
  onSpeedChange?: (speed: number) => void
  simHistory?: SimHistoryEntry[]
}

export interface SimHistoryEntry {
  id: string
  type: string
  label: string
  timestamp: number
  finalRps: number
  finalErrorRate: number
  finalP99: number
}

interface SimButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  disabled?: boolean
  title?: string
}

function SimButton({ icon, label, onClick, variant = 'default', disabled, title }: SimButtonProps) {
  const base = 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-40'
  const variants = {
    default: 'bg-card border border-border text-foreground hover:bg-muted',
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
    danger: 'bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(base, variants[variant])} title={title}>
      {icon}
      {label}
    </button>
  )
}

function formatDuration(ms: number): string {
  if (ms >= 60000) return `${Math.round(ms / 60000)}m`
  return `${Math.round(ms / 1000)}s`
}

const SPEED_OPTIONS = [0.5, 1, 2, 5] as const

export function SimulationToolbar({
  isRunning,
  isPaused,
  progressPercent,
  nodes = [],
  onStart,
  onPause,
  onResume,
  onStop,
  speedMultiplier = 1,
  onSpeedChange,
  simHistory = [],
}: SimulationToolbarProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [showParams, setShowParams] = useState(false)
  const [showTargets, setShowTargets] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedType, setSelectedType] = useState('load-test')
  const [params, setParams] = useState<Record<string, number | string | boolean>>({})
  const [targetNodeIds, setTargetNodeIds] = useState<string[]>([])

  const selectedDef = SIM_REGISTRY.find(d => d.type === selectedType)
  const categorized = Object.entries(SIM_CATEGORIES) as [SimulationCategory, string][]
  const isActive = isRunning || isPaused

  // Get current param value (edited or default)
  const getParam = useCallback((key: string, defaultValue: number | string | boolean) => {
    return key in params ? params[key] : defaultValue
  }, [params])

  const handleSelectType = useCallback((type: string) => {
    setSelectedType(type)
    setParams({}) // reset params when type changes
    setTargetNodeIds([])
    setShowPicker(false)
  }, [])

  const handleStart = () => {
    if (!selectedDef) return
    const resolvedParams: Record<string, number | string | boolean | string[]> = {}
    for (const field of selectedDef.params) {
      resolvedParams[field.key] = getParam(field.key, field.defaultValue as number | string | boolean) as number | string | boolean
    }
    const durationMs = (resolvedParams.durationMs as number) ?? 60000
    onStart({
      name: selectedDef.label,
      type: selectedType as SimulationType,
      params: resolvedParams,
      durationMs,
      targetNodeIds,
    })
    setShowParams(false)
    setShowTargets(false)
  }

  const isChaosType = selectedDef?.category === 'failure-chaos'

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        {/* Simulation type picker */}
        <button
          type="button"
          onClick={() => { setShowPicker(p => !p); setShowParams(false); setShowTargets(false); setShowHistory(false) }}
          disabled={isActive}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:border-primary/30 disabled:opacity-50',
          )}
        >
          <Activity className="h-3 w-3 text-primary" />
          {selectedDef?.label ?? 'Select Simulation'}
          <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', showPicker && 'rotate-180')} />
        </button>

        {/* Params editor button */}
        {!isActive && selectedDef && (
          <button
            type="button"
            onClick={() => { setShowParams(p => !p); setShowPicker(false); setShowTargets(false); setShowHistory(false) }}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors',
              showParams ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            title="Edit simulation parameters"
          >
            <SlidersHorizontal className="h-3 w-3" />
          </button>
        )}

        {/* Target nodes button (chaos only) */}
        {!isActive && isChaosType && nodes.length > 0 && (
          <button
            type="button"
            onClick={() => { setShowTargets(p => !p); setShowPicker(false); setShowParams(false); setShowHistory(false) }}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors',
              showTargets ? 'bg-primary/10 text-primary' : targetNodeIds.length > 0 ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            title={`Target nodes (${targetNodeIds.length > 0 ? targetNodeIds.length + ' selected' : 'all'})`}
          >
            <Target className="h-3 w-3" />
            {targetNodeIds.length > 0 && (
              <span className="text-[10px] font-bold">{targetNodeIds.length}</span>
            )}
          </button>
        )}

        <div className="h-5 w-px bg-border" />

        {/* Controls */}
        {!isActive ? (
          <SimButton
            icon={<Play className="h-3.5 w-3.5" />}
            label="Run"
            variant="primary"
            onClick={handleStart}
          />
        ) : (
          <>
            {isPaused ? (
              <SimButton
                icon={<Play className="h-3.5 w-3.5" />}
                label="Resume"
                variant="primary"
                onClick={onResume}
              />
            ) : (
              <SimButton
                icon={<Pause className="h-3.5 w-3.5" />}
                label="Pause"
                onClick={onPause}
              />
            )}
            <SimButton
              icon={<Square className="h-3 w-3" />}
              label="Stop"
              variant="danger"
              onClick={onStop}
            />
          </>
        )}

        {/* Progress bar */}
        {isActive && (
          <>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="w-8 text-right text-[10px] font-mono text-muted-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </>
        )}

        {/* Speed control */}
        {onSpeedChange && (
          <>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-0.5">
              <FastForward className="h-3 w-3 text-muted-foreground" />
              {SPEED_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSpeedChange(s)}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors',
                    speedMultiplier === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </>
        )}

        {/* Run Again / Reset */}
        {!isActive && progressPercent > 0 && (
          <>
            <SimButton
              icon={<Play className="h-3.5 w-3.5" />}
              label="Run Again"
              variant="primary"
              onClick={handleStart}
              title="Re-run with the same configuration"
            />
            <SimButton
              icon={<RotateCcw className="h-3 w-3" />}
              label="Reset"
              variant="ghost"
              onClick={onStop}
            />
            {simHistory.length > 0 && (
              <button
                type="button"
                onClick={() => { setShowHistory(p => !p); setShowPicker(false); setShowParams(false); setShowTargets(false) }}
                className={cn('flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors', showHistory ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
                title="Simulation history"
              >
                <History className="h-3 w-3" />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Simulation type dropdown ──────────────────────────────────────────── */}
      {showPicker && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-bold text-foreground">Choose Simulation</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Select the type of scenario to run</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2 space-y-3">
            {categorized.map(([catKey, catLabel]) => {
              const items = SIM_REGISTRY.filter(d => d.category === catKey)
              return (
                <div key={catKey}>
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {catLabel}
                  </p>
                  <div className="space-y-0.5">
                    {items.map(def => (
                      <button
                        key={def.type}
                        type="button"
                        onClick={() => handleSelectType(def.type)}
                        className={cn(
                          'w-full rounded-lg px-3 py-2 text-left transition-colors',
                          selectedType === def.type
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <p className="text-xs font-semibold">{def.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{def.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Param editor panel ────────────────────────────────────────────────── */}
      {showParams && selectedDef && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card shadow-xl">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-bold text-foreground">{selectedDef.label} — Parameters</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{selectedDef.description}</p>
          </div>
          <div className="p-3 space-y-3">
            {selectedDef.params.map(field => {
              const val = getParam(field.key, field.defaultValue as number | string | boolean)
              return (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-foreground">{field.label}</label>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {field.type === 'duration-ms' ? formatDuration(val as number)
                        : field.type === 'percentage' ? `${Math.round((val as number) * 100)}%`
                        : field.unit ? `${val} ${field.unit}`
                        : String(val)}
                    </span>
                  </div>
                  {field.type === 'boolean' ? (
                    <button
                      type="button"
                      onClick={() => setParams(p => ({ ...p, [field.key]: !val }))}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        val ? 'bg-primary' : 'bg-muted'
                      )}
                    >
                      <span className={cn('pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform', val ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                  ) : field.type === 'select' ? (
                    <select
                      value={String(val)}
                      onChange={e => setParams(p => ({ ...p, [field.key]: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                    >
                      {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  ) : (
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step ?? 1}
                      value={Number(val)}
                      onChange={e => setParams(p => ({ ...p, [field.key]: Number(e.target.value) }))}
                      className="w-full accent-primary"
                    />
                  )}
                  {field.description && (
                    <p className="text-[10px] text-muted-foreground">{field.description}</p>
                  )}
                </div>
              )
            })}
          </div>
          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={handleStart}
              className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Run with These Params
            </button>
          </div>
        </div>
      )}

      {/* ── Target node picker ────────────────────────────────────────────────── */}
      {showTargets && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-card shadow-xl">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-bold text-foreground">Target Nodes</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {targetNodeIds.length === 0 ? 'All nodes targeted' : `${targetNodeIds.length} node(s) selected`}
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto p-2 space-y-0.5">
            {nodes.map(node => {
              const selected = targetNodeIds.includes(node.id)
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setTargetNodeIds(ids =>
                    selected ? ids.filter(id => id !== node.id) : [...ids, node.id]
                  )}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left text-xs transition-colors flex items-center gap-2',
                    selected ? 'bg-destructive/10 text-destructive' : 'hover:bg-muted text-foreground'
                  )}
                >
                  <div className={cn('h-2 w-2 rounded-full flex-shrink-0', selected ? 'bg-destructive' : 'bg-muted-foreground')} />
                  <span className="truncate">{node.data.label}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{node.data.nodeType}</span>
                </button>
              )
            })}
          </div>
          {targetNodeIds.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => setTargetNodeIds([])}
                className="w-full rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Clear selection (target all)
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Simulation history panel ──────────────────────────────────────────── */}
      {showHistory && simHistory.length > 0 && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card shadow-xl">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-bold text-foreground">Simulation History</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Last {simHistory.length} runs</p>
          </div>
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {simHistory.map(entry => (
              <div key={entry.id} className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-foreground">{entry.label}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(entry.finalRps)} RPS
                  </span>
                  <span className={cn('text-[10px] font-semibold', entry.finalErrorRate > 0.05 ? 'text-destructive' : 'text-success')}>
                    {(entry.finalErrorRate * 100).toFixed(1)}% err
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    p99 {Math.round(entry.finalP99)}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
