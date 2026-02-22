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

    // Extract UI flow selections from params (serialized as JSON strings by toolbar)
    let apiResponseSelections: Record<string, string> | undefined
    let activeFlagValues: Record<string, boolean> | undefined
    if (config.type.startsWith('ui-')) {
      try {
        const rawBranches = config.params.apiResponseSelections
        if (rawBranches && typeof rawBranches === 'string') {
          apiResponseSelections = JSON.parse(rawBranches) as Record<string, string>
        }
      } catch { /* ignore */ }
      try {
        const rawFlags = config.params.activeFlagValues
        if (rawFlags && typeof rawFlags === 'string') {
          activeFlagValues = JSON.parse(rawFlags) as Record<string, boolean>
        }
      } catch { /* ignore */ }
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
      ...(apiResponseSelections ? { apiResponseSelections } : {}),
      ...(activeFlagValues ? { activeFlagValues } : {}),
    }

    // UI flow simulations have auto-durations
    if (config.type.startsWith('ui-')) {
      const uiDuration = config.type === 'ui-polling-viz' ? 30000
        : config.type === 'ui-branch-explorer' ? 8000
        : config.type === 'ui-flag-toggle' ? 5000
        : 20000 // flow-trace + api-response: 20s default for step animation
      if (!config.durationMs || config.durationMs <= 0) {
        initialState.config = { ...config, durationMs: uiDuration }
      }
    }

    return { simId: config.id, config: initialState.config, canvas, initialState }
  }

  // ── UI Flow simulation entry ───────────────────────────────────────────────

  private stepUIFlow(state: SimState, deltaMs: number): SimState {
    const elapsed = state.elapsedMs + deltaMs
    const type = state.config.type
    const params = state.config.params
    const isDone = elapsed >= state.config.durationMs

    const apiResponseSelections = state.apiResponseSelections ?? {}
    const activeFlagValues = state.activeFlagValues ?? {}

    const nodeById = new Map(state.canvas.nodes.map(n => [n.id, n]))
    const edgesBySource = new Map<string, typeof state.canvas.edges[0][]>()
    for (const edge of state.canvas.edges) {
      if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, [])
      edgesBySource.get(edge.source)!.push(edge)
    }

    const nextNodeStates: Record<string, NodeSimState> = {}
    const activeEdgeIds = new Set<string>()

    if (type === 'ui-flow-trace' || type === 'ui-api-response') {
      const startId = (params.startNodeId as string) || state.canvas.nodes[0]?.id
      if (!startId) {
        return { ...state, elapsedMs: elapsed, status: isDone ? 'completed' : 'running' }
      }

      // BFS — pick correct outgoing edge per gate type
      const trace: string[] = []
      const visitedTrace = new Set<string>()
      const queue = [startId]
      while (queue.length > 0) {
        const nodeId = queue.shift()!
        if (visitedTrace.has(nodeId)) continue
        visitedTrace.add(nodeId)
        trace.push(nodeId)
        const node = nodeById.get(nodeId)
        if (!node) continue
        const outEdges = edgesBySource.get(nodeId) ?? []

        if (node.type === 'api-call') {
          const sel = apiResponseSelections[nodeId]
          const matching = sel
            ? outEdges.filter(e => e.sourceHandle === `branch-${sel}`)
            : outEdges.slice(0, 1)
          for (const e of matching) { activeEdgeIds.add(e.id); queue.push(e.target) }
        } else if (node.type === 'decision-gate') {
          const edgeType = 'condition-true'
          const edge = outEdges.find(e => (e.data as Record<string, unknown>)?.edgeType === edgeType) ?? outEdges[0]
          if (edge) { activeEdgeIds.add(edge.id); queue.push(edge.target) }
        } else if (node.type === 'feature-flag-gate') {
          const d = node.data as unknown as Record<string, unknown>
          const flagName = d.flagName as string
          const isOn = activeFlagValues[flagName] ?? (d.defaultValue as boolean ?? false)
          const edgeType = isOn ? 'flag-on' : 'flag-off'
          const edge = outEdges.find(e => (e.data as Record<string, unknown>)?.edgeType === edgeType) ?? outEdges[0]
          if (edge) { activeEdgeIds.add(edge.id); queue.push(edge.target) }
        } else {
          for (const e of outEdges) { activeEdgeIds.add(e.id); queue.push(e.target) }
        }
      }

      // Animate: activate nodes one by one across the duration
      const stepDurationMs = state.config.durationMs / Math.max(trace.length, 1)
      const currentStep = Math.min(Math.floor(elapsed / stepDurationMs), trace.length - 1)

      for (let i = 0; i < trace.length; i++) {
        const nodeId = trace[i]
        const node = nodeById.get(nodeId)
        const isActive = i <= currentStep
        const prev = state.nodeStates[nodeId] ?? {
          nodeId, isDown: false, isSlow: false, loadFactor: 0, currentRps: 0, errorRate: 0, queueDepth: 0,
        }
        const d = node?.data as unknown as Record<string, unknown> | undefined
        const flagName = d?.flagName as string | undefined

        nextNodeStates[nodeId] = {
          ...prev,
          isActive,
          loadFactor: isActive ? 0.8 : 0.05,
          currentRps: isActive ? 1 : 0,
          selectedBranch: node?.type === 'api-call' ? (apiResponseSelections[nodeId] ?? undefined) : undefined,
          flagValue: node?.type === 'feature-flag-gate' && flagName !== undefined
            ? (activeFlagValues[flagName] ?? (d?.defaultValue as boolean ?? false))
            : undefined,
        }
      }
      // Mark inactive nodes
      for (const node of state.canvas.nodes) {
        if (!nextNodeStates[node.id]) {
          const prev = state.nodeStates[node.id] ?? {
            nodeId: node.id, isDown: false, isSlow: false, loadFactor: 0, currentRps: 0, errorRate: 0, queueDepth: 0,
          }
          nextNodeStates[node.id] = { ...prev, isActive: false, loadFactor: 0.03 }
        }
      }

    } else if (type === 'ui-branch-explorer') {
      // All branches run simultaneously — every node and edge is active
      for (const node of state.canvas.nodes) {
        const prev = state.nodeStates[node.id] ?? {
          nodeId: node.id, isDown: false, isSlow: false, loadFactor: 0, currentRps: 0, errorRate: 0, queueDepth: 0,
        }
        nextNodeStates[node.id] = { ...prev, isActive: true, loadFactor: clamp(jitter(0.6, 0.1), 0.3, 0.9), currentRps: 0.5 }
      }
      for (const edge of state.canvas.edges) activeEdgeIds.add(edge.id)

    } else if (type === 'ui-flag-toggle') {
      for (const node of state.canvas.nodes) {
        const prev = state.nodeStates[node.id] ?? {
          nodeId: node.id, isDown: false, isSlow: false, loadFactor: 0, currentRps: 0, errorRate: 0, queueDepth: 0,
        }
        if (node.type === 'feature-flag-gate') {
          const d = node.data as unknown as Record<string, unknown>
          const flagName = d.flagName as string
          const isOn = activeFlagValues[flagName] ?? (d.defaultValue as boolean ?? false)
          nextNodeStates[node.id] = { ...prev, isActive: true, loadFactor: 0.7, flagValue: isOn }
          // Activate matching downstream edges
          const outEdges = edgesBySource.get(node.id) ?? []
          const edgeType = isOn ? 'flag-on' : 'flag-off'
          for (const e of outEdges) {
            if ((e.data as Record<string, unknown>)?.edgeType === edgeType) activeEdgeIds.add(e.id)
          }
        } else {
          nextNodeStates[node.id] = { ...prev, isActive: false, loadFactor: 0.05 }
        }
      }

    } else if (type === 'ui-polling-viz') {
      const speedMultiplier = parseFloat((params.speedMultiplier as string) ?? '5')
      for (const node of state.canvas.nodes) {
        const prev = state.nodeStates[node.id] ?? {
          nodeId: node.id, isDown: false, isSlow: false, loadFactor: 0, currentRps: 0, errorRate: 0, queueDepth: 0,
        }
        if (node.type === 'polling-node') {
          const d = node.data as unknown as Record<string, unknown>
          const intervalMs = (d.intervalMs as number) ?? 20000
          const effectiveElapsed = elapsed * speedMultiplier
          const cycle = Math.floor(effectiveElapsed / intervalMs)
          const cycleProgress = (effectiveElapsed % intervalMs) / intervalMs
          const isPulsing = cycleProgress < 0.15
          nextNodeStates[node.id] = {
            ...prev, isActive: true,
            loadFactor: isPulsing ? 0.9 : 0.1,
            pollingCycle: cycle,
            currentRps: isPulsing ? 1 : 0,
          }
          if (isPulsing) {
            for (const e of edgesBySource.get(node.id) ?? []) activeEdgeIds.add(e.id)
          }
        } else {
          nextNodeStates[node.id] = { ...prev, isActive: false, loadFactor: 0.03 }
        }
      }
    }

    const metrics = this.computeMetrics(nextNodeStates, elapsed, state.canvas)
    const history = [...state.metricsHistory, metrics].slice(-300)
    log.sim.debug('UI flow simulation step', { elapsed, type })

    return {
      ...state,
      elapsedMs: elapsed,
      status: isDone ? 'completed' : 'running',
      nodeStates: nextNodeStates,
      metricsHistory: history,
      currentMetrics: metrics,
      activeEdgeIds,
      apiResponseSelections,
      activeFlagValues,
    }
  }

  step(state: SimState, deltaMs: number): SimState {
    // Route UI flow simulations to their own handler
    if (state.config.type.startsWith('ui-')) {
      return this.stepUIFlow(state, deltaMs)
    }
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
