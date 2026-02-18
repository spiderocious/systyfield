import type {
  SimulationAdapter,
  SimulationConfig,
  SimState,
  PreparedSim,
  MetricsSnapshot,
  NodeSimState,
} from '@shared/types/simulation.types'
import type { Canvas, DesignNode } from '@shared/types/design.types'
import { log } from '@shared/utils'
import { v4 as uuidv4 } from 'uuid'

// ─── Local (in-browser) Simulation Adapter ────────────────────────────────────
// This adapter runs the simulation entirely in the browser using pure math.
// v2: Now respects node config (replicas, cpu, ram, coldStartMs, hitRateTarget,
// maxQueueDepth, connectionPoolSize) to compute realistic saturation thresholds.

function jitter(base: number, variance: number): number {
  return base + (Math.random() * 2 - 1) * variance
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

// ─── Node capacity helpers ───────────────────────────────────────────────────

/**
 * Compute the RPS capacity of a node based on its config.
 * Higher replicas/cpu/ram → more headroom before saturation.
 */
function computeNodeCapacity(node: DesignNode): number {
  const d = node.data as unknown as Record<string, unknown>
  const nodeType = node.type

  switch (nodeType) {
    case 'microservice': {
      const replicas = (d.replicas as number) ?? 1
      const cpu = (d.cpu as number) ?? 1
      const ram = (d.ram as number) ?? 2
      // Base: 100 RPS per vCPU per replica, scaled by RAM
      return replicas * cpu * 100 * Math.sqrt(ram / 2)
    }
    case 'serverless': {
      const concurrency = (d.concurrencyLimit as number) ?? 100
      const mem = (d.memoryMB as number) ?? 256
      return concurrency * (mem / 256) * 50
    }
    case 'database': {
      const pool = (d.connectionPoolSize as number) ?? 10
      const maxConn = (d.maxConnections as number) ?? 100
      const replicas = (d.readReplicas as number) ?? 0
      return Math.min(pool, maxConn) * 20 * (1 + replicas * 0.5)
    }
    case 'cache': {
      const mem = (d.maxMemoryMB as number) ?? 512
      return (mem / 64) * 1000  // caches handle enormous throughput
    }
    case 'queue': {
      const consumers = (d.maxConcurrentConsumers as number) ?? 5
      const concurrency = (d.consumerConcurrency as number) ?? 1
      return consumers * concurrency * 200
    }
    case 'load-balancer': {
      const maxConn = (d.maxConnections as number) ?? 10000
      return maxConn * 0.1
    }
    case 'container-orchestrator': {
      const nodes = (d.nodeCount as number) ?? 3
      const cpu = (d.cpuRequestsCores as number) ?? 2
      return nodes * cpu * 150
    }
    case 'background-worker': {
      const concurrency = (d.concurrency as number) ?? 5
      return concurrency * 20
    }
    case 'api-gateway': {
      const rateLimit = (d.rateLimitRps as number) ?? 1000
      return rateLimit > 0 ? rateLimit : 5000
    }
    default:
      return 500 // default capacity for infra nodes
  }
}

/**
 * Compute the base latency contribution of a node in ms.
 */
function computeBaseLatency(node: DesignNode): number {
  const d = node.data as unknown as Record<string, unknown>
  switch (node.type) {
    case 'database': {
      const indexed = (d.indexed as boolean) ?? true
      return indexed ? jitter(5, 2) : jitter(50, 10)
    }
    case 'cache':
      return jitter(1, 0.5)
    case 'queue':
      return jitter(3, 1)
    case 'serverless': {
      // Will be adjusted for cold starts in step()
      return jitter(10, 3)
    }
    case 'external-service': {
      return jitter(80, 30)
    }
    case 'api-gateway':
      return jitter(3, 1)
    case 'reverse-proxy':
      return jitter(2, 0.5)
    default:
      return jitter(5, 2)
  }
}

export class LocalSimulationAdapter implements SimulationAdapter {
  // Track which serverless nodes have been warmed up (for cold start simulation)
  private warmNodes = new Set<string>()
  // Track active replicas per node for autoscale simulation
  private activeReplicas: Record<string, number> = {}

  prepare(canvas: Canvas, config: SimulationConfig): PreparedSim {
    log.sim.info('Preparing simulation', { type: config.type, nodes: canvas.nodes.length })

    this.warmNodes.clear()
    this.activeReplicas = {}

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
      // Initialize active replicas from node config
      const replicas = (node.data as unknown as Record<string, unknown>).replicas as number ?? 1
      this.activeReplicas[node.id] = replicas
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
    const baseErrorRate = (params.errorRate as number) ?? 0
    const targetNodeIds = state.config.targetNodeIds
    const progressRatio = elapsed / state.config.durationMs
    const recoveryDelaySec = (params.recoveryDelaySec as number) ?? 30

    const nextNodeStates: Record<string, NodeSimState> = {}

    for (const node of state.canvas.nodes) {
      const prev = state.nodeStates[node.id] ?? {
        nodeId: node.id, isDown: false, isSlow: false,
        loadFactor: 0, currentRps: 0, errorRate: 0, queueDepth: 0,
      }

      const isTarget = targetNodeIds.length === 0 || targetNodeIds.includes(node.id)
      const nodeData = node.data as unknown as Record<string, unknown>
      const capacity = computeNodeCapacity(node)

      let loadFactor = prev.loadFactor
      let nodeErrorRate = prev.errorRate
      let queueDepth = prev.queueDepth
      let isDown = prev.isDown
      let isSlow = prev.isSlow
      let nodeLatencyBonus = 0

      if (isTarget) {
        // Compute current RPS ramp
        const rampTarget = this.computeRampTarget(state.config.type, progressRatio, targetRps)

        // ── Autoscale: expand replicas when CPU overloaded ────────────────────
        if (node.type === 'microservice' || node.type === 'container-orchestrator') {
          const autoscaleEnabled = (nodeData.autoscaleEnabled as boolean) ?? false
          const maxReplicas = (nodeData.maxReplicas as number) ?? 1
          const scaleCpuThreshold = (nodeData.scaleCpuThreshold as number) ?? 70
          const currentReplicas = this.activeReplicas[node.id] ?? 1
          const currentCpu = prev.loadFactor * 100

          if (autoscaleEnabled && currentCpu > scaleCpuThreshold && currentReplicas < maxReplicas) {
            // Scale out (with cold start delay)
            this.activeReplicas[node.id] = Math.min(currentReplicas + 1, maxReplicas)
          }
        }

        // Re-derive capacity with current active replicas
        const activeReplicas = this.activeReplicas[node.id] ?? 1
        const effectiveCapacity = capacity * (activeReplicas / Math.max(1, (nodeData.replicas as number ?? 1)))

        loadFactor = clamp(jitter(rampTarget / Math.max(effectiveCapacity, 1), 0.05), 0, 1)
        nodeErrorRate = clamp(jitter(baseErrorRate, baseErrorRate * 0.2), 0, 1)

        // ── Cascade Failure ────────────────────────────────────────────────────
        if (state.config.type === 'node-kill' || state.config.type === 'cascade-failure') {
          if (progressRatio > 0.2 && progressRatio < (0.2 + recoveryDelaySec / (state.config.durationMs / 1000))) {
            isDown = true
          } else if (progressRatio >= (0.2 + recoveryDelaySec / (state.config.durationMs / 1000))) {
            // Recovery phase — gradual ramp back up
            isDown = false
            const recoveryProgress = (progressRatio - (0.2 + recoveryDelaySec / (state.config.durationMs / 1000))) * 3
            loadFactor = clamp(loadFactor * recoveryProgress, 0, loadFactor)
          }
        }

        // ── Slow Node ─────────────────────────────────────────────────────────
        if (state.config.type === 'slow-node') {
          isSlow = true
          nodeLatencyBonus = jitter(500, 100) // +500ms when slow
        }

        // ── Queue Back-pressure ────────────────────────────────────────────────
        if (state.config.type === 'queue-backpressure' || node.type === 'queue') {
          const maxDepth = (nodeData.maxQueueDepth as number) ?? 10000
          const fillRate = rampTarget / Math.max(effectiveCapacity, 1)
          queueDepth = Math.floor(maxDepth * clamp(progressRatio * fillRate * jitter(1, 0.2), 0, 1))

          // Non-linear latency spike as queue fills
          const fillPercent = queueDepth / maxDepth
          if (fillPercent > 0.8) {
            nodeLatencyBonus += jitter(fillPercent * 2000, 300) // up to 2s extra
            nodeErrorRate = clamp(nodeErrorRate + (fillPercent - 0.8) * 5, 0, 1)
          }
        }

        // ── Cache Hit/Miss Simulation ──────────────────────────────────────────
        if (node.type === 'cache') {
          const hitRateTarget = (nodeData.hitRateTarget as number) ?? 80
          // Warm up from 0% hit rate over first 30% of run
          const warmupFactor = Math.min(progressRatio / 0.3, 1)
          const currentHitRate = hitRateTarget * warmupFactor
          // Miss rate increases load on origin (downstream database)
          const missRate = (100 - currentHitRate) / 100
          loadFactor = clamp(loadFactor * (1 - missRate * 0.5), 0, 1)
        }

        // ── Cold Start Simulation (Serverless) ────────────────────────────────
        if (node.type === 'serverless' && !this.warmNodes.has(node.id)) {
          const coldStartMs = (nodeData.coldStartMs as number) ?? 300
          const provisionedConcurrency = (nodeData.provisionedConcurrency as number) ?? 0
          if (provisionedConcurrency === 0) {
            // First request gets cold start penalty
            nodeLatencyBonus += coldStartMs
            if (elapsed > 2000) {
              this.warmNodes.add(node.id) // warm after first few seconds
            }
          }
        }

        // ── DB Connection Pool Exhaustion ─────────────────────────────────────
        if (node.type === 'database') {
          const poolSize = (nodeData.connectionPoolSize as number) ?? 10
          const maxConn = (nodeData.maxConnections as number) ?? 100
          const effectivePool = Math.min(poolSize, maxConn)
          const requestedConnections = rampTarget * 0.1 // rough estimate
          if (requestedConnections > effectivePool * 0.9) {
            nodeErrorRate = clamp(nodeErrorRate + 0.1, 0, 1)
            nodeLatencyBonus += jitter(200, 50)
          }
        }

        // ── Circuit Breaker ───────────────────────────────────────────────────
        if (node.type === 'microservice') {
          const cbEnabled = (nodeData.circuitBreakerEnabled as boolean) ?? false
          const cbThreshold = (nodeData.circuitBreakerThreshold as number) ?? 50
          if (cbEnabled && nodeErrorRate * 100 > cbThreshold) {
            // Circuit is open — return fast errors instead of slow failures
            nodeLatencyBonus = 0
            nodeErrorRate = clamp(nodeErrorRate * 1.5, 0, 1)
          }
        }
      }

      const currentRps = isDown ? 0 : jitter(targetRps * loadFactor, targetRps * 0.1)
      const baseLatency = computeBaseLatency(node)

      nextNodeStates[node.id] = {
        nodeId: node.id,
        isDown,
        isSlow,
        loadFactor,
        currentRps,
        errorRate: isDown ? 1 : nodeErrorRate,
        queueDepth,
        baseLatencyMs: baseLatency + nodeLatencyBonus,
      }
    }

    const metrics = this.computeMetrics(nextNodeStates, elapsed, state.canvas)
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
    return this.computeMetrics(state.nodeStates, state.elapsedMs, state.canvas)
  }

  teardown(_state: SimState): void {
    this.warmNodes.clear()
    this.activeReplicas = {}
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
      case 'soak-test':
        return maxRps * 0.7
      case 'thundering-herd':
        // Sudden burst at 40% then normal
        return progress > 0.35 && progress < 0.5 ? maxRps * 3 : maxRps * 0.5
      case 'cache-cold-start':
        // Normal load but cache starts cold
        return maxRps * Math.min(progress * 1.5, 1)
      default:
        return maxRps * 0.7
    }
  }

  private computeMetrics(
    nodeStates: Record<string, NodeSimState>,
    timestampMs: number,
    canvas: Canvas,
  ): MetricsSnapshot {
    const nodes = Object.values(nodeStates)

    // Build adjacency for edge-aware latency propagation
    const adjList = new Map<string, string[]>()
    for (const edge of canvas.edges) {
      if (!adjList.has(edge.source)) adjList.set(edge.source, [])
      adjList.get(edge.source)!.push(edge.target)
    }

    // Compute path latency for each node (sum along longest path to it)
    const pathLatency = new Map<string, number>()
    function getPathLatency(nodeId: string, visited = new Set<string>()): number {
      if (pathLatency.has(nodeId)) return pathLatency.get(nodeId)!
      if (visited.has(nodeId)) return 0
      visited.add(nodeId)
      const ns = nodeStates[nodeId]
      const selfLatency = ns?.baseLatencyMs ?? (ns?.isSlow ? 500 : 5)
      const children = adjList.get(nodeId) ?? []
      const childMax = children.reduce((max, cid) => Math.max(max, getPathLatency(cid, new Set(visited))), 0)
      const result = selfLatency + childMax
      pathLatency.set(nodeId, result)
      return result
    }
    for (const node of canvas.nodes) getPathLatency(node.id)

    const totalRps = nodes.reduce((sum, n) => sum + n.currentRps, 0)
    const totalErrorRate = nodes.length > 0
      ? nodes.reduce((sum, n) => sum + n.errorRate, 0) / nodes.length
      : 0

    const avgLoadFactor = nodes.length > 0
      ? nodes.reduce((sum, n) => sum + n.loadFactor, 0) / nodes.length
      : 0

    // Use path-aware p99 for the "root" nodes (no incoming edges)
    const rootNodes = canvas.nodes.filter(n => !canvas.edges.some(e => e.target === n.id))
    const rootPathLatency = rootNodes.length > 0
      ? rootNodes.reduce((sum, n) => sum + (pathLatency.get(n.id) ?? 5), 0) / rootNodes.length
      : 20

    const p50Base = Math.max(rootPathLatency * 0.5, 5) + jitter(5, 2)
    const p50 = jitter(p50Base * (1 + avgLoadFactor * 2), 5)
    const p95 = p50 * jitter(2.2, 0.2)
    const p99 = p95 * jitter(1.8, 0.15)

    return {
      timestampMs,
      nodes: nodes.map(ns => {
        const nodePathLatency = pathLatency.get(ns.nodeId) ?? 5
        return {
          nodeId: ns.nodeId,
          latencyP50: clamp(jitter(nodePathLatency * 0.6, nodePathLatency * 0.1), 1, 10000),
          latencyP95: clamp(jitter(nodePathLatency, nodePathLatency * 0.2), 1, 10000),
          latencyP99: clamp(jitter(nodePathLatency * 1.5, nodePathLatency * 0.3), 1, 10000),
          rps: ns.currentRps,
          errorRate: ns.errorRate,
          cpuPercent: clamp(ns.loadFactor * 100 * jitter(1, 0.1), 0, 100),
          memoryPercent: clamp(ns.loadFactor * 70 * jitter(1, 0.15), 0, 100),
          queueDepth: ns.queueDepth,
        }
      }),
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
