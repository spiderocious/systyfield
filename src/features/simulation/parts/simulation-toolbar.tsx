import { useState, useCallback, useMemo } from 'react'
import {
  Play, Pause, Square, RotateCcw, Activity, ChevronDown, FastForward,
  SlidersHorizontal, Target, History, GitFork, Flag, Zap, RefreshCw, Navigation,
  Clapperboard,
} from '@shared/ui/icons'
import { cn } from '@shared/utils'
import { SIM_REGISTRY, SIM_CATEGORIES } from '../types/sim-registry'
import type { SimulationCategory, SimulationType, SimulationConfig } from '@shared/types/simulation.types'
import type { CanvasNode } from '@features/canvas/types'
import type { DesignMode } from '@shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimulationToolbarProps {
  mode?: DesignMode
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
  cinematicMode?: boolean
  onCinematicToggle?: () => void
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Icons for UI flow sim types
const UI_SIM_ICONS: Record<string, React.ReactNode> = {
  'ui-flow-trace':    <Navigation className="h-3 w-3" />,
  'ui-branch-explorer': <GitFork className="h-3 w-3" />,
  'ui-flag-toggle':   <Flag className="h-3 w-3" />,
  'ui-api-response':  <Zap className="h-3 w-3" />,
  'ui-polling-viz':   <RefreshCw className="h-3 w-3" />,
}

// ─── UI Flow Configure Panel ──────────────────────────────────────────────────
// A separate panel for UI mode that replaces the generic RPS-slider approach

interface UIFlowConfigProps {
  simType: string
  nodes: CanvasNode[]
  // Selections
  startNodeId: string
  onStartNodeChange: (id: string) => void
  branchSelections: Record<string, string>           // nodeId → branch value
  onBranchChange: (nodeId: string, value: string) => void
  flagValues: Record<string, boolean>                // flagName → on/off
  onFlagChange: (flagName: string, value: boolean) => void
  pollingSpeedMultiplier: string
  onPollingSpeedChange: (v: string) => void
  autoAdvance: boolean
  onAutoAdvanceChange: (v: boolean) => void
  onRun: () => void
}

function UIFlowConfigPanel({
  simType,
  nodes,
  startNodeId,
  onStartNodeChange,
  branchSelections,
  onBranchChange,
  flagValues,
  onFlagChange,
  pollingSpeedMultiplier,
  onPollingSpeedChange,
  autoAdvance,
  onAutoAdvanceChange,
  onRun,
}: UIFlowConfigProps) {
  const apiCallNodes = nodes.filter(n => n.data.nodeType === 'api-call')
  const flagGateNodes = nodes.filter(n => n.data.nodeType === 'feature-flag-gate')
  const pollingNodes = nodes.filter(n => n.data.nodeType === 'polling-node')
  const needsStartNode = simType === 'ui-flow-trace' || simType === 'ui-api-response' || simType === 'ui-branch-explorer'
  const needsAutoAdvance = simType === 'ui-flow-trace'
  const needsBranches = (simType === 'ui-api-response' || simType === 'ui-flow-trace') && apiCallNodes.length > 0
  const needsFlags = (simType === 'ui-flag-toggle' || simType === 'ui-flow-trace' || simType === 'ui-api-response') && flagGateNodes.length > 0
  const needsPollingSpeed = simType === 'ui-polling-viz'

  const select = 'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary'

  return (
    <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-2xl">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs font-bold text-foreground">Configure Flow Run</p>
      </div>
      <div className="max-h-[420px] overflow-y-auto px-4 py-3 space-y-4">

        {/* Start node */}
        {needsStartNode && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground">Start Node</label>
            <select value={startNodeId} onChange={e => onStartNodeChange(e.target.value)} className={select}>
              <option value="">— first node —</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.data.label} ({n.data.nodeType})</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">Trace begins from this node</p>
          </div>
        )}

        {/* Auto-advance */}
        {needsAutoAdvance && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-foreground">Auto-advance</p>
              <p className="text-[10px] text-muted-foreground">Step through without pausing</p>
            </div>
            <button
              type="button"
              onClick={() => onAutoAdvanceChange(!autoAdvance)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                autoAdvance ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span className={cn('pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', autoAdvance ? 'translate-x-4' : 'translate-x-0')} />
            </button>
          </div>
        )}

        {/* API call branch selections */}
        {needsBranches && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-cyan-500" />
              <p className="text-[11px] font-bold text-foreground">API Response Branches</p>
            </div>
            <p className="text-[10px] text-muted-foreground -mt-2">Pick which response fires for each API call during this run</p>
            {apiCallNodes.map(node => {
              const d = node.data.data as unknown as Record<string, unknown>
              const branches = (d.responseBranches as Array<{ value: string; label: string; statusCode?: number }>) ?? []
              const method = d.method as string | undefined
              const endpoint = d.endpoint as string | undefined
              const selected = branchSelections[node.id] ?? ''
              return (
                <div key={node.id} className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-2.5">
                  <div className="flex items-center gap-1.5">
                    {method && (
                      <span className="rounded px-1 py-0.5 text-[8px] font-bold text-white bg-cyan-500">{method}</span>
                    )}
                    <p className="text-[10px] font-semibold text-foreground truncate">{node.data.label}</p>
                    {endpoint && <p className="text-[9px] font-mono text-muted-foreground truncate">{endpoint}</p>}
                  </div>
                  <div className="space-y-1">
                    {branches.map(b => {
                      const isErr = b.value === 'error' || (b.statusCode !== undefined && b.statusCode >= 400)
                      const color = isErr ? '#EF4444' : '#10B981'
                      const isSelected = selected === b.value
                      return (
                        <button
                          key={b.value}
                          type="button"
                          onClick={() => onBranchChange(node.id, b.value)}
                          className={cn(
                            'w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-all border',
                            isSelected ? 'border-transparent' : 'border-border hover:bg-muted'
                          )}
                          style={isSelected ? { backgroundColor: `${color}18`, borderColor: color } : undefined}
                        >
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[10px] font-semibold flex-1" style={{ color: isSelected ? color : 'var(--color-foreground)' }}>
                            {b.label}
                          </span>
                          {b.statusCode && (
                            <span className="text-[9px] font-mono text-muted-foreground">{b.statusCode}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Feature flag toggles */}
        {needsFlags && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Flag className="h-3 w-3 text-amber-500" />
              <p className="text-[11px] font-bold text-foreground">Feature Flags</p>
            </div>
            <p className="text-[10px] text-muted-foreground -mt-2">Set flag state for this run</p>
            {flagGateNodes.map(node => {
              const d = node.data.data as unknown as Record<string, unknown>
              const flagName = d.flagName as string | undefined
              const key = flagName ?? node.id
              const isOn = flagValues[key] ?? (d.defaultValue as boolean ?? false)
              const rollout = d.rolloutPercent as number | undefined
              return (
                <div key={node.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-foreground font-mono truncate">{flagName || node.data.label}</p>
                    {rollout !== undefined && (
                      <p className="text-[9px] text-muted-foreground">{rollout}% rollout</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-bold" style={{ color: isOn ? '#10B981' : '#EF4444' }}>
                      {isOn ? 'ON' : 'OFF'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onFlagChange(key, !isOn)}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        isOn ? 'bg-success' : 'bg-muted'
                      )}
                      style={isOn ? { backgroundColor: '#10B981' } : undefined}
                    >
                      <span className={cn('pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', isOn ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Polling speed */}
        {needsPollingSpeed && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3 text-blue-500" />
              <label className="text-[11px] font-semibold text-foreground">Time Multiplier</label>
            </div>
            <select value={pollingSpeedMultiplier} onChange={e => onPollingSpeedChange(e.target.value)} className={select}>
              {[['1', '1× (real time)'], ['5', '5× (fast)'], ['10', '10×'], ['60', '60× (1s = 1 min)']].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">Compress time so polling cycles are visible</p>
          </div>
        )}

        {/* No polling nodes message */}
        {simType === 'ui-polling-viz' && pollingNodes.length === 0 && (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-4 text-center">
            <p className="text-[11px] text-muted-foreground">No <strong>Polling</strong> nodes on this canvas yet.</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Add a Polling node from the palette first.</p>
          </div>
        )}

      </div>
      <div className="border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={onRun}
          className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Run Simulation
        </button>
      </div>
    </div>
  )
}

// ─── Main SimulationToolbar ───────────────────────────────────────────────────

export function SimulationToolbar({
  mode = 'system',
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
  cinematicMode = false,
  onCinematicToggle,
}: SimulationToolbarProps) {
  // Filter registry by mode
  const availableSims = useMemo(
    () => SIM_REGISTRY.filter(d => !d.modes || d.modes.includes(mode)),
    [mode],
  )

  const defaultType = mode === 'ui' ? 'ui-flow-trace' : 'load-test'

  const [showPicker, setShowPicker] = useState(false)
  const [showParams, setShowParams] = useState(false)
  const [showTargets, setShowTargets] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedType, setSelectedType] = useState(defaultType)

  // System / service sim params
  const [params, setParams] = useState<Record<string, number | string | boolean>>({})
  const [targetNodeIds, setTargetNodeIds] = useState<string[]>([])

  // UI flow sim selections
  const [startNodeId, setStartNodeId] = useState('')
  const [branchSelections, setBranchSelections] = useState<Record<string, string>>({})
  const [flagValues, setFlagValues] = useState<Record<string, boolean>>({})
  const [pollingSpeedMultiplier, setPollingSpeedMultiplier] = useState('5')
  const [autoAdvance, setAutoAdvance] = useState(false)

  const selectedDef = availableSims.find(d => d.type === selectedType) ?? availableSims[0]
  const isUIMode = mode === 'ui'

  // Categorized sims for picker
  const usedCategories = useMemo(() => {
    const cats = new Set(availableSims.map(d => d.category))
    return (Object.entries(SIM_CATEGORIES) as [SimulationCategory, string][]).filter(([k]) => cats.has(k))
  }, [availableSims])

  const isActive = isRunning || isPaused

  const getParam = useCallback((key: string, defaultValue: number | string | boolean) => {
    return key in params ? params[key] : defaultValue
  }, [params])

  const handleSelectType = useCallback((type: string) => {
    setSelectedType(type)
    setParams({})
    setTargetNodeIds([])
    setShowPicker(false)
  }, [])

  const handleBranchChange = useCallback((nodeId: string, value: string) => {
    setBranchSelections(prev => ({ ...prev, [nodeId]: value }))
  }, [])

  const handleFlagChange = useCallback((flagName: string, value: boolean) => {
    setFlagValues(prev => ({ ...prev, [flagName]: value }))
  }, [])

  // Build config and fire onStart
  const handleStart = useCallback(() => {
    if (!selectedDef) return

    if (isUIMode) {
      // Serialize UI flow selections into params
      const resolvedParams: Record<string, number | string | boolean | string[]> = {
        startNodeId,
        autoAdvance,
        speedMultiplier: pollingSpeedMultiplier,
        apiResponseSelections: JSON.stringify(branchSelections),
        activeFlagValues: JSON.stringify(flagValues),
      }
      onStart({
        name: selectedDef.label,
        type: selectedDef.type as SimulationType,
        params: resolvedParams,
        durationMs: 0, // auto-set by adapter
        targetNodeIds: [],
      })
    } else {
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
    }

    setShowParams(false)
    setShowTargets(false)
  }, [selectedDef, isUIMode, startNodeId, autoAdvance, pollingSpeedMultiplier, branchSelections, flagValues, onStart, getParam, selectedType, targetNodeIds])

  const isChaosType = selectedDef?.category === 'failure-chaos'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      <div className={cn(
        'flex items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm',
        isUIMode && 'border-primary/20 bg-card/95'
      )}>

        {/* Simulation type picker button */}
        <button
          type="button"
          onClick={() => { setShowPicker(p => !p); setShowParams(false); setShowTargets(false); setShowHistory(false) }}
          disabled={isActive}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:border-primary/30 disabled:opacity-50',
          )}
        >
          {isUIMode && selectedDef && (
            <span className="text-primary">{UI_SIM_ICONS[selectedDef.type] ?? <Activity className="h-3 w-3" />}</span>
          )}
          {!isUIMode && <Activity className="h-3 w-3 text-primary" />}
          {selectedDef?.label ?? 'Select Simulation'}
          <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', showPicker && 'rotate-180')} />
        </button>

        {/* Configure button */}
        {!isActive && selectedDef && (
          <button
            type="button"
            onClick={() => { setShowParams(p => !p); setShowPicker(false); setShowTargets(false); setShowHistory(false) }}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors',
              showParams ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            title="Configure simulation"
          >
            <SlidersHorizontal className="h-3 w-3" />
          </button>
        )}

        {/* Target nodes button (chaos sims only, system/service mode) */}
        {!isActive && !isUIMode && isChaosType && nodes.length > 0 && (
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
            {targetNodeIds.length > 0 && <span className="text-[10px] font-bold">{targetNodeIds.length}</span>}
          </button>
        )}

        <div className="h-5 w-px bg-border" />

        {/* Run / Pause / Stop controls */}
        {!isActive ? (
          <SimButton icon={<Play className="h-3.5 w-3.5" />} label="Run" variant="primary" onClick={handleStart} />
        ) : (
          <>
            {isPaused ? (
              <SimButton icon={<Play className="h-3.5 w-3.5" />} label="Resume" variant="primary" onClick={onResume} />
            ) : (
              <SimButton icon={<Pause className="h-3.5 w-3.5" />} label="Pause" onClick={onPause} />
            )}
            <SimButton icon={<Square className="h-3 w-3" />} label="Stop" variant="danger" onClick={onStop} />
          </>
        )}

        {/* Progress */}
        {isActive && (
          <>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-1000',
                    isUIMode ? 'bg-primary' : 'bg-primary'
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="w-8 text-right text-[10px] font-mono text-muted-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </>
        )}

        {/* Cinematic mode toggle — visible while sim is active */}
        {isActive && onCinematicToggle && (
          <>
            <div className="h-5 w-px bg-border" />
            <button
              type="button"
              onClick={onCinematicToggle}
              title={cinematicMode ? 'Exit cinematic mode' : 'Cinematic mode — auto-zoom active node'}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
                cinematicMode
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Clapperboard className="h-3.5 w-3.5" />
              {cinematicMode ? 'Cinematic' : 'Cinematic'}
            </button>
          </>
        )}

        {/* Speed control (system/service only) */}
        {onSpeedChange && !isUIMode && (
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
            <SimButton icon={<Play className="h-3.5 w-3.5" />} label="Run Again" variant="primary" onClick={handleStart} title="Re-run with the same configuration" />
            <SimButton icon={<RotateCcw className="h-3 w-3" />} label="Reset" variant="ghost" onClick={onStop} />
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

      {/* ── Simulation type picker ─────────────────────────────────────────────── */}
      {showPicker && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card shadow-xl">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-bold text-foreground">
              {isUIMode ? 'Choose Flow Simulation' : 'Choose Simulation'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {isUIMode ? 'Explore your UI flow at runtime' : 'Select the type of scenario to run'}
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2 space-y-3">
            {usedCategories.map(([catKey, catLabel]) => {
              const items = availableSims.filter(d => d.category === catKey)
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
                          'w-full rounded-lg px-3 py-2.5 text-left transition-colors flex items-start gap-2.5',
                          selectedType === def.type ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                        )}
                      >
                        {isUIMode && (
                          <span className={cn('mt-0.5 shrink-0', selectedType === def.type ? 'text-primary' : 'text-muted-foreground')}>
                            {UI_SIM_ICONS[def.type] ?? <Activity className="h-3 w-3" />}
                          </span>
                        )}
                        <div>
                          <p className="text-xs font-semibold">{def.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{def.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── UI Flow config panel ───────────────────────────────────────────────── */}
      {showParams && isUIMode && selectedDef && (
        <UIFlowConfigPanel
          simType={selectedDef.type}
          nodes={nodes}
          startNodeId={startNodeId}
          onStartNodeChange={setStartNodeId}
          branchSelections={branchSelections}
          onBranchChange={handleBranchChange}
          flagValues={flagValues}
          onFlagChange={handleFlagChange}
          pollingSpeedMultiplier={pollingSpeedMultiplier}
          onPollingSpeedChange={setPollingSpeedMultiplier}
          autoAdvance={autoAdvance}
          onAutoAdvanceChange={setAutoAdvance}
          onRun={() => { handleStart(); setShowParams(false) }}
        />
      )}

      {/* ── System / service param editor panel ───────────────────────────────── */}
      {showParams && !isUIMode && selectedDef && (
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
                      className={cn('relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', val ? 'bg-primary' : 'bg-muted')}
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

      {/* ── Target node picker (system/service chaos only) ─────────────────────── */}
      {showTargets && !isUIMode && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-card shadow-xl">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-bold text-foreground">Target Nodes</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {targetNodeIds.length === 0 ? 'All nodes targeted' : `${targetNodeIds.length} node(s) selected`}
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto p-2 space-y-0.5">
            {nodes.map(node => {
              const sel = targetNodeIds.includes(node.id)
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setTargetNodeIds(ids => sel ? ids.filter(id => id !== node.id) : [...ids, node.id])}
                  className={cn('w-full rounded-lg px-3 py-2 text-left text-xs transition-colors flex items-center gap-2', sel ? 'bg-destructive/10 text-destructive' : 'hover:bg-muted text-foreground')}
                >
                  <div className={cn('h-2 w-2 rounded-full flex-shrink-0', sel ? 'bg-destructive' : 'bg-muted-foreground')} />
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

      {/* ── Simulation history ─────────────────────────────────────────────────── */}
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
                  <span className="text-[10px] text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
                {!entry.type.startsWith('ui-') ? (
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">{Math.round(entry.finalRps)} RPS</span>
                    <span className={cn('text-[10px] font-semibold', entry.finalErrorRate > 0.05 ? 'text-destructive' : 'text-success')}>
                      {(entry.finalErrorRate * 100).toFixed(1)}% err
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">p99 {Math.round(entry.finalP99)}ms</span>
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] text-muted-foreground">UI flow run</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
