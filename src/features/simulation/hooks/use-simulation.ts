import { useState, useRef, useCallback, useEffect } from 'react'
import type { SimState, SimulationConfig, MetricsSnapshot } from '@shared/types/simulation.types'
import type { Canvas } from '@shared/types/design.types'
import { simulationAdapter, generateSimId } from '../services/simulation-adapter'
import { log } from '@shared/utils'

const TICK_MS = 1000

interface UseSimulationOptions {
  canvas: Canvas
  onMetricsUpdate?: (metrics: MetricsSnapshot) => void
}

export function useSimulation({ canvas, onMetricsUpdate }: UseSimulationOptions) {
  const [simState, setSimState] = useState<SimState | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(
    (config: Omit<SimulationConfig, 'id' | 'createdAt'>) => {
      const fullConfig: SimulationConfig = {
        ...config,
        id: generateSimId(),
        createdAt: new Date().toISOString(),
      }
      log.sim.info('Starting simulation', { type: fullConfig.type })
      const prepared = simulationAdapter.prepare(canvas, fullConfig)
      setSimState(prepared.initialState)
    },
    [canvas]
  )

  const pause = useCallback(() => {
    log.sim.info('Pausing simulation')
    setSimState(prev => prev ? { ...prev, status: 'paused' } : null)
  }, [])

  const resume = useCallback(() => {
    log.sim.info('Resuming simulation')
    setSimState(prev => prev ? { ...prev, status: 'running' } : null)
  }, [])

  const stop = useCallback(() => {
    log.sim.info('Stopping simulation')
    if (tickRef.current) clearInterval(tickRef.current)
    if (simState) simulationAdapter.teardown(simState)
    setSimState(null)
  }, [simState])

  // Tick loop
  useEffect(() => {
    if (!simState || simState.status !== 'running') {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
      return
    }

    tickRef.current = setInterval(() => {
      setSimState(prev => {
        if (!prev || prev.status !== 'running') return prev
        const next = simulationAdapter.step(prev, TICK_MS)
        if (onMetricsUpdate && next.currentMetrics) {
          onMetricsUpdate(next.currentMetrics)
        }
        if (next.status === 'completed') {
          log.sim.info('Simulation completed')
          if (tickRef.current) clearInterval(tickRef.current)
        }
        return next
      })
    }, TICK_MS)

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [simState?.status, onMetricsUpdate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [])

  const progressPercent = simState
    ? Math.min((simState.elapsedMs / simState.config.durationMs) * 100, 100)
    : 0

  return {
    simState,
    isRunning: simState?.status === 'running',
    isPaused: simState?.status === 'paused',
    isCompleted: simState?.status === 'completed',
    progressPercent,
    currentMetrics: simState?.currentMetrics ?? null,
    start,
    pause,
    resume,
    stop,
  }
}
