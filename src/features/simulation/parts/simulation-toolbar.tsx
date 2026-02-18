import { useState } from 'react'
import { Play, Pause, Square, RotateCcw, Activity, ChevronDown } from '@shared/ui/icons'
import { cn } from '@shared/utils'
import { SIM_REGISTRY, SIM_CATEGORIES } from '../types/sim-registry'
import type { SimulationCategory } from '@shared/types/simulation.types'

// Minimal stub — the toolbar shows a run/stop control and sim picker
// Full state management will be wired in once canvas context is established

interface SimButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  disabled?: boolean
}

function SimButton({ icon, label, onClick, variant = 'default', disabled }: SimButtonProps) {
  const base = 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-40'
  const variants = {
    default: 'bg-card border border-border text-foreground hover:bg-muted',
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
    danger: 'bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(base, variants[variant])}>
      {icon}
      {label}
    </button>
  )
}

export function SimulationToolbar() {
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [selectedType, setSelectedType] = useState('load-test')
  const [progress, setProgress] = useState(0)

  const selectedDef = SIM_REGISTRY.find(d => d.type === selectedType)
  const categorized = Object.entries(SIM_CATEGORIES) as [SimulationCategory, string][]

  const handleStart = () => {
    setIsRunning(true)
    setIsPaused(false)
    setProgress(0)
    // In full implementation, this calls useSimulation().start()
  }

  const handlePause = () => {
    setIsPaused(true)
  }

  const handleResume = () => {
    setIsPaused(false)
  }

  const handleStop = () => {
    setIsRunning(false)
    setIsPaused(false)
    setProgress(0)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        {/* Simulation type picker */}
        <button
          type="button"
          onClick={() => setShowPicker(p => !p)}
          disabled={isRunning}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:border-primary/30 disabled:opacity-50',
          )}
        >
          <Activity className="h-3 w-3 text-primary" />
          {selectedDef?.label ?? 'Select Simulation'}
          <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', showPicker && 'rotate-180')} />
        </button>

        <div className="h-5 w-px bg-border" />

        {/* Controls */}
        {!isRunning ? (
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
                onClick={handleResume}
              />
            ) : (
              <SimButton
                icon={<Pause className="h-3.5 w-3.5" />}
                label="Pause"
                onClick={handlePause}
              />
            )}
            <SimButton
              icon={<Square className="h-3 w-3" />}
              label="Stop"
              variant="danger"
              onClick={handleStop}
            />
          </>
        )}

        {/* Progress bar */}
        {isRunning && (
          <>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="w-8 text-right text-[10px] font-mono text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
          </>
        )}

        {/* Reset */}
        {!isRunning && progress > 0 && (
          <SimButton
            icon={<RotateCcw className="h-3 w-3" />}
            label="Reset"
            variant="ghost"
            onClick={() => setProgress(0)}
          />
        )}
      </div>

      {/* Simulation type dropdown */}
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
                        onClick={() => {
                          setSelectedType(def.type)
                          setShowPicker(false)
                        }}
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
    </div>
  )
}
