import type {
  SimulationAdapter,
  SimulationConfig,
  SimState,
  PreparedSim,
  MetricsSnapshot,
  NodeSimState,
} from '@shared/types/simulation.types'
import type { Canvas } from '@shared/types/design.types'
import { log } from '@shared/utils'
import { v4 as uuidv4 } from 'uuid'

// ─── Local (in-browser) Simulation Adapter ────────────────────────────────────
// This adapter runs the simulation entirely in the browser using pure math.
// The SimulationAdapter interface means this can be swapped for a backend-powered
// adapter with zero changes to the UI layer.

function jitter(base: number, variance: number): number {
  return base + (Math.random() * 2 - 1) * variance
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

export class LocalSimulationAdapter implements SimulationAdapter {
  prepare(canvas: Canvas, config: SimulationConfig): PreparedSim {
    log.sim.info('Preparing simulation', { type: config.type, nodes: canvas.nodes.length })

    const nodeStates: Record<string, NodeSimState> = {}
    for (const node of canvas.nodes) {
      nodeStates[node.id] = {
        nodeId: node.id,
        isDown: false,
        isSlow: false,
        loadFactor: 0,
        currentRps: 0,
        errorRate: 0,
        queueDepth: 0,
      }
    }

    const initialState: SimState = {
      simId: config.id,
      config,
      canvas,
      elapsedMs: 0,
      status: 'running',
      nodeStates,
      metricsHistory: [],
      currentMetrics: null,
    }

    return { simId: config.id, config, canvas, initialState }
  }

  step(state: SimState, deltaMs: number): SimState {
    const elapsed = state.elapsedMs + deltaMs
    const params = state.config.params
    const targetRps = (params.rps as number) ?? 100
    const errorRate = (params.errorRate as number) ?? 0
    const targetNodeIds = state.config.targetNodeIds
    const progressRatio = elapsed / state.config.durationMs

    // Update each node state
    const nextNodeStates: Record<string, NodeSimState> = {}

    for (const node of state.canvas.nodes) {
      const prev = state.nodeStates[node.id] ?? {
        nodeId: node.id, isDown: false, isSlow: false,
        loadFactor: 0, currentRps: 0, errorRate: 0, queueDepth: 0,
      }

      const isTarget = targetNodeIds.length === 0 || targetNodeIds.includes(node.id)

      let loadFactor = prev.loadFactor
      let nodeErrorRate = prev.errorRate
      let queueDepth = prev.queueDepth
      let isDown = prev.isDown
      let isSlow = prev.isSlow

      if (isTarget) {
        // Ramp up load based on simulation type
        const rampTarget = this.computeRampTarget(state.config.type, progressRatio, targetRps)
        loadFactor = clamp(
          jitter(rampTarget / (targetRps * 2 || 1), 0.05),
          0, 1
        )
        nodeErrorRate = clamp(jitter(errorRate, errorRate * 0.2), 0, 1)

        if (state.config.type === 'node-kill' || state.config.type === 'cascade-failure') {
          isDown = progressRatio > 0.2
        }
        if (state.config.type === 'slow-node') {
          isSlow = true
        }
        if (state.config.type === 'queue-backpressure') {
          queueDepth = Math.floor(progressRatio * 500 * jitter(1, 0.2))
        }
      }

      nextNodeStates[node.id] = {
        nodeId: node.id,
        isDown,
        isSlow,
        loadFactor,
        currentRps: isDown ? 0 : jitter(targetRps * loadFactor, targetRps * 0.1),
        errorRate: isDown ? 1 : nodeErrorRate,
        queueDepth,
      }
    }

    const metrics = this.computeMetrics(nextNodeStates, elapsed)
    const history = [...state.metricsHistory, metrics].slice(-300) // keep last 5 min @ 1s ticks

    const isDone = elapsed >= state.config.durationMs
    log.sim.debug('Simulation step', { elapsed, progressRatio: progressRatio.toFixed(2) })

    return {
      ...state,
      elapsedMs: elapsed,
      status: isDone ? 'completed' : 'running',
      nodeStates: nextNodeStates,
      metricsHistory: history,
      currentMetrics: metrics,
    }
  }

  getMetrics(state: SimState): MetricsSnapshot {
    return this.computeMetrics(state.nodeStates, state.elapsedMs)
  }

  teardown(_state: SimState): void {
    log.sim.info('Simulation torn down')
  }

  private computeRampTarget(type: string, progress: number, maxRps: number): number {
    switch (type) {
      case 'load-test':
        return maxRps * Math.min(progress * 2, 1)
      case 'spike-test':
        return progress > 0.3 && progress < 0.6 ? maxRps : maxRps * 0.3
      case 'stress-test':
        return maxRps * progress * 1.5
      case 'ramp-down':
        return maxRps * (1 - progress)
      default:
        return maxRps * 0.7
    }
  }

  private computeMetrics(
    nodeStates: Record<string, NodeSimState>,
    timestampMs: number
  ): MetricsSnapshot {
    const nodes = Object.values(nodeStates)
    const totalRps = nodes.reduce((sum, n) => sum + n.currentRps, 0)
    const totalErrorRate = nodes.length > 0
      ? nodes.reduce((sum, n) => sum + n.errorRate, 0) / nodes.length
      : 0

    const latencyBase = 20
    const avgLoadFactor = nodes.length > 0
      ? nodes.reduce((sum, n) => sum + n.loadFactor, 0) / nodes.length
      : 0

    const p50 = jitter(latencyBase * (1 + avgLoadFactor * 3), 5)
    const p95 = p50 * jitter(2.5, 0.3)
    const p99 = p95 * jitter(2, 0.2)

    return {
      timestampMs,
      nodes: nodes.map(ns => ({
        nodeId: ns.nodeId,
        latencyP50: clamp(jitter(p50, 5), 1, 10000),
        latencyP95: clamp(jitter(p95, 10), 1, 10000),
        latencyP99: clamp(jitter(p99, 15), 1, 10000),
        rps: ns.currentRps,
        errorRate: ns.errorRate,
        cpuPercent: clamp(ns.loadFactor * 100 * jitter(1, 0.1), 0, 100),
        memoryPercent: clamp(ns.loadFactor * 70 * jitter(1, 0.15), 0, 100),
        queueDepth: ns.queueDepth,
      })),
      totalRps,
      totalErrorRate,
      avgLatencyP99: clamp(p99, 1, 10000),
    }
  }
}

export const simulationAdapter: SimulationAdapter = new LocalSimulationAdapter()

export function generateSimId(): string {
  return uuidv4()
}
