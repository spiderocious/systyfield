import type { NodeType, DesignMode, NodeData } from '../types'

// ─── Config Field Schema ──────────────────────────────────────────────────────

export type ConfigFieldType =
  | 'number'
  | 'text'
  | 'select'
  | 'boolean'
  | 'key-value'
  | 'tags'
  | 'image-upload'
  | 'rules-editor'
  | 'props-editor'
  | 'json-editor'
  | 'textarea'
  | 'multi-select'

export interface ConfigField {
  key: string
  label: string
  type: ConfigFieldType
  description?: string
  min?: number
  max?: number
  step?: number
  unit?: string
  options?: Array<{ value: string; label: string }>
  placeholder?: string
}

export interface NodePreset {
  label: string
  values: Record<string, unknown>
}

export interface NodeTypeDef {
  type: NodeType
  label: string
  description: string
  icon: string
  colorVar: string
  category: string
  modes: DesignMode[]
  defaultData: NodeData
  configFields: ConfigField[]
  presets?: NodePreset[]
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const NODE_TYPE_REGISTRY: Record<NodeType, NodeTypeDef> = {
  // ── Microservice ─────────────────────────────────────────────────────────
  microservice: {
    type: 'microservice',
    label: 'Microservice',
    description: 'An independent, horizontally-scalable service',
    icon: 'Server',
    colorVar: '--color-node-microservice',
    category: 'Compute',
    modes: ['system'],
    defaultData: {
      type: 'microservice',
      language: 'node',
      framework: 'express',
      replicas: 1,
      instanceType: 't3.small',
      cpu: 1,
      ram: 2,
      autoscaleEnabled: false,
      minReplicas: 1,
      maxReplicas: 10,
      scaleCpuThreshold: 70,
      scaleRpsThreshold: 0,
      circuitBreakerEnabled: false,
      circuitBreakerThreshold: 50,
      requestTimeoutMs: 5000,
      healthCheckPath: '/health',
      cpuLimit: '500m',
      memoryLimit: '512Mi',
      port: 3000,
      env: {},
    },
    configFields: [
      { key: 'language', label: 'Language', type: 'select', options: [{ value: 'node', label: 'Node.js' }, { value: 'go', label: 'Go' }, { value: 'python', label: 'Python' }, { value: 'java', label: 'Java' }, { value: 'rust', label: 'Rust' }, { value: 'csharp', label: 'C#' }] },
      { key: 'framework', label: 'Framework', type: 'text', placeholder: 'express, fastify, gin...' },
      { key: 'replicas', label: 'Replicas', type: 'number', min: 1, max: 100, step: 1 },
      { key: 'instanceType', label: 'Instance Type', type: 'select', options: [{ value: 't3.nano', label: 't3.nano (0.5GB)' }, { value: 't3.micro', label: 't3.micro (1GB)' }, { value: 't3.small', label: 't3.small (2GB)' }, { value: 't3.medium', label: 't3.medium (4GB)' }, { value: 'm5.large', label: 'm5.large (8GB)' }, { value: 'm5.xlarge', label: 'm5.xlarge (16GB)' }, { value: 'c5.xlarge', label: 'c5.xlarge (8GB, CPU opt)' }, { value: 'c5.2xlarge', label: 'c5.2xlarge (16GB, CPU opt)' }, { value: 'r5.large', label: 'r5.large (16GB, Mem opt)' }, { value: 'r5.xlarge', label: 'r5.xlarge (32GB, Mem opt)' }] },
      { key: 'cpu', label: 'CPU', type: 'number', min: 0.25, max: 64, step: 0.25, unit: 'vCPU' },
      { key: 'ram', label: 'RAM', type: 'number', min: 0.5, max: 256, step: 0.5, unit: 'GB' },
      { key: 'autoscaleEnabled', label: 'Autoscale', type: 'boolean' },
      { key: 'minReplicas', label: 'Min Replicas', type: 'number', min: 1, max: 100, step: 1 },
      { key: 'maxReplicas', label: 'Max Replicas', type: 'number', min: 1, max: 1000, step: 1 },
      { key: 'scaleCpuThreshold', label: 'Scale-out CPU Threshold', type: 'number', min: 10, max: 95, step: 5, unit: '%' },
      { key: 'circuitBreakerEnabled', label: 'Circuit Breaker', type: 'boolean' },
      { key: 'circuitBreakerThreshold', label: 'CB Failure Threshold', type: 'number', min: 1, max: 100, step: 1, unit: '%' },
      { key: 'requestTimeoutMs', label: 'Request Timeout', type: 'number', min: 100, max: 60000, step: 100, unit: 'ms' },
      { key: 'healthCheckPath', label: 'Health Check Path', type: 'text', placeholder: '/health' },
      { key: 'port', label: 'Port', type: 'number', min: 1, max: 65535, step: 1 },
      { key: 'env', label: 'Environment Variables', type: 'key-value' },
    ],
    presets: [
      { label: 'Nano (0.25 vCPU / 0.5GB)', values: { instanceType: 't3.nano', cpu: 0.25, ram: 0.5, replicas: 1 } },
      { label: 'Standard (1 vCPU / 2GB)', values: { instanceType: 't3.small', cpu: 1, ram: 2, replicas: 2 } },
      { label: 'High-Memory (2 vCPU / 8GB)', values: { instanceType: 'r5.large', cpu: 2, ram: 8, replicas: 2 } },
      { label: 'Large (8 vCPU / 32GB)', values: { instanceType: 'r5.xlarge', cpu: 8, ram: 32, replicas: 4 } },
      { label: 'CPU-Optimized (4 vCPU / 8GB)', values: { instanceType: 'c5.xlarge', cpu: 4, ram: 8, replicas: 3 } },
    ],
  },

  // ── Database ─────────────────────────────────────────────────────────────
  database: {
    type: 'database',
    label: 'Database',
    description: 'Persistent relational or document data store',
    icon: 'Database',
    colorVar: '--color-node-database',
    category: 'Storage',
    modes: ['system'],
    defaultData: {
      type: 'database',
      engine: 'postgres',
      storageGB: 20,
      replication: false,
      connectionPoolSize: 10,
      readReplicas: 0,
      instanceClass: 'db.t3.small',
      multiAZ: false,
      maxConnections: 100,
      backupRetentionDays: 7,
      iops: 3000,
      cacheSizeMB: 128,
      slowQueryThresholdMs: 1000,
    },
    configFields: [
      { key: 'engine', label: 'Engine', type: 'select', options: [{ value: 'postgres', label: 'PostgreSQL' }, { value: 'mysql', label: 'MySQL' }, { value: 'mongodb', label: 'MongoDB' }, { value: 'cassandra', label: 'Cassandra' }, { value: 'redis', label: 'Redis' }, { value: 'dynamodb', label: 'DynamoDB' }, { value: 'sqlite', label: 'SQLite' }] },
      { key: 'instanceClass', label: 'Instance Class', type: 'select', options: [{ value: 'db.t3.micro', label: 'db.t3.micro (1GB)' }, { value: 'db.t3.small', label: 'db.t3.small (2GB)' }, { value: 'db.t3.medium', label: 'db.t3.medium (4GB)' }, { value: 'db.m5.large', label: 'db.m5.large (8GB)' }, { value: 'db.m5.xlarge', label: 'db.m5.xlarge (16GB)' }, { value: 'db.r5.large', label: 'db.r5.large (16GB)' }, { value: 'db.r6g.8xlarge', label: 'db.r6g.8xlarge (256GB)' }] },
      { key: 'storageGB', label: 'Storage', type: 'number', min: 1, max: 65536, step: 1, unit: 'GB' },
      { key: 'iops', label: 'IOPS', type: 'number', min: 1000, max: 256000, step: 1000 },
      { key: 'maxConnections', label: 'Max Connections', type: 'number', min: 1, max: 100000, step: 10 },
      { key: 'connectionPoolSize', label: 'Connection Pool', type: 'number', min: 1, max: 1000, step: 1 },
      { key: 'cacheSizeMB', label: 'Buffer/Cache', type: 'number', min: 64, max: 131072, step: 64, unit: 'MB' },
      { key: 'replication', label: 'Replication Enabled', type: 'boolean' },
      { key: 'multiAZ', label: 'Multi-AZ', type: 'boolean' },
      { key: 'readReplicas', label: 'Read Replicas', type: 'number', min: 0, max: 15, step: 1 },
      { key: 'backupRetentionDays', label: 'Backup Retention', type: 'number', min: 0, max: 35, step: 1, unit: 'days' },
      { key: 'slowQueryThresholdMs', label: 'Slow Query Threshold', type: 'number', min: 100, max: 30000, step: 100, unit: 'ms' },
    ],
    presets: [
      { label: 'Dev (db.t3.micro / 20GB)', values: { instanceClass: 'db.t3.micro', storageGB: 20, maxConnections: 50, iops: 1000 } },
      { label: 'Prod Small (db.m5.large / 100GB)', values: { instanceClass: 'db.m5.large', storageGB: 100, maxConnections: 500, iops: 10000, multiAZ: true } },
      { label: 'Prod Large (db.r5.large / 500GB)', values: { instanceClass: 'db.r5.large', storageGB: 500, maxConnections: 5000, iops: 50000, multiAZ: true, readReplicas: 2 } },
    ],
  },

  // ── Queue ────────────────────────────────────────────────────────────────
  queue: {
    type: 'queue',
    label: 'Message Queue',
    description: 'Async messaging between services',
    icon: 'MessageSquare',
    colorVar: '--color-node-queue',
    category: 'Messaging',
    modes: ['system'],
    defaultData: {
      type: 'queue',
      engine: 'rabbitmq',
      maxConcurrentConsumers: 5,
      messageRetentionHours: 24,
      dlqEnabled: false,
      maxQueueDepth: 10000,
      messageSizeBytes: 64000,
      visibilityTimeoutSec: 30,
      prefetchCount: 1,
      consumerConcurrency: 1,
    },
    configFields: [
      { key: 'engine', label: 'Engine', type: 'select', options: [{ value: 'rabbitmq', label: 'RabbitMQ' }, { value: 'kafka', label: 'Kafka' }, { value: 'sqs', label: 'AWS SQS' }, { value: 'pubsub', label: 'Google Pub/Sub' }, { value: 'redis', label: 'Redis Streams' }] },
      { key: 'maxConcurrentConsumers', label: 'Max Consumers', type: 'number', min: 1, max: 100, step: 1 },
      { key: 'consumerConcurrency', label: 'Consumer Concurrency', type: 'number', min: 1, max: 50, step: 1 },
      { key: 'maxQueueDepth', label: 'Max Queue Depth', type: 'number', min: 100, max: 10000000, step: 100, unit: 'msgs' },
      { key: 'messageSizeBytes', label: 'Max Message Size', type: 'number', min: 1024, max: 10485760, step: 1024, unit: 'bytes' },
      { key: 'prefetchCount', label: 'Prefetch Count', type: 'number', min: 1, max: 1000, step: 1 },
      { key: 'visibilityTimeoutSec', label: 'Visibility Timeout', type: 'number', min: 0, max: 43200, step: 1, unit: 'sec' },
      { key: 'messageRetentionHours', label: 'Message Retention', type: 'number', min: 1, max: 1080, step: 1, unit: 'hrs' },
      { key: 'dlqEnabled', label: 'Dead Letter Queue', type: 'boolean' },
    ],
  },

  // ── Cache ────────────────────────────────────────────────────────────────
  cache: {
    type: 'cache',
    label: 'Cache',
    description: 'In-memory caching layer',
    icon: 'Zap',
    colorVar: '--color-node-cache',
    category: 'Storage',
    modes: ['system'],
    defaultData: {
      type: 'cache',
      engine: 'redis',
      maxMemoryMB: 512,
      evictionPolicy: 'lru',
      ttlSeconds: 3600,
      clusterMode: 'single',
      maxConnections: 100,
      persistence: 'none',
      hitRateTarget: 80,
    },
    configFields: [
      { key: 'engine', label: 'Engine', type: 'select', options: [{ value: 'redis', label: 'Redis' }, { value: 'memcached', label: 'Memcached' }, { value: 'cloudflare', label: 'Cloudflare KV' }] },
      { key: 'clusterMode', label: 'Cluster Mode', type: 'select', options: [{ value: 'single', label: 'Single Instance' }, { value: 'cluster', label: 'Cluster Mode' }, { value: 'sentinel', label: 'Sentinel HA' }] },
      { key: 'maxMemoryMB', label: 'Max Memory', type: 'number', min: 64, max: 65536, step: 64, unit: 'MB' },
      { key: 'maxConnections', label: 'Max Connections', type: 'number', min: 10, max: 65000, step: 10 },
      { key: 'hitRateTarget', label: 'Target Hit Rate', type: 'number', min: 0, max: 100, step: 5, unit: '%' },
      { key: 'evictionPolicy', label: 'Eviction Policy', type: 'select', options: [{ value: 'lru', label: 'LRU' }, { value: 'lfu', label: 'LFU' }, { value: 'fifo', label: 'FIFO' }] },
      { key: 'persistence', label: 'Persistence', type: 'select', options: [{ value: 'none', label: 'None (Memory only)' }, { value: 'rdb', label: 'RDB Snapshots' }, { value: 'aof', label: 'AOF Journal' }] },
      { key: 'ttlSeconds', label: 'Default TTL', type: 'number', min: 0, max: 86400, step: 60, unit: 'sec' },
    ],
    presets: [
      { label: 'Small (256MB)', values: { maxMemoryMB: 256, clusterMode: 'single', hitRateTarget: 70 } },
      { label: 'Standard (1GB)', values: { maxMemoryMB: 1024, clusterMode: 'single', hitRateTarget: 80 } },
      { label: 'Large HA (4GB Sentinel)', values: { maxMemoryMB: 4096, clusterMode: 'sentinel', hitRateTarget: 90, persistence: 'aof' } },
    ],
  },

  // ── Load Balancer ─────────────────────────────────────────────────────────
  'load-balancer': {
    type: 'load-balancer',
    label: 'Load Balancer',
    description: 'Distributes traffic across instances',
    icon: 'Shuffle',
    colorVar: '--color-node-load-balancer',
    category: 'Networking',
    modes: ['system'],
    defaultData: {
      type: 'load-balancer',
      algorithm: 'round-robin',
      healthCheckInterval: 30,
      maxConnections: 10000,
      connectionTimeoutMs: 5000,
      requestTimeoutMs: 30000,
      stickySessions: false,
      sslTermination: true,
      rateLimitPerIp: 0,
    },
    configFields: [
      { key: 'algorithm', label: 'Algorithm', type: 'select', options: [{ value: 'round-robin', label: 'Round Robin' }, { value: 'least-connections', label: 'Least Connections' }, { value: 'ip-hash', label: 'IP Hash' }, { value: 'random', label: 'Random' }, { value: 'weighted', label: 'Weighted' }] },
      { key: 'maxConnections', label: 'Max Connections', type: 'number', min: 100, max: 1000000, step: 100 },
      { key: 'connectionTimeoutMs', label: 'Connection Timeout', type: 'number', min: 100, max: 60000, step: 100, unit: 'ms' },
      { key: 'requestTimeoutMs', label: 'Request Timeout', type: 'number', min: 100, max: 300000, step: 100, unit: 'ms' },
      { key: 'healthCheckInterval', label: 'Health Check Interval', type: 'number', min: 5, max: 300, step: 5, unit: 'sec' },
      { key: 'stickySessions', label: 'Sticky Sessions', type: 'boolean' },
      { key: 'sslTermination', label: 'SSL Termination', type: 'boolean' },
      { key: 'rateLimitPerIp', label: 'Rate Limit per IP', type: 'number', min: 0, max: 10000, step: 10, unit: 'req/s' },
    ],
  },

  // ── CDN ──────────────────────────────────────────────────────────────────
  cdn: {
    type: 'cdn',
    label: 'CDN',
    description: 'Content delivery network edge caching',
    icon: 'Globe',
    colorVar: '--color-node-cdn',
    category: 'Networking',
    modes: ['system'],
    defaultData: {
      type: 'cdn',
      provider: 'cloudflare',
      ttlSeconds: 86400,
      cacheRules: [],
      originPullTimeoutMs: 10000,
      cacheHitRateTarget: 80,
      bandwidthGBMonth: 100,
      regions: ['us-east', 'eu-west'],
    },
    configFields: [
      { key: 'provider', label: 'Provider', type: 'select', options: [{ value: 'cloudflare', label: 'Cloudflare' }, { value: 'cloudfront', label: 'AWS CloudFront' }, { value: 'fastly', label: 'Fastly' }, { value: 'akamai', label: 'Akamai' }] },
      { key: 'cacheHitRateTarget', label: 'Target Cache Hit Rate', type: 'number', min: 0, max: 100, step: 5, unit: '%' },
      { key: 'ttlSeconds', label: 'Cache TTL', type: 'number', min: 0, max: 604800, step: 3600, unit: 'sec' },
      { key: 'originPullTimeoutMs', label: 'Origin Timeout', type: 'number', min: 1000, max: 60000, step: 1000, unit: 'ms' },
      { key: 'bandwidthGBMonth', label: 'Bandwidth', type: 'number', min: 1, max: 100000, step: 10, unit: 'GB/mo' },
      { key: 'regions', label: 'Edge Regions', type: 'tags' },
      { key: 'cacheRules', label: 'Cache Rules', type: 'tags' },
    ],
  },

  // ── Serverless ────────────────────────────────────────────────────────────
  serverless: {
    type: 'serverless',
    label: 'Serverless Function',
    description: 'Event-driven, auto-scaling function',
    icon: 'Cpu',
    colorVar: '--color-node-serverless',
    category: 'Compute',
    modes: ['system'],
    defaultData: {
      type: 'serverless',
      runtime: 'node',
      memoryMB: 256,
      timeoutSeconds: 30,
      concurrencyLimit: 100,
      coldStartMs: 300,
      provisionedConcurrency: 0,
      maxPayloadSizeKb: 6144,
      region: 'us-east-1',
    },
    configFields: [
      { key: 'runtime', label: 'Runtime', type: 'select', options: [{ value: 'node', label: 'Node.js' }, { value: 'python', label: 'Python' }, { value: 'go', label: 'Go' }, { value: 'java', label: 'Java' }, { value: 'rust', label: 'Rust' }] },
      { key: 'memoryMB', label: 'Memory', type: 'number', min: 128, max: 10240, step: 128, unit: 'MB' },
      { key: 'timeoutSeconds', label: 'Timeout', type: 'number', min: 1, max: 900, step: 1, unit: 'sec' },
      { key: 'concurrencyLimit', label: 'Max Concurrency', type: 'number', min: 1, max: 10000, step: 1 },
      { key: 'coldStartMs', label: 'Cold Start Latency', type: 'number', min: 50, max: 5000, step: 50, unit: 'ms', description: 'Used in simulation' },
      { key: 'provisionedConcurrency', label: 'Provisioned Concurrency', type: 'number', min: 0, max: 1000, step: 1 },
      { key: 'maxPayloadSizeKb', label: 'Max Payload', type: 'number', min: 1, max: 10240, step: 1, unit: 'KB' },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
    ],
    presets: [
      { label: 'Light (128MB, 3s)', values: { memoryMB: 128, timeoutSeconds: 3, coldStartMs: 150 } },
      { label: 'Standard (256MB, 30s)', values: { memoryMB: 256, timeoutSeconds: 30, coldStartMs: 300 } },
      { label: 'Heavy (1GB, 5m)', values: { memoryMB: 1024, timeoutSeconds: 300, coldStartMs: 800 } },
    ],
  },

  // ─── New Cloud Infrastructure Nodes ──────────────────────────────────────

  'api-gateway': {
    type: 'api-gateway',
    label: 'API Gateway',
    description: 'Kong, AWS API GW, nginx — rate limiting, routing, auth offload',
    icon: 'Network',
    colorVar: '--color-node-api-gateway',
    category: 'Networking',
    modes: ['system'],
    defaultData: {
      type: 'api-gateway',
      provider: 'aws',
      rateLimitRps: 1000,
      authProvider: 'jwt',
      throttlingEnabled: true,
      cacheEnabled: false,
      cacheTtlSeconds: 300,
      corsEnabled: true,
    },
    configFields: [
      { key: 'provider', label: 'Provider', type: 'select', options: [{ value: 'aws', label: 'AWS API Gateway' }, { value: 'kong', label: 'Kong' }, { value: 'nginx', label: 'NGINX' }, { value: 'traefik', label: 'Traefik' }, { value: 'envoy', label: 'Envoy' }] },
      { key: 'rateLimitRps', label: 'Rate Limit', type: 'number', min: 0, max: 1000000, step: 100, unit: 'req/s' },
      { key: 'authProvider', label: 'Auth Method', type: 'select', options: [{ value: 'jwt', label: 'JWT' }, { value: 'oauth2', label: 'OAuth 2.0' }, { value: 'api-key', label: 'API Key' }, { value: 'none', label: 'None' }] },
      { key: 'throttlingEnabled', label: 'Throttling', type: 'boolean' },
      { key: 'cacheEnabled', label: 'Response Cache', type: 'boolean' },
      { key: 'cacheTtlSeconds', label: 'Cache TTL', type: 'number', min: 0, max: 3600, step: 30, unit: 'sec' },
      { key: 'corsEnabled', label: 'CORS Enabled', type: 'boolean' },
    ],
  },

  'object-storage': {
    type: 'object-storage',
    label: 'Object Storage',
    description: 'S3, GCS, R2, Azure Blob — file and media storage',
    icon: 'Archive',
    colorVar: '--color-node-object-storage',
    category: 'Storage',
    modes: ['system'],
    defaultData: {
      type: 'object-storage',
      provider: 's3',
      capacityGB: 500,
      region: 'us-east-1',
      versioning: false,
      isPublic: false,
      replicationRegions: [],
    },
    configFields: [
      { key: 'provider', label: 'Provider', type: 'select', options: [{ value: 's3', label: 'AWS S3' }, { value: 'gcs', label: 'Google GCS' }, { value: 'r2', label: 'Cloudflare R2' }, { value: 'azure-blob', label: 'Azure Blob' }, { value: 'minio', label: 'MinIO' }] },
      { key: 'capacityGB', label: 'Capacity', type: 'number', min: 1, max: 1000000, step: 100, unit: 'GB' },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
      { key: 'versioning', label: 'Versioning', type: 'boolean' },
      { key: 'isPublic', label: 'Public Access', type: 'boolean' },
      { key: 'replicationRegions', label: 'Replication Regions', type: 'tags' },
    ],
  },

  'auth-service': {
    type: 'auth-service',
    label: 'Auth / Identity',
    description: 'Auth0, Cognito, Keycloak — SSO, JWT issuer',
    icon: 'Fingerprint',
    colorVar: '--color-node-auth-service',
    category: 'Security',
    modes: ['system'],
    defaultData: {
      type: 'auth-service',
      provider: 'auth0',
      tokenType: 'jwt',
      tokenTtlSeconds: 3600,
      mfaEnabled: false,
      ssoEnabled: false,
      oauthProviders: ['google'],
    },
    configFields: [
      { key: 'provider', label: 'Provider', type: 'select', options: [{ value: 'auth0', label: 'Auth0' }, { value: 'cognito', label: 'AWS Cognito' }, { value: 'keycloak', label: 'Keycloak' }, { value: 'firebase', label: 'Firebase Auth' }, { value: 'custom', label: 'Custom' }] },
      { key: 'tokenType', label: 'Token Type', type: 'select', options: [{ value: 'jwt', label: 'JWT' }, { value: 'opaque', label: 'Opaque Token' }, { value: 'session', label: 'Session Cookie' }] },
      { key: 'tokenTtlSeconds', label: 'Token TTL', type: 'number', min: 60, max: 86400, step: 60, unit: 'sec' },
      { key: 'mfaEnabled', label: 'MFA Enabled', type: 'boolean' },
      { key: 'ssoEnabled', label: 'SSO / SAML', type: 'boolean' },
      { key: 'oauthProviders', label: 'OAuth Providers', type: 'tags' },
    ],
  },

  'email-service': {
    type: 'email-service',
    label: 'Email / Notifications',
    description: 'SendGrid, SES, Twilio — outbound messaging',
    icon: 'Mail',
    colorVar: '--color-node-email-service',
    category: 'Integrations',
    modes: ['system'],
    defaultData: {
      type: 'email-service',
      provider: 'ses',
      sendRatePerMinute: 100,
      bounceThresholdPercent: 5,
      transactional: true,
      templatesEnabled: true,
    },
    configFields: [
      { key: 'provider', label: 'Provider', type: 'select', options: [{ value: 'ses', label: 'AWS SES' }, { value: 'sendgrid', label: 'SendGrid' }, { value: 'mailgun', label: 'Mailgun' }, { value: 'postmark', label: 'Postmark' }, { value: 'twilio', label: 'Twilio SendGrid' }] },
      { key: 'sendRatePerMinute', label: 'Send Rate', type: 'number', min: 1, max: 1000000, step: 10, unit: 'msg/min' },
      { key: 'bounceThresholdPercent', label: 'Bounce Threshold', type: 'number', min: 0, max: 20, step: 0.5, unit: '%' },
      { key: 'transactional', label: 'Transactional', type: 'boolean' },
      { key: 'templatesEnabled', label: 'Templates', type: 'boolean' },
    ],
  },

  'external-service': {
    type: 'external-service',
    label: 'External Service',
    description: '3rd-party API dependency (Stripe, Maps, etc.)',
    icon: 'Webhook',
    colorVar: '--color-node-external-service',
    category: 'Integrations',
    modes: ['system'],
    defaultData: {
      type: 'external-service',
      name: 'External API',
      baseUrl: 'https://api.example.com',
      timeoutMs: 5000,
      retries: 3,
      rateLimitRps: 100,
    },
    configFields: [
      { key: 'name', label: 'Service Name', type: 'text', placeholder: 'Stripe, Google Maps...' },
      { key: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://api.example.com' },
      { key: 'timeoutMs', label: 'Timeout', type: 'number', min: 100, max: 60000, step: 100, unit: 'ms' },
      { key: 'retries', label: 'Retry Attempts', type: 'number', min: 0, max: 10, step: 1 },
      { key: 'rateLimitRps', label: 'Rate Limit', type: 'number', min: 0, max: 100000, step: 10, unit: 'req/s' },
    ],
  },

  'background-worker': {
    type: 'background-worker',
    label: 'Background Worker',
    description: 'Long-running job processor (Celery, BullMQ, Sidekiq)',
    icon: 'Timer',
    colorVar: '--color-node-background-worker',
    category: 'Compute',
    modes: ['system'],
    defaultData: {
      type: 'background-worker',
      runtime: 'node',
      concurrency: 5,
      jobQueueEngine: 'bullmq',
      retryAttempts: 3,
      retryDelayMs: 5000,
      jobTimeoutMs: 60000,
    },
    configFields: [
      { key: 'runtime', label: 'Runtime', type: 'select', options: [{ value: 'node', label: 'Node.js' }, { value: 'python', label: 'Python' }, { value: 'go', label: 'Go' }, { value: 'java', label: 'Java' }, { value: 'ruby', label: 'Ruby' }] },
      { key: 'jobQueueEngine', label: 'Queue Engine', type: 'text', placeholder: 'bullmq, celery, sidekiq...' },
      { key: 'concurrency', label: 'Concurrency', type: 'number', min: 1, max: 500, step: 1 },
      { key: 'retryAttempts', label: 'Retry Attempts', type: 'number', min: 0, max: 20, step: 1 },
      { key: 'retryDelayMs', label: 'Retry Delay', type: 'number', min: 100, max: 3600000, step: 100, unit: 'ms' },
      { key: 'jobTimeoutMs', label: 'Job Timeout', type: 'number', min: 1000, max: 3600000, step: 1000, unit: 'ms' },
    ],
  },

  'cron-scheduler': {
    type: 'cron-scheduler',
    label: 'Cron / Scheduler',
    description: 'Scheduled job trigger (cron, EventBridge)',
    icon: 'CalendarClock',
    colorVar: '--color-node-cron-scheduler',
    category: 'Compute',
    modes: ['system'],
    defaultData: {
      type: 'cron-scheduler',
      schedule: '0 * * * *',
      timezone: 'UTC',
      jobName: 'scheduled-job',
      retryOnFailure: true,
      maxRetries: 3,
      timeoutMs: 300000,
    },
    configFields: [
      { key: 'jobName', label: 'Job Name', type: 'text', placeholder: 'daily-report, cleanup...' },
      { key: 'schedule', label: 'Cron Expression', type: 'text', placeholder: '0 * * * * (hourly)' },
      { key: 'timezone', label: 'Timezone', type: 'text', placeholder: 'UTC, America/New_York...' },
      { key: 'retryOnFailure', label: 'Retry on Failure', type: 'boolean' },
      { key: 'maxRetries', label: 'Max Retries', type: 'number', min: 0, max: 10, step: 1 },
      { key: 'timeoutMs', label: 'Timeout', type: 'number', min: 1000, max: 86400000, step: 1000, unit: 'ms' },
    ],
  },

  'websocket-server': {
    type: 'websocket-server',
    label: 'WebSocket Server',
    description: 'Realtime push (Socket.io, Soketi, Ably)',
    icon: 'Radio',
    colorVar: '--color-node-websocket-server',
    category: 'Compute',
    modes: ['system'],
    defaultData: {
      type: 'websocket-server',
      runtime: 'node',
      maxConnections: 10000,
      heartbeatIntervalMs: 25000,
      messageRateLimit: 100,
      compressionEnabled: true,
      protocol: 'wss',
    },
    configFields: [
      { key: 'runtime', label: 'Runtime', type: 'select', options: [{ value: 'node', label: 'Node.js' }, { value: 'go', label: 'Go' }, { value: 'rust', label: 'Rust' }] },
      { key: 'protocol', label: 'Protocol', type: 'select', options: [{ value: 'wss', label: 'WSS (secure)' }, { value: 'ws', label: 'WS (plain)' }] },
      { key: 'maxConnections', label: 'Max Connections', type: 'number', min: 100, max: 10000000, step: 100 },
      { key: 'heartbeatIntervalMs', label: 'Heartbeat Interval', type: 'number', min: 1000, max: 120000, step: 1000, unit: 'ms' },
      { key: 'messageRateLimit', label: 'Msg Rate Limit', type: 'number', min: 1, max: 10000, step: 1, unit: 'msg/s' },
      { key: 'compressionEnabled', label: 'Compression', type: 'boolean' },
    ],
  },

  'feature-flags': {
    type: 'feature-flags',
    label: 'Feature Flags',
    description: 'LaunchDarkly, Flagsmith — runtime config',
    icon: 'Flag',
    colorVar: '--color-node-feature-flags',
    category: 'Integrations',
    modes: ['system'],
    defaultData: {
      type: 'feature-flags',
      provider: 'launchdarkly',
      flagCount: 10,
      evaluationsPerSecond: 1000,
      sdkType: 'server',
    },
    configFields: [
      { key: 'provider', label: 'Provider', type: 'select', options: [{ value: 'launchdarkly', label: 'LaunchDarkly' }, { value: 'flagsmith', label: 'Flagsmith' }, { value: 'unleash', label: 'Unleash' }, { value: 'growthbook', label: 'GrowthBook' }, { value: 'custom', label: 'Custom' }] },
      { key: 'flagCount', label: 'Flag Count', type: 'number', min: 1, max: 10000, step: 1 },
      { key: 'evaluationsPerSecond', label: 'Evaluations/sec', type: 'number', min: 1, max: 1000000, step: 100 },
      { key: 'sdkType', label: 'SDK Type', type: 'select', options: [{ value: 'server', label: 'Server-side' }, { value: 'client', label: 'Client-side' }] },
    ],
  },

  'vpc-zone': {
    type: 'vpc-zone',
    label: 'VPC / Network Zone',
    description: 'Grouping boundary (private subnet, DMZ, AZ)',
    icon: 'Box',
    colorVar: '--color-node-vpc-zone',
    category: 'Networking',
    modes: ['system'],
    defaultData: {
      type: 'vpc-zone',
      cidr: '10.0.0.0/16',
      subnetType: 'private',
      availabilityZones: 2,
      natGateway: false,
      vpcPeering: false,
    },
    configFields: [
      { key: 'cidr', label: 'CIDR Block', type: 'text', placeholder: '10.0.0.0/16' },
      { key: 'subnetType', label: 'Subnet Type', type: 'select', options: [{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }, { value: 'isolated', label: 'Isolated' }] },
      { key: 'availabilityZones', label: 'Availability Zones', type: 'number', min: 1, max: 6, step: 1 },
      { key: 'natGateway', label: 'NAT Gateway', type: 'boolean' },
      { key: 'vpcPeering', label: 'VPC Peering', type: 'boolean' },
    ],
  },

  observability: {
    type: 'observability',
    label: 'Observability',
    description: 'Datadog, Prometheus, Grafana — metrics and tracing',
    icon: 'BarChart2',
    colorVar: '--color-node-observability',
    category: 'Operations',
    modes: ['system'],
    defaultData: {
      type: 'observability',
      provider: 'datadog',
      retentionDays: 15,
      alertsEnabled: true,
      tracingEnabled: true,
      loggingEnabled: true,
      samplingRate: 10,
    },
    configFields: [
      { key: 'provider', label: 'Provider', type: 'select', options: [{ value: 'datadog', label: 'Datadog' }, { value: 'prometheus', label: 'Prometheus + Grafana' }, { value: 'newrelic', label: 'New Relic' }, { value: 'dynatrace', label: 'Dynatrace' }] },
      { key: 'retentionDays', label: 'Retention', type: 'number', min: 1, max: 365, step: 1, unit: 'days' },
      { key: 'samplingRate', label: 'Trace Sampling', type: 'number', min: 1, max: 100, step: 1, unit: '%' },
      { key: 'alertsEnabled', label: 'Alerts', type: 'boolean' },
      { key: 'tracingEnabled', label: 'Distributed Tracing', type: 'boolean' },
      { key: 'loggingEnabled', label: 'Log Aggregation', type: 'boolean' },
    ],
  },

  'message-broker': {
    type: 'message-broker',
    label: 'Message Broker / Event Bus',
    description: 'EventBridge, SNS, Pub/Sub — fan-out patterns',
    icon: 'MessageCircle',
    colorVar: '--color-node-message-broker',
    category: 'Messaging',
    modes: ['system'],
    defaultData: {
      type: 'message-broker',
      brokerType: 'sns',
      topics: 5,
      subscriptions: 10,
      messageRetentionHours: 4,
      dlqEnabled: true,
      fanoutEnabled: true,
    },
    configFields: [
      { key: 'brokerType', label: 'Broker Type', type: 'select', options: [{ value: 'sns', label: 'AWS SNS' }, { value: 'eventbridge', label: 'AWS EventBridge' }, { value: 'pubsub', label: 'Google Pub/Sub' }, { value: 'nats', label: 'NATS' }, { value: 'activemq', label: 'ActiveMQ' }] },
      { key: 'topics', label: 'Topics', type: 'number', min: 1, max: 1000, step: 1 },
      { key: 'subscriptions', label: 'Subscriptions', type: 'number', min: 1, max: 10000, step: 1 },
      { key: 'messageRetentionHours', label: 'Retention', type: 'number', min: 1, max: 336, step: 1, unit: 'hrs' },
      { key: 'fanoutEnabled', label: 'Fanout', type: 'boolean' },
      { key: 'dlqEnabled', label: 'Dead Letter Queue', type: 'boolean' },
    ],
  },

  dns: {
    type: 'dns',
    label: 'DNS / Route53',
    description: 'Route53, Cloudflare — DNS routing and failover',
    icon: 'AtSign',
    colorVar: '--color-node-dns',
    category: 'Networking',
    modes: ['system'],
    defaultData: {
      type: 'dns',
      provider: 'route53',
      ttlSeconds: 60,
      failoverEnabled: false,
      geolocationRouting: false,
      healthCheckEnabled: true,
    },
    configFields: [
      { key: 'provider', label: 'Provider', type: 'select', options: [{ value: 'route53', label: 'AWS Route53' }, { value: 'cloudflare', label: 'Cloudflare DNS' }, { value: 'googledns', label: 'Google DNS' }, { value: 'custom', label: 'Custom' }] },
      { key: 'ttlSeconds', label: 'TTL', type: 'number', min: 1, max: 86400, step: 30, unit: 'sec' },
      { key: 'failoverEnabled', label: 'Failover Routing', type: 'boolean' },
      { key: 'geolocationRouting', label: 'Geo Routing', type: 'boolean' },
      { key: 'healthCheckEnabled', label: 'Health Checks', type: 'boolean' },
    ],
  },

  waf: {
    type: 'waf',
    label: 'WAF / Firewall',
    description: 'AWS WAF, Cloudflare — security boundary',
    icon: 'ShieldAlert',
    colorVar: '--color-node-waf',
    category: 'Security',
    modes: ['system'],
    defaultData: {
      type: 'waf',
      provider: 'aws-waf',
      ruleCount: 10,
      blockMode: true,
      ddosProtection: true,
      rateLimitRps: 2000,
      ipAllowlistEnabled: false,
    },
    configFields: [
      { key: 'provider', label: 'Provider', type: 'select', options: [{ value: 'aws-waf', label: 'AWS WAF' }, { value: 'cloudflare', label: 'Cloudflare WAF' }, { value: 'imperva', label: 'Imperva' }, { value: 'akamai', label: 'Akamai' }] },
      { key: 'ruleCount', label: 'Active Rules', type: 'number', min: 0, max: 500, step: 1 },
      { key: 'rateLimitRps', label: 'Rate Limit', type: 'number', min: 0, max: 1000000, step: 100, unit: 'req/s' },
      { key: 'blockMode', label: 'Block Mode', type: 'boolean' },
      { key: 'ddosProtection', label: 'DDoS Protection', type: 'boolean' },
      { key: 'ipAllowlistEnabled', label: 'IP Allowlist', type: 'boolean' },
    ],
  },

  'reverse-proxy': {
    type: 'reverse-proxy',
    label: 'Reverse Proxy',
    description: 'nginx/Caddy in front of services',
    icon: 'ArrowLeftRight',
    colorVar: '--color-node-reverse-proxy',
    category: 'Networking',
    modes: ['system'],
    defaultData: {
      type: 'reverse-proxy',
      software: 'nginx',
      upstreamCount: 3,
      cacheEnabled: false,
      compressionEnabled: true,
      sslTermination: true,
      timeoutMs: 30000,
    },
    configFields: [
      { key: 'software', label: 'Software', type: 'select', options: [{ value: 'nginx', label: 'NGINX' }, { value: 'caddy', label: 'Caddy' }, { value: 'haproxy', label: 'HAProxy' }, { value: 'traefik', label: 'Traefik' }, { value: 'envoy', label: 'Envoy' }] },
      { key: 'upstreamCount', label: 'Upstream Count', type: 'number', min: 1, max: 100, step: 1 },
      { key: 'timeoutMs', label: 'Upstream Timeout', type: 'number', min: 100, max: 120000, step: 100, unit: 'ms' },
      { key: 'cacheEnabled', label: 'Proxy Cache', type: 'boolean' },
      { key: 'compressionEnabled', label: 'Gzip Compression', type: 'boolean' },
      { key: 'sslTermination', label: 'SSL Termination', type: 'boolean' },
    ],
  },

  'search-engine': {
    type: 'search-engine',
    label: 'Search Engine',
    description: 'Elasticsearch, OpenSearch, Typesense',
    icon: 'Filter',
    colorVar: '--color-node-search-engine',
    category: 'Storage',
    modes: ['system'],
    defaultData: {
      type: 'search-engine',
      engine: 'elasticsearch',
      indexCount: 5,
      shards: 5,
      replicas: 1,
      documentsCount: 1000000,
      queriesPerSecond: 100,
    },
    configFields: [
      { key: 'engine', label: 'Engine', type: 'select', options: [{ value: 'elasticsearch', label: 'Elasticsearch' }, { value: 'opensearch', label: 'OpenSearch' }, { value: 'typesense', label: 'Typesense' }, { value: 'algolia', label: 'Algolia' }, { value: 'meilisearch', label: 'Meilisearch' }] },
      { key: 'indexCount', label: 'Index Count', type: 'number', min: 1, max: 1000, step: 1 },
      { key: 'shards', label: 'Shards per Index', type: 'number', min: 1, max: 50, step: 1 },
      { key: 'replicas', label: 'Replicas', type: 'number', min: 0, max: 5, step: 1 },
      { key: 'documentsCount', label: 'Document Count', type: 'number', min: 0, max: 1000000000, step: 100000 },
      { key: 'queriesPerSecond', label: 'Query Rate', type: 'number', min: 1, max: 100000, step: 10, unit: 'q/s' },
    ],
  },

  'container-orchestrator': {
    type: 'container-orchestrator',
    label: 'Kubernetes / ECS',
    description: 'Container orchestration and autoscaling',
    icon: 'Layers',
    colorVar: '--color-node-container-orchestrator',
    category: 'Compute',
    modes: ['system'],
    defaultData: {
      type: 'container-orchestrator',
      platform: 'kubernetes',
      nodeCount: 3,
      autoscaleEnabled: true,
      maxNodes: 20,
      cpuRequestsCores: 2,
      memoryRequestsGB: 4,
      coldStartMs: 10000,
    },
    configFields: [
      { key: 'platform', label: 'Platform', type: 'select', options: [{ value: 'kubernetes', label: 'Kubernetes' }, { value: 'ecs', label: 'AWS ECS' }, { value: 'nomad', label: 'Nomad' }, { value: 'swarm', label: 'Docker Swarm' }] },
      { key: 'nodeCount', label: 'Node Count', type: 'number', min: 1, max: 1000, step: 1 },
      { key: 'autoscaleEnabled', label: 'Cluster Autoscale', type: 'boolean' },
      { key: 'maxNodes', label: 'Max Nodes', type: 'number', min: 1, max: 10000, step: 1 },
      { key: 'cpuRequestsCores', label: 'CPU per Node', type: 'number', min: 0.25, max: 96, step: 0.25, unit: 'vCPU' },
      { key: 'memoryRequestsGB', label: 'RAM per Node', type: 'number', min: 0.5, max: 384, step: 0.5, unit: 'GB' },
      { key: 'coldStartMs', label: 'Pod Cold Start', type: 'number', min: 1000, max: 120000, step: 1000, unit: 'ms' },
    ],
    presets: [
      { label: 'Dev Cluster (3 nodes)', values: { nodeCount: 3, maxNodes: 5, cpuRequestsCores: 2, memoryRequestsGB: 4 } },
      { label: 'Prod Cluster (10 nodes)', values: { nodeCount: 10, maxNodes: 50, cpuRequestsCores: 8, memoryRequestsGB: 32, autoscaleEnabled: true } },
      { label: 'Large Cluster (50+ nodes)', values: { nodeCount: 50, maxNodes: 200, cpuRequestsCores: 32, memoryRequestsGB: 128, autoscaleEnabled: true } },
    ],
  },

  'data-warehouse': {
    type: 'data-warehouse',
    label: 'Data Warehouse',
    description: 'BigQuery, Redshift, Snowflake — analytics storage',
    icon: 'BarChart2',
    colorVar: '--color-node-data-warehouse',
    category: 'Storage',
    modes: ['system'],
    defaultData: {
      type: 'data-warehouse',
      engine: 'bigquery',
      storageGB: 1000,
      computeSlots: 100,
      queryConcurrency: 10,
      tableCount: 50,
      partitioningEnabled: true,
    },
    configFields: [
      { key: 'engine', label: 'Engine', type: 'select', options: [{ value: 'bigquery', label: 'BigQuery' }, { value: 'redshift', label: 'AWS Redshift' }, { value: 'snowflake', label: 'Snowflake' }, { value: 'databricks', label: 'Databricks' }, { value: 'clickhouse', label: 'ClickHouse' }] },
      { key: 'storageGB', label: 'Storage', type: 'number', min: 10, max: 10000000, step: 100, unit: 'GB' },
      { key: 'computeSlots', label: 'Compute Slots', type: 'number', min: 10, max: 10000, step: 10 },
      { key: 'queryConcurrency', label: 'Query Concurrency', type: 'number', min: 1, max: 1000, step: 1 },
      { key: 'tableCount', label: 'Table Count', type: 'number', min: 1, max: 100000, step: 10 },
      { key: 'partitioningEnabled', label: 'Partitioning', type: 'boolean' },
    ],
  },

  'stream-processor': {
    type: 'stream-processor',
    label: 'Stream Processor',
    description: 'Flink, Spark, Kafka Streams — real-time processing',
    icon: 'Waves',
    colorVar: '--color-node-stream-processor',
    category: 'Compute',
    modes: ['system'],
    defaultData: {
      type: 'stream-processor',
      engine: 'flink',
      parallelism: 4,
      checkpointIntervalMs: 10000,
      windowSizeMs: 60000,
      stateBackend: 'rocksdb',
      eventsPerSecond: 10000,
    },
    configFields: [
      { key: 'engine', label: 'Engine', type: 'select', options: [{ value: 'flink', label: 'Apache Flink' }, { value: 'spark', label: 'Spark Streaming' }, { value: 'kafka-streams', label: 'Kafka Streams' }, { value: 'kinesis', label: 'AWS Kinesis' }, { value: 'dataflow', label: 'Google Dataflow' }] },
      { key: 'parallelism', label: 'Parallelism', type: 'number', min: 1, max: 1024, step: 1 },
      { key: 'checkpointIntervalMs', label: 'Checkpoint Interval', type: 'number', min: 1000, max: 600000, step: 1000, unit: 'ms' },
      { key: 'windowSizeMs', label: 'Window Size', type: 'number', min: 1000, max: 3600000, step: 1000, unit: 'ms' },
      { key: 'stateBackend', label: 'State Backend', type: 'select', options: [{ value: 'memory', label: 'Memory' }, { value: 'rocksdb', label: 'RocksDB' }, { value: 'filesystem', label: 'Filesystem' }] },
      { key: 'eventsPerSecond', label: 'Event Rate', type: 'number', min: 100, max: 10000000, step: 100, unit: 'evt/s' },
    ],
  },

  'service-mesh': {
    type: 'service-mesh',
    label: 'Service Mesh',
    description: 'Istio, Linkerd — mTLS, circuit breaker, retry',
    icon: 'GitMerge',
    colorVar: '--color-node-service-mesh',
    category: 'Networking',
    modes: ['system'],
    defaultData: {
      type: 'service-mesh',
      implementation: 'istio',
      mtlsEnabled: true,
      circuitBreakerEnabled: true,
      retryEnabled: true,
      observabilityEnabled: true,
      ratelimitEnabled: false,
    },
    configFields: [
      { key: 'implementation', label: 'Implementation', type: 'select', options: [{ value: 'istio', label: 'Istio' }, { value: 'linkerd', label: 'Linkerd' }, { value: 'consul', label: 'Consul Connect' }, { value: 'kuma', label: 'Kuma' }] },
      { key: 'mtlsEnabled', label: 'mTLS', type: 'boolean' },
      { key: 'circuitBreakerEnabled', label: 'Circuit Breaker', type: 'boolean' },
      { key: 'retryEnabled', label: 'Auto-Retry', type: 'boolean' },
      { key: 'observabilityEnabled', label: 'Observability', type: 'boolean' },
      { key: 'ratelimitEnabled', label: 'Rate Limiting', type: 'boolean' },
    ],
  },

  // ─── UI Mode Nodes ────────────────────────────────────────────────────────

  screen: {
    type: 'screen',
    label: 'Screen',
    description: 'A UI screen or page',
    icon: 'Monitor',
    colorVar: '--color-node-screen',
    category: 'UI',
    modes: ['ui'],
    defaultData: {
      type: 'screen',
      name: 'New Screen',
      imageUrl: undefined,
      screenSize: 'desktop',
      apiBindings: [],
      navigationTriggers: [],
    },
    configFields: [
      { key: 'name', label: 'Screen Name', type: 'text', placeholder: 'Home, Dashboard, Profile...' },
      { key: 'screenSize', label: 'Screen Size', type: 'select', options: [{ value: 'mobile', label: 'Mobile (375px)' }, { value: 'tablet', label: 'Tablet (768px)' }, { value: 'desktop', label: 'Desktop (1440px)' }] },
      { key: 'imageUrl', label: 'Screen Image', type: 'image-upload', description: 'Upload a screenshot or mockup' },
    ],
  },

  'api-binding': {
    type: 'api-binding',
    label: 'API Binding',
    description: 'Binds an API call to UI rendering',
    icon: 'Link',
    colorVar: '--color-node-api-binding',
    category: 'UI',
    modes: ['ui'],
    defaultData: {
      type: 'api-binding',
      method: 'GET',
      path: '/api/',
      mockResponses: [],
      responseShape: null,
    },
    configFields: [
      { key: 'method', label: 'HTTP Method', type: 'select', options: [{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'PATCH', label: 'PATCH' }, { value: 'DELETE', label: 'DELETE' }] },
      { key: 'path', label: 'Path', type: 'text', placeholder: '/api/users/:id' },
      { key: 'responseShape', label: 'Response Shape (JSON Schema)', type: 'json-editor', description: 'Describe the response data structure' },
      { key: 'mockResponses', label: 'Mock Responses', type: 'rules-editor', description: 'Simulate API responses' },
    ],
  },

  component: {
    type: 'component',
    label: 'UI Component',
    description: 'A reusable UI component',
    icon: 'LayoutGrid',
    colorVar: '--color-node-component',
    category: 'UI',
    modes: ['ui'],
    defaultData: {
      type: 'component',
      name: 'Component',
      dynamicProps: [],
      componentProps: [],
    },
    configFields: [
      { key: 'name', label: 'Component Name', type: 'text', placeholder: 'UserCard, ProductList...' },
      { key: 'renderCondition', label: 'Render Condition', type: 'text', placeholder: 'data.isLoaded && data.user != null' },
      { key: 'componentProps', label: 'Component Props', type: 'props-editor', description: 'Define typed props' },
      { key: 'dynamicProps', label: 'Dynamic Props', type: 'tags' },
    ],
  },

  // ─── Service Mode Nodes ───────────────────────────────────────────────────

  'api-endpoint': {
    type: 'api-endpoint',
    label: 'API Endpoint',
    description: 'A single API endpoint definition',
    icon: 'Route',
    colorVar: '--color-node-api-endpoint',
    category: 'API',
    modes: ['service'],
    defaultData: {
      type: 'api-endpoint',
      method: 'GET',
      path: '/',
      protocol: 'rest',
      authRequired: false,
      payloadSchema: null,
      rateLimit: 0,
      requestBodyExample: '',
    },
    configFields: [
      { key: 'method', label: 'HTTP Method', type: 'select', options: [{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'PATCH', label: 'PATCH' }, { value: 'DELETE', label: 'DELETE' }] },
      { key: 'path', label: 'Path', type: 'text', placeholder: '/users/:id' },
      { key: 'protocol', label: 'Protocol', type: 'select', options: [{ value: 'rest', label: 'REST' }, { value: 'grpc', label: 'gRPC' }, { value: 'graphql', label: 'GraphQL' }] },
      { key: 'authRequired', label: 'Auth Required', type: 'boolean' },
      { key: 'rateLimit', label: 'Rate Limit', type: 'number', min: 0, max: 100000, step: 10, unit: 'req/min' },
      { key: 'requestBodyExample', label: 'Request Body Example', type: 'json-editor', description: 'JSON example of the request body' },
    ],
  },

  'validation-step': {
    type: 'validation-step',
    label: 'Validation',
    description: 'Request validation rules',
    icon: 'ShieldCheck',
    colorVar: '--color-node-validation-step',
    category: 'API',
    modes: ['service'],
    defaultData: {
      type: 'validation-step',
      rules: [],
      onFailure: 'reject',
    },
    configFields: [
      { key: 'rules', label: 'Validation Rules', type: 'rules-editor', description: 'Add field validation rules' },
      { key: 'onFailure', label: 'On Failure', type: 'select', options: [{ value: 'reject', label: 'Reject (400)' }, { value: 'sanitize', label: 'Sanitize' }, { value: 'default', label: 'Use Defaults' }] },
    ],
  },

  'db-step': {
    type: 'db-step',
    label: 'DB Operation',
    description: 'Database interaction step',
    icon: 'HardDrive',
    colorVar: '--color-node-db-step',
    category: 'API',
    modes: ['service'],
    defaultData: {
      type: 'db-step',
      operation: 'SELECT',
      collection: 'users',
      indexed: true,
      queryTimeoutMs: 5000,
      returning: false,
      indexHint: '',
    },
    configFields: [
      { key: 'operation', label: 'Operation', type: 'select', options: [{ value: 'SELECT', label: 'SELECT' }, { value: 'INSERT', label: 'INSERT' }, { value: 'UPDATE', label: 'UPDATE' }, { value: 'DELETE', label: 'DELETE' }, { value: 'read-write', label: 'Read + Write (transaction)' }] },
      { key: 'collection', label: 'Table / Collection', type: 'text', placeholder: 'users, orders...' },
      { key: 'indexed', label: 'Uses Index', type: 'boolean' },
      { key: 'returning', label: 'RETURNING clause', type: 'boolean' },
      { key: 'indexHint', label: 'Index Hint', type: 'text', placeholder: 'idx_email, PRIMARY...' },
      { key: 'queryTimeoutMs', label: 'Query Timeout', type: 'number', min: 100, max: 30000, step: 100, unit: 'ms' },
    ],
  },

  'response-config': {
    type: 'response-config',
    label: 'Response',
    description: 'Configures the API response',
    icon: 'SendHorizonal',
    colorVar: '--color-node-response-config',
    category: 'API',
    modes: ['service'],
    defaultData: {
      type: 'response-config',
      successStatus: 200,
      errorStatus: 400,
      responseShape: null,
      cacheControl: 'no-cache',
      mockResponseBody: '{\n  "success": true\n}',
    },
    configFields: [
      { key: 'successStatus', label: 'Success Status', type: 'number', min: 200, max: 299, step: 1 },
      { key: 'errorStatus', label: 'Error Status', type: 'number', min: 400, max: 599, step: 1 },
      { key: 'cacheControl', label: 'Cache-Control', type: 'text', placeholder: 'no-cache, max-age=3600...' },
      { key: 'mockResponseBody', label: 'Mock Response Body', type: 'json-editor', description: 'JSON response body for documentation/mocking' },
    ],
  },

  'middleware-step': {
    type: 'middleware-step',
    label: 'Middleware',
    description: 'Auth, rate-limit, logging, CORS, cache',
    icon: 'Settings2',
    colorVar: '--color-node-middleware-step',
    category: 'API',
    modes: ['service'],
    defaultData: {
      type: 'middleware-step',
      middlewareType: 'auth',
      enabled: true,
      config: {},
    },
    configFields: [
      { key: 'middlewareType', label: 'Middleware Type', type: 'select', options: [{ value: 'auth', label: 'Authentication' }, { value: 'rate-limit', label: 'Rate Limiting' }, { value: 'logging', label: 'Logging' }, { value: 'cors', label: 'CORS' }, { value: 'cache', label: 'Response Cache' }, { value: 'compression', label: 'Compression' }] },
      { key: 'enabled', label: 'Enabled', type: 'boolean' },
    ],
  },

  'branch-step': {
    type: 'branch-step',
    label: 'Branch / Condition',
    description: 'Conditional split with true/false paths',
    icon: 'GitBranch',
    colorVar: '--color-node-branch-step',
    category: 'API',
    modes: ['service'],
    defaultData: {
      type: 'branch-step',
      condition: 'request.user.role === "admin"',
      trueProbability: 30,
      description: '',
    },
    configFields: [
      { key: 'condition', label: 'Condition', type: 'text', placeholder: 'user.role === "admin"' },
      { key: 'trueProbability', label: 'True Probability (Simulation)', type: 'number', min: 0, max: 100, step: 5, unit: '%' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What does this branch decide?' },
    ],
  },

  'error-handler': {
    type: 'error-handler',
    label: 'Error Handler',
    description: 'Handle errors with retry or fallback',
    icon: 'AlertOctagon',
    colorVar: '--color-node-error-handler',
    category: 'API',
    modes: ['service'],
    defaultData: {
      type: 'error-handler',
      statusCode: 500,
      errorMessage: 'Internal Server Error',
      retry: false,
      maxRetries: 3,
      retryDelayMs: 1000,
      fallbackNodeId: '',
    },
    configFields: [
      { key: 'statusCode', label: 'Status Code', type: 'number', min: 400, max: 599, step: 1 },
      { key: 'errorMessage', label: 'Error Message', type: 'text', placeholder: 'Internal Server Error' },
      { key: 'retry', label: 'Retry on Error', type: 'boolean' },
      { key: 'maxRetries', label: 'Max Retries', type: 'number', min: 1, max: 10, step: 1 },
      { key: 'retryDelayMs', label: 'Retry Delay', type: 'number', min: 100, max: 30000, step: 100, unit: 'ms' },
    ],
  },
}

// ─── Mode → Types Mapping ─────────────────────────────────────────────────────

export const NODE_TYPES_BY_MODE: Record<DesignMode, NodeType[]> = {
  system: [
    'microservice', 'load-balancer', 'api-gateway', 'reverse-proxy', 'container-orchestrator', 'serverless', 'background-worker', 'cron-scheduler', 'websocket-server',
    'database', 'cache', 'object-storage', 'search-engine', 'data-warehouse',
    'queue', 'message-broker', 'stream-processor',
    'cdn', 'dns', 'vpc-zone',
    'waf', 'auth-service', 'service-mesh',
    'external-service', 'email-service', 'feature-flags', 'observability',
  ],
  ui: ['screen', 'api-binding', 'component'],
  service: ['api-endpoint', 'middleware-step', 'validation-step', 'db-step', 'response-config', 'branch-step', 'error-handler'],
}

export const NODE_CATEGORY_ORDER: Record<DesignMode, string[]> = {
  system: ['Compute', 'Networking', 'Security', 'Storage', 'Messaging', 'Integrations', 'Operations'],
  ui: ['UI'],
  service: ['API'],
}
