// ─── Mode ────────────────────────────────────────────────────────────────────

export type DesignMode = 'system' | 'ui' | 'service'

// ─── Node Types ──────────────────────────────────────────────────────────────

// System mode node types
export type SystemNodeType =
  | 'microservice'
  | 'database'
  | 'queue'
  | 'cache'
  | 'load-balancer'
  | 'cdn'
  | 'serverless'

// UI mode node types
export type UINodeType = 'screen' | 'api-binding' | 'component'

// Service mode node types
export type ServiceNodeType =
  | 'api-endpoint'
  | 'validation-step'
  | 'db-step'
  | 'response-config'

export type NodeType = SystemNodeType | UINodeType | ServiceNodeType

// ─── Node Data (discriminated union) ─────────────────────────────────────────

export interface MicroserviceData {
  type: 'microservice'
  language: string
  framework: string
  replicas: number
  cpuLimit: string
  memoryLimit: string
  port: number
  env: Record<string, string>
}

export interface DatabaseData {
  type: 'database'
  engine: 'postgres' | 'mysql' | 'mongodb' | 'cassandra' | 'redis' | 'dynamodb' | 'sqlite'
  storageGB: number
  replication: boolean
  connectionPoolSize: number
  readReplicas: number
}

export interface QueueData {
  type: 'queue'
  engine: 'rabbitmq' | 'kafka' | 'sqs' | 'pubsub' | 'redis'
  maxConcurrentConsumers: number
  messageRetentionHours: number
  dlqEnabled: boolean
}

export interface CacheData {
  type: 'cache'
  engine: 'redis' | 'memcached' | 'cloudflare'
  maxMemoryMB: number
  evictionPolicy: 'lru' | 'lfu' | 'fifo'
  ttlSeconds: number
}

export interface LoadBalancerData {
  type: 'load-balancer'
  algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'random'
  healthCheckInterval: number
  maxConnections: number
}

export interface CdnData {
  type: 'cdn'
  provider: 'cloudflare' | 'cloudfront' | 'fastly' | 'akamai'
  ttlSeconds: number
  cacheRules: string[]
}

export interface ServerlessData {
  type: 'serverless'
  runtime: 'node' | 'python' | 'go' | 'java' | 'rust'
  memoryMB: number
  timeoutSeconds: number
  concurrencyLimit: number
}

export interface ScreenData {
  type: 'screen'
  name: string
  imageUrl?: string
  apiBindings: Array<{
    regionId: string
    nodeId: string
    responsePath: string
  }>
}

export interface ApiBindingData {
  type: 'api-binding'
  method: HttpMethod
  path: string
  mockResponses: MockResponse[]
}

export interface ComponentData {
  type: 'component'
  name: string
  renderCondition?: string
  dynamicProps: string[]
}

export interface ApiEndpointData {
  type: 'api-endpoint'
  method: HttpMethod
  path: string
  protocol: 'rest' | 'grpc' | 'graphql'
  authRequired: boolean
  payloadSchema: JsonSchema | null
  rateLimit: number
}

export interface ValidationStepData {
  type: 'validation-step'
  rules: ValidationRule[]
  onFailure: 'reject' | 'sanitize' | 'default'
}

export interface DbStepData {
  type: 'db-step'
  operation: 'read' | 'write' | 'read-write'
  collection: string
  indexed: boolean
  queryTimeoutMs: number
}

export interface ResponseConfigData {
  type: 'response-config'
  successStatus: number
  errorStatus: number
  responseShape: JsonSchema | null
  cacheControl: string
}

export type NodeData =
  | MicroserviceData
  | DatabaseData
  | QueueData
  | CacheData
  | LoadBalancerData
  | CdnData
  | ServerlessData
  | ScreenData
  | ApiBindingData
  | ComponentData
  | ApiEndpointData
  | ValidationStepData
  | DbStepData
  | ResponseConfigData

// ─── Edge Types ───────────────────────────────────────────────────────────────

export type EdgeType = 'http' | 'grpc' | 'graphql' | 'event' | 'db-query' | 'navigation' | 'default'

export interface EdgeData {
  label?: string
  latencyMs?: number
  protocol?: string
}

// ─── Canvas Primitives ────────────────────────────────────────────────────────

export interface CanvasPosition {
  x: number
  y: number
}

export interface CanvasViewport {
  x: number
  y: number
  zoom: number
}

export interface DesignNode {
  id: string
  type: NodeType
  position: CanvasPosition
  label: string
  data: NodeData
  selected?: boolean
}

export interface DesignEdge {
  id: string
  source: string
  target: string
  type: EdgeType
  label?: string
  data?: EdgeData
}

export interface Canvas {
  nodes: DesignNode[]
  edges: DesignEdge[]
  viewport: CanvasViewport
}

// ─── Design Document ──────────────────────────────────────────────────────────

export interface DesignMeta {
  title: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Design {
  id: string
  editToken: string
  viewToken: string
  mode: DesignMode
  meta: DesignMeta
  canvas: Canvas
  simulations: SimulationConfigRef[]
}

export interface DesignSummary {
  id: string
  viewToken: string
  mode: DesignMode
  meta: DesignMeta
}

export interface SimulationConfigRef {
  id: string
  name: string
  type: string
}

// ─── Supporting Types ─────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ValidationRule {
  field: string
  rule: 'required' | 'min' | 'max' | 'pattern' | 'enum' | 'custom'
  value?: string | number | string[]
}

export interface MockResponse {
  name: string
  status: number
  body: Record<string, unknown>
  probability: number
}

export type JsonSchema = Record<string, unknown>
