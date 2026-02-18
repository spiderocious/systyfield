import type { Canvas } from './design.types'

// ─── Simulation Types ─────────────────────────────────────────────────────────

export type SimulationType =
  // Load & Traffic
  | 'load-test'
  | 'spike-test'
  | 'soak-test'
  | 'stress-test'
  | 'ramp-down'
  // Failure & Chaos
  | 'node-kill'
  | 'slow-node'
  | 'network-partition'
  | 'db-failure'
  | 'cascade-failure'
  | 'thundering-herd'
  | 'circuit-breaker'
  | 'timeout-storm'
  | 'random-chaos'
  // Scaling
  | 'scale-out'
  | 'scale-in'
  | 'connection-pool-exhaustion'
  | 'queue-backpressure'
  | 'cache-cold-start'
  | 'cache-invalidation-storm'
  // Pattern-specific
  | 'cqrs-divergence'
  | 'event-replay'
  | 'saga-partial-failure'
  | 'retry-amplification'
  | 'rate-limiting'

export type SimulationCategory =
  | 'load-traffic'
  | 'failure-chaos'
  | 'scaling'
  | 'patterns'

// ─── Simulation Param Field Schema ────────────────────────────────────────────

export type SimParamFieldType =
  | 'number'
  | 'percentage'
  | 'duration-ms'
  | 'node-selector'
  | 'multi-node-selector'
  | 'select'
  | 'boolean'

export interface SimParamField {
  key: string
  label: string
  type: SimParamFieldType
  description?: string
  min?: number
  max?: number
  step?: number
  unit?: string
  options?: Array<{ value: string; label: string }>
  defaultValue: number | string | boolean | string[]
  required: boolean
}

export interface SimTypeDefinition {
  type: SimulationType
  label: string
  description: string
  category: SimulationCategory
  params: SimParamField[]
}

// ─── Runtime Simulation State ─────────────────────────────────────────────────

export interface SimulationConfig {
  id: string
  name: string
  type: SimulationType
  params: Record<string, number | string | boolean | string[]>
  targetNodeIds: string[]
  durationMs: number
  createdAt: string
}

export interface NodeMetrics {
  nodeId: string
  latencyP50: number
  latencyP95: number
  latencyP99: number
  rps: number
  errorRate: number
  cpuPercent: number
  memoryPercent: number
  queueDepth?: number
  activeConnections?: number
}

export interface MetricsSnapshot {
  timestampMs: number
  nodes: NodeMetrics[]
  totalRps: number
  totalErrorRate: number
  avgLatencyP99: number
}

export interface SimState {
  simId: string
  config: SimulationConfig
  canvas: Canvas
  elapsedMs: number
  status: 'running' | 'paused' | 'completed' | 'error'
  nodeStates: Record<string, NodeSimState>
  metricsHistory: MetricsSnapshot[]
  currentMetrics: MetricsSnapshot | null
}

export interface NodeSimState {
  nodeId: string
  isDown: boolean
  isSlow: boolean
  loadFactor: number
  currentRps: number
  errorRate: number
  queueDepth: number
}

// ─── Adapter Interface ────────────────────────────────────────────────────────

export interface PreparedSim {
  simId: string
  config: SimulationConfig
  canvas: Canvas
  initialState: SimState
}

export interface SimulationAdapter {
  prepare(canvas: Canvas, config: SimulationConfig): PreparedSim
  step(state: SimState, deltaMs: number): SimState
  getMetrics(state: SimState): MetricsSnapshot
  teardown(state: SimState): void
}
