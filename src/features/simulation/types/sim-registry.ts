import type { SimTypeDefinition, SimulationCategory } from '@shared/types/simulation.types'

export const SIM_REGISTRY: SimTypeDefinition[] = [
  // ── Load & Traffic ────────────────────────────────────────────────────────
  {
    type: 'load-test',
    label: 'Load Test',
    description: 'Steady ramp-up to find throughput ceiling',
    category: 'load-traffic',
    params: [
      { key: 'rps', label: 'Target RPS', type: 'number', min: 1, max: 100000, step: 10, defaultValue: 100, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 10000, max: 3600000, step: 10000, defaultValue: 60000, required: true },
      { key: 'rampUpMs', label: 'Ramp Up Time', type: 'duration-ms', min: 0, max: 300000, step: 5000, defaultValue: 15000, required: false },
    ],
  },
  {
    type: 'spike-test',
    label: 'Spike Test',
    description: 'Sudden traffic burst, observe recovery time',
    category: 'load-traffic',
    params: [
      { key: 'rps', label: 'Spike RPS', type: 'number', min: 1, max: 100000, step: 10, defaultValue: 500, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 10000, max: 600000, step: 5000, defaultValue: 30000, required: true },
      { key: 'spikePercent', label: 'Spike at Progress', type: 'percentage', min: 0.1, max: 0.9, step: 0.05, defaultValue: 0.3, required: false },
    ],
  },
  {
    type: 'soak-test',
    label: 'Soak / Endurance',
    description: 'Sustained load over time to find degradation',
    category: 'load-traffic',
    params: [
      { key: 'rps', label: 'Sustained RPS', type: 'number', min: 1, max: 10000, step: 10, defaultValue: 50, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 60000, max: 3600000, step: 60000, defaultValue: 600000, required: true },
    ],
  },
  {
    type: 'stress-test',
    label: 'Stress Test',
    description: 'Push past capacity to find the breaking point',
    category: 'load-traffic',
    params: [
      { key: 'rps', label: 'Max RPS', type: 'number', min: 1, max: 500000, step: 100, defaultValue: 1000, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 10000, max: 600000, step: 10000, defaultValue: 120000, required: true },
    ],
  },
  {
    type: 'ramp-down',
    label: 'Ramp Down',
    description: 'Traffic drops sharply, see if system recovers',
    category: 'load-traffic',
    params: [
      { key: 'rps', label: 'Starting RPS', type: 'number', min: 1, max: 100000, step: 10, defaultValue: 200, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 10000, max: 300000, step: 5000, defaultValue: 60000, required: true },
    ],
  },

  // ── Failure & Chaos ───────────────────────────────────────────────────────
  {
    type: 'node-kill',
    label: 'Node Kill',
    description: 'Take down a service and observe cascade effects',
    category: 'failure-chaos',
    params: [
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 5000, max: 600000, step: 5000, defaultValue: 60000, required: true },
    ],
  },
  {
    type: 'slow-node',
    label: 'Slow Node (Gray Failure)',
    description: 'Inject latency without killing the service',
    category: 'failure-chaos',
    params: [
      { key: 'latencyMs', label: 'Added Latency', type: 'duration-ms', min: 100, max: 30000, step: 100, defaultValue: 2000, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 5000, max: 600000, step: 5000, defaultValue: 60000, required: true },
    ],
  },
  {
    type: 'db-failure',
    label: 'DB Failure',
    description: 'DB goes down, observe how dependents handle it',
    category: 'failure-chaos',
    params: [
      { key: 'errorRate', label: 'DB Error Rate', type: 'percentage', min: 0, max: 1, step: 0.05, defaultValue: 1, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 5000, max: 300000, step: 5000, defaultValue: 30000, required: true },
    ],
  },
  {
    type: 'cascade-failure',
    label: 'Cascade Failure',
    description: 'One failure triggers others upstream/downstream',
    category: 'failure-chaos',
    params: [
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 10000, max: 300000, step: 5000, defaultValue: 90000, required: true },
    ],
  },
  {
    type: 'thundering-herd',
    label: 'Thundering Herd',
    description: 'Many services retry simultaneously after recovery',
    category: 'failure-chaos',
    params: [
      { key: 'rps', label: 'Burst RPS', type: 'number', min: 1, max: 100000, step: 10, defaultValue: 2000, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 5000, max: 120000, step: 5000, defaultValue: 30000, required: true },
    ],
  },
  {
    type: 'random-chaos',
    label: 'Random Chaos',
    description: 'Randomly kill/degrade nodes (Chaos Monkey)',
    category: 'failure-chaos',
    params: [
      { key: 'killProbability', label: 'Kill Probability', type: 'percentage', min: 0, max: 0.5, step: 0.01, defaultValue: 0.1, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 10000, max: 600000, step: 10000, defaultValue: 120000, required: true },
    ],
  },

  // ── Scaling ───────────────────────────────────────────────────────────────
  {
    type: 'scale-out',
    label: 'Horizontal Scale Out',
    description: 'Add replicas and see latency/throughput improve',
    category: 'scaling',
    params: [
      { key: 'rps', label: 'Load RPS', type: 'number', min: 1, max: 100000, step: 10, defaultValue: 200, required: true },
      { key: 'targetReplicas', label: 'Target Replicas', type: 'number', min: 2, max: 100, step: 1, defaultValue: 5, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 10000, max: 300000, step: 5000, defaultValue: 90000, required: true },
    ],
  },
  {
    type: 'queue-backpressure',
    label: 'Queue Backpressure',
    description: 'Queue fills up, producers slow down or drop messages',
    category: 'scaling',
    params: [
      { key: 'rps', label: 'Producer RPS', type: 'number', min: 1, max: 10000, step: 10, defaultValue: 100, required: true },
      { key: 'consumerRate', label: 'Consumer Rate', type: 'number', min: 1, max: 10000, step: 10, defaultValue: 20, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 10000, max: 600000, step: 10000, defaultValue: 120000, required: true },
    ],
  },
  {
    type: 'cache-cold-start',
    label: 'Cache Cold Start',
    description: 'Cache is empty, all requests hit the DB',
    category: 'scaling',
    params: [
      { key: 'rps', label: 'RPS', type: 'number', min: 1, max: 10000, step: 10, defaultValue: 100, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 5000, max: 300000, step: 5000, defaultValue: 60000, required: true },
    ],
  },

  // ── Patterns ──────────────────────────────────────────────────────────────
  {
    type: 'retry-amplification',
    label: 'Retry Amplification',
    description: 'Bad retry config turns small failure into flood',
    category: 'patterns',
    params: [
      { key: 'errorRate', label: 'Error Rate', type: 'percentage', min: 0.01, max: 0.5, step: 0.01, defaultValue: 0.1, required: true },
      { key: 'retryMultiplier', label: 'Retry Multiplier', type: 'number', min: 1, max: 10, step: 0.5, defaultValue: 3, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 10000, max: 300000, step: 5000, defaultValue: 60000, required: true },
    ],
  },
  {
    type: 'rate-limiting',
    label: 'Rate Limiting',
    description: 'Throttling at one layer affects downstream',
    category: 'patterns',
    params: [
      { key: 'rps', label: 'Incoming RPS', type: 'number', min: 1, max: 100000, step: 10, defaultValue: 500, required: true },
      { key: 'limitRps', label: 'Rate Limit', type: 'number', min: 1, max: 100000, step: 10, defaultValue: 100, required: true },
      { key: 'durationMs', label: 'Duration', type: 'duration-ms', min: 10000, max: 300000, step: 5000, defaultValue: 60000, required: true },
    ],
  },
]

export const SIM_CATEGORIES: Record<SimulationCategory, string> = {
  'load-traffic': 'Load & Traffic',
  'failure-chaos': 'Failure & Chaos',
  scaling: 'Scaling',
  patterns: 'Pattern Scenarios',
}

export function getSimDef(type: string): SimTypeDefinition | undefined {
  return SIM_REGISTRY.find(d => d.type === type)
}
