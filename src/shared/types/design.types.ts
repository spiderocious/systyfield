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
  // Cloud infra additions
  | 'api-gateway'
  | 'object-storage'
  | 'auth-service'
  | 'email-service'
  | 'external-service'
  | 'background-worker'
  | 'cron-scheduler'
  | 'websocket-server'
  | 'feature-flags'
  | 'vpc-zone'
  | 'observability'
  | 'message-broker'
  | 'dns'
  | 'waf'
  | 'reverse-proxy'
  | 'search-engine'
  | 'container-orchestrator'
  | 'data-warehouse'
  | 'stream-processor'
  | 'service-mesh'

// UI mode node types
export type UINodeType = 'screen' | 'api-binding' | 'component'

// Service mode node types
export type ServiceNodeType =
  | 'api-endpoint'
  | 'validation-step'
  | 'db-step'
  | 'response-config'
  | 'middleware-step'
  | 'branch-step'
  | 'error-handler'

export type NodeType = SystemNodeType | UINodeType | ServiceNodeType

// ─── Node Data (discriminated union) ─────────────────────────────────────────

export interface MicroserviceData {
  type: 'microservice'
  language: string
  framework: string
  replicas: number
  // Enhanced: vertical scaling
  instanceType: string
  cpu: number
  ram: number
  // Enhanced: autoscale
  autoscaleEnabled: boolean
  minReplicas: number
  maxReplicas: number
  scaleCpuThreshold: number
  scaleRpsThreshold: number
  // Enhanced: reliability
  circuitBreakerEnabled: boolean
  circuitBreakerThreshold: number
  requestTimeoutMs: number
  healthCheckPath: string
  // Existing
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
  // Enhanced
  instanceClass: string
  multiAZ: boolean
  maxConnections: number
  backupRetentionDays: number
  iops: number
  cacheSizeMB: number
  slowQueryThresholdMs: number
}

export interface QueueData {
  type: 'queue'
  engine: 'rabbitmq' | 'kafka' | 'sqs' | 'pubsub' | 'redis'
  maxConcurrentConsumers: number
  messageRetentionHours: number
  dlqEnabled: boolean
  // Enhanced
  maxQueueDepth: number
  messageSizeBytes: number
  visibilityTimeoutSec: number
  prefetchCount: number
  consumerConcurrency: number
}

export interface CacheData {
  type: 'cache'
  engine: 'redis' | 'memcached' | 'cloudflare'
  maxMemoryMB: number
  evictionPolicy: 'lru' | 'lfu' | 'fifo'
  ttlSeconds: number
  // Enhanced
  clusterMode: 'single' | 'cluster' | 'sentinel'
  maxConnections: number
  persistence: 'rdb' | 'aof' | 'none'
  hitRateTarget: number
}

export interface LoadBalancerData {
  type: 'load-balancer'
  algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'random' | 'weighted'
  healthCheckInterval: number
  maxConnections: number
  // Enhanced
  connectionTimeoutMs: number
  requestTimeoutMs: number
  stickySessions: boolean
  sslTermination: boolean
  rateLimitPerIp: number
}

export interface CdnData {
  type: 'cdn'
  provider: 'cloudflare' | 'cloudfront' | 'fastly' | 'akamai'
  ttlSeconds: number
  cacheRules: string[]
  // Enhanced
  originPullTimeoutMs: number
  cacheHitRateTarget: number
  bandwidthGBMonth: number
  regions: string[]
}

export interface ServerlessData {
  type: 'serverless'
  runtime: 'node' | 'python' | 'go' | 'java' | 'rust'
  memoryMB: number
  timeoutSeconds: number
  concurrencyLimit: number
  // Enhanced
  coldStartMs: number
  provisionedConcurrency: number
  maxPayloadSizeKb: number
  region: string
}

// ─── New Cloud Infrastructure Node Data ──────────────────────────────────────

export interface ApiGatewayData {
  type: 'api-gateway'
  provider: 'kong' | 'aws' | 'nginx' | 'traefik' | 'envoy'
  rateLimitRps: number
  authProvider: string
  throttlingEnabled: boolean
  cacheEnabled: boolean
  cacheTtlSeconds: number
  corsEnabled: boolean
}

export interface ObjectStorageData {
  type: 'object-storage'
  provider: 's3' | 'gcs' | 'r2' | 'azure-blob' | 'minio'
  capacityGB: number
  region: string
  versioning: boolean
  isPublic: boolean
  replicationRegions: string[]
}

export interface AuthServiceData {
  type: 'auth-service'
  provider: 'auth0' | 'cognito' | 'keycloak' | 'firebase' | 'custom'
  tokenType: 'jwt' | 'opaque' | 'session'
  tokenTtlSeconds: number
  mfaEnabled: boolean
  ssoEnabled: boolean
  oauthProviders: string[]
}

export interface EmailServiceData {
  type: 'email-service'
  provider: 'sendgrid' | 'ses' | 'mailgun' | 'postmark' | 'twilio'
  sendRatePerMinute: number
  bounceThresholdPercent: number
  transactional: boolean
  templatesEnabled: boolean
}

export interface ExternalServiceData {
  type: 'external-service'
  name: string
  baseUrl: string
  timeoutMs: number
  retries: number
  rateLimitRps: number
}

export interface BackgroundWorkerData {
  type: 'background-worker'
  runtime: 'node' | 'python' | 'go' | 'java' | 'ruby'
  concurrency: number
  jobQueueEngine: string
  retryAttempts: number
  retryDelayMs: number
  jobTimeoutMs: number
}

export interface CronSchedulerData {
  type: 'cron-scheduler'
  schedule: string
  timezone: string
  jobName: string
  retryOnFailure: boolean
  maxRetries: number
  timeoutMs: number
}

export interface WebsocketServerData {
  type: 'websocket-server'
  runtime: 'node' | 'go' | 'rust'
  maxConnections: number
  heartbeatIntervalMs: number
  messageRateLimit: number
  compressionEnabled: boolean
  protocol: 'ws' | 'wss'
}

export interface FeatureFlagsData {
  type: 'feature-flags'
  provider: 'launchdarkly' | 'flagsmith' | 'unleash' | 'growthbook' | 'custom'
  flagCount: number
  evaluationsPerSecond: number
  sdkType: 'server' | 'client'
}

export interface VpcZoneData {
  type: 'vpc-zone'
  cidr: string
  subnetType: 'public' | 'private' | 'isolated'
  availabilityZones: number
  natGateway: boolean
  vpcPeering: boolean
}

export interface ObservabilityData {
  type: 'observability'
  provider: 'datadog' | 'prometheus' | 'grafana' | 'newrelic' | 'dynatrace'
  retentionDays: number
  alertsEnabled: boolean
  tracingEnabled: boolean
  loggingEnabled: boolean
  samplingRate: number
}

export interface MessageBrokerData {
  type: 'message-broker'
  brokerType: 'eventbridge' | 'sns' | 'pubsub' | 'nats' | 'activemq'
  topics: number
  subscriptions: number
  messageRetentionHours: number
  dlqEnabled: boolean
  fanoutEnabled: boolean
}

export interface DnsData {
  type: 'dns'
  provider: 'route53' | 'cloudflare' | 'googledns' | 'custom'
  ttlSeconds: number
  failoverEnabled: boolean
  geolocationRouting: boolean
  healthCheckEnabled: boolean
}

export interface WafData {
  type: 'waf'
  provider: 'aws-waf' | 'cloudflare' | 'imperva' | 'akamai'
  ruleCount: number
  blockMode: boolean
  ddosProtection: boolean
  rateLimitRps: number
  ipAllowlistEnabled: boolean
}

export interface ReverseProxyData {
  type: 'reverse-proxy'
  software: 'nginx' | 'caddy' | 'haproxy' | 'traefik' | 'envoy'
  upstreamCount: number
  cacheEnabled: boolean
  compressionEnabled: boolean
  sslTermination: boolean
  timeoutMs: number
}

export interface SearchEngineData {
  type: 'search-engine'
  engine: 'elasticsearch' | 'opensearch' | 'typesense' | 'algolia' | 'meilisearch'
  indexCount: number
  shards: number
  replicas: number
  documentsCount: number
  queriesPerSecond: number
}

export interface ContainerOrchestratorData {
  type: 'container-orchestrator'
  platform: 'kubernetes' | 'ecs' | 'nomad' | 'swarm'
  nodeCount: number
  autoscaleEnabled: boolean
  maxNodes: number
  cpuRequestsCores: number
  memoryRequestsGB: number
  coldStartMs: number
}

export interface DataWarehouseData {
  type: 'data-warehouse'
  engine: 'bigquery' | 'redshift' | 'snowflake' | 'databricks' | 'clickhouse'
  storageGB: number
  computeSlots: number
  queryConcurrency: number
  tableCount: number
  partitioningEnabled: boolean
}

export interface StreamProcessorData {
  type: 'stream-processor'
  engine: 'flink' | 'spark' | 'kafka-streams' | 'kinesis' | 'dataflow'
  parallelism: number
  checkpointIntervalMs: number
  windowSizeMs: number
  stateBackend: 'memory' | 'rocksdb' | 'filesystem'
  eventsPerSecond: number
}

export interface ServiceMeshData {
  type: 'service-mesh'
  implementation: 'istio' | 'linkerd' | 'consul' | 'kuma'
  mtlsEnabled: boolean
  circuitBreakerEnabled: boolean
  retryEnabled: boolean
  observabilityEnabled: boolean
  ratelimitEnabled: boolean
}

// ─── Screen / UI Node Data ────────────────────────────────────────────────────

export interface ScreenData {
  type: 'screen'
  name: string
  imageUrl?: string
  screenSize: 'mobile' | 'tablet' | 'desktop'
  apiBindings: Array<{
    regionId: string
    nodeId: string
    responsePath: string
  }>
  navigationTriggers: Array<{
    trigger: string
    targetScreenId: string
  }>
}

export interface ApiBindingData {
  type: 'api-binding'
  method: HttpMethod
  path: string
  mockResponses: MockResponse[]
  responseShape: JsonSchema | null
}

export interface ComponentData {
  type: 'component'
  name: string
  renderCondition?: string
  dynamicProps: string[]
  componentProps: Array<{ name: string; propType: string; required: boolean }>
}

// ─── Service Mode Node Data ───────────────────────────────────────────────────

export interface ApiEndpointData {
  type: 'api-endpoint'
  method: HttpMethod
  path: string
  protocol: 'rest' | 'grpc' | 'graphql'
  authRequired: boolean
  payloadSchema: JsonSchema | null
  rateLimit: number
  requestBodyExample: string
}

export interface ValidationStepData {
  type: 'validation-step'
  rules: ValidationRule[]
  onFailure: 'reject' | 'sanitize' | 'default'
}

export interface DbStepData {
  type: 'db-step'
  operation: 'read' | 'write' | 'read-write' | 'INSERT' | 'SELECT' | 'UPDATE' | 'DELETE'
  collection: string
  indexed: boolean
  queryTimeoutMs: number
  returning: boolean
  indexHint: string
}

export interface ResponseConfigData {
  type: 'response-config'
  successStatus: number
  errorStatus: number
  responseShape: JsonSchema | null
  cacheControl: string
  mockResponseBody: string
}

export interface MiddlewareStepData {
  type: 'middleware-step'
  middlewareType: 'auth' | 'rate-limit' | 'logging' | 'cors' | 'cache' | 'compression'
  enabled: boolean
  config: Record<string, string | number | boolean>
}

export interface BranchStepData {
  type: 'branch-step'
  condition: string
  trueProbability: number
  description: string
}

export interface ErrorHandlerData {
  type: 'error-handler'
  statusCode: number
  errorMessage: string
  retry: boolean
  maxRetries: number
  retryDelayMs: number
  fallbackNodeId: string
}

// ─── Node Data Union ──────────────────────────────────────────────────────────

export type NodeData =
  // Existing system
  | MicroserviceData
  | DatabaseData
  | QueueData
  | CacheData
  | LoadBalancerData
  | CdnData
  | ServerlessData
  // New system / cloud
  | ApiGatewayData
  | ObjectStorageData
  | AuthServiceData
  | EmailServiceData
  | ExternalServiceData
  | BackgroundWorkerData
  | CronSchedulerData
  | WebsocketServerData
  | FeatureFlagsData
  | VpcZoneData
  | ObservabilityData
  | MessageBrokerData
  | DnsData
  | WafData
  | ReverseProxyData
  | SearchEngineData
  | ContainerOrchestratorData
  | DataWarehouseData
  | StreamProcessorData
  | ServiceMeshData
  // UI
  | ScreenData
  | ApiBindingData
  | ComponentData
  // Service
  | ApiEndpointData
  | ValidationStepData
  | DbStepData
  | ResponseConfigData
  | MiddlewareStepData
  | BranchStepData
  | ErrorHandlerData

// ─── Edge Types ───────────────────────────────────────────────────────────────

export type EdgeType = 'http' | 'grpc' | 'graphql' | 'event' | 'db-query' | 'navigation' | 'websocket' | 'default'

export interface EdgeData {
  label?: string
  latencyMs?: number
  protocol?: string
  edgeType?: EdgeType
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
  notes?: string
  tags?: string[]
  color?: string
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
  rule: 'required' | 'min' | 'max' | 'pattern' | 'enum' | 'custom' | 'minLength' | 'maxLength'
  value?: string | number | string[]
  message?: string
}

export interface MockResponse {
  name: string
  status: number
  body: Record<string, unknown>
  probability: number
}

export type JsonSchema = Record<string, unknown>
