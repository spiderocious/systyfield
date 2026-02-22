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
  // ── UI Mode — Behavioral Flow ────────────────────────────────────────────
  | 'ui-flow-trace'       // step-by-step path trace through decision gates
  | 'ui-branch-explorer'  // explore all branches of a flow simultaneously
  | 'ui-flag-toggle'      // toggle feature flags and see downstream impact
  | 'ui-api-response'     // pick an api-call response branch and trace it
  | 'ui-polling-viz'      // visualize polling node cycles

export type SimulationCategory =
  | 'load-traffic'
  | 'failure-chaos'
  | 'scaling'
  | 'patterns'
  | 'ui-flow'

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
  /** Which design modes this simulation applies to. Defaults to system+service if omitted. */
  modes?: Array<'system' | 'ui' | 'service'>
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
  // UI flow fields
  activeEdgeIds?: Set<string>                       // edges currently "lit" in the trace
  apiResponseSelections?: Record<string, string>    // nodeId → selected branch value
  activeFlagValues?: Record<string, boolean>        // flagName → current value for this run
  flowTraceStep?: number                            // current step index in step-by-step trace
}

export interface NodeSimState {
  nodeId: string
  isDown: boolean
  isSlow: boolean
  loadFactor: number
  currentRps: number
  errorRate: number
  queueDepth: number
  baseLatencyMs?: number
  activeReplicas?: number
  // UI flow fields
  isActive?: boolean          // node is in the current active path
  selectedBranch?: string     // for api-call nodes: which response branch is selected (branch value)
  flagValue?: boolean         // for feature-flag-gate: current flag state in this sim
  pollingCycle?: number       // for polling-node: current cycle number
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
