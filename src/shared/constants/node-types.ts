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
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const NODE_TYPE_REGISTRY: Record<NodeType, NodeTypeDef> = {
  microservice: {
    type: 'microservice',
    label: 'Microservice',
    description: 'An independent deployable service',
    icon: 'Server',
    colorVar: '--color-node-microservice',
    category: 'Compute',
    modes: ['system'],
    defaultData: {
      type: 'microservice',
      language: 'node',
      framework: 'express',
      replicas: 1,
      cpuLimit: '500m',
      memoryLimit: '512Mi',
      port: 3000,
      env: {},
    },
    configFields: [
      { key: 'language', label: 'Language', type: 'select', options: [{ value: 'node', label: 'Node.js' }, { value: 'go', label: 'Go' }, { value: 'python', label: 'Python' }, { value: 'java', label: 'Java' }, { value: 'rust', label: 'Rust' }, { value: 'csharp', label: 'C#' }] },
      { key: 'framework', label: 'Framework', type: 'text', placeholder: 'express, fastify, gin...' },
      { key: 'replicas', label: 'Replicas', type: 'number', min: 1, max: 100, step: 1 },
      { key: 'cpuLimit', label: 'CPU Limit', type: 'text', placeholder: '500m, 1, 2...' },
      { key: 'memoryLimit', label: 'Memory Limit', type: 'text', placeholder: '512Mi, 1Gi...' },
      { key: 'port', label: 'Port', type: 'number', min: 1, max: 65535, step: 1 },
      { key: 'env', label: 'Environment Variables', type: 'key-value' },
    ],
  },

  database: {
    type: 'database',
    label: 'Database',
    description: 'Persistent data storage',
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
    },
    configFields: [
      { key: 'engine', label: 'Engine', type: 'select', options: [{ value: 'postgres', label: 'PostgreSQL' }, { value: 'mysql', label: 'MySQL' }, { value: 'mongodb', label: 'MongoDB' }, { value: 'cassandra', label: 'Cassandra' }, { value: 'redis', label: 'Redis' }, { value: 'dynamodb', label: 'DynamoDB' }, { value: 'sqlite', label: 'SQLite' }] },
      { key: 'storageGB', label: 'Storage', type: 'number', min: 1, max: 10000, step: 1, unit: 'GB' },
      { key: 'connectionPoolSize', label: 'Connection Pool', type: 'number', min: 1, max: 1000, step: 1 },
      { key: 'replication', label: 'Replication Enabled', type: 'boolean' },
      { key: 'readReplicas', label: 'Read Replicas', type: 'number', min: 0, max: 10, step: 1 },
    ],
  },

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
    },
    configFields: [
      { key: 'engine', label: 'Engine', type: 'select', options: [{ value: 'rabbitmq', label: 'RabbitMQ' }, { value: 'kafka', label: 'Kafka' }, { value: 'sqs', label: 'AWS SQS' }, { value: 'pubsub', label: 'Google Pub/Sub' }, { value: 'redis', label: 'Redis Streams' }] },
      { key: 'maxConcurrentConsumers', label: 'Max Consumers', type: 'number', min: 1, max: 100, step: 1 },
      { key: 'messageRetentionHours', label: 'Message Retention', type: 'number', min: 1, max: 720, step: 1, unit: 'hrs' },
      { key: 'dlqEnabled', label: 'Dead Letter Queue', type: 'boolean' },
    ],
  },

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
    },
    configFields: [
      { key: 'engine', label: 'Engine', type: 'select', options: [{ value: 'redis', label: 'Redis' }, { value: 'memcached', label: 'Memcached' }, { value: 'cloudflare', label: 'Cloudflare KV' }] },
      { key: 'maxMemoryMB', label: 'Max Memory', type: 'number', min: 64, max: 65536, step: 64, unit: 'MB' },
      { key: 'evictionPolicy', label: 'Eviction Policy', type: 'select', options: [{ value: 'lru', label: 'LRU' }, { value: 'lfu', label: 'LFU' }, { value: 'fifo', label: 'FIFO' }] },
      { key: 'ttlSeconds', label: 'Default TTL', type: 'number', min: 0, max: 86400, step: 60, unit: 'sec' },
    ],
  },

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
    },
    configFields: [
      { key: 'algorithm', label: 'Algorithm', type: 'select', options: [{ value: 'round-robin', label: 'Round Robin' }, { value: 'least-connections', label: 'Least Connections' }, { value: 'ip-hash', label: 'IP Hash' }, { value: 'random', label: 'Random' }] },
      { key: 'healthCheckInterval', label: 'Health Check Interval', type: 'number', min: 5, max: 300, step: 5, unit: 'sec' },
      { key: 'maxConnections', label: 'Max Connections', type: 'number', min: 100, max: 1000000, step: 100 },
    ],
  },

  cdn: {
    type: 'cdn',
    label: 'CDN',
    description: 'Content delivery network',
    icon: 'Globe',
    colorVar: '--color-node-cdn',
    category: 'Networking',
    modes: ['system'],
    defaultData: {
      type: 'cdn',
      provider: 'cloudflare',
      ttlSeconds: 86400,
      cacheRules: [],
    },
    configFields: [
      { key: 'provider', label: 'Provider', type: 'select', options: [{ value: 'cloudflare', label: 'Cloudflare' }, { value: 'cloudfront', label: 'AWS CloudFront' }, { value: 'fastly', label: 'Fastly' }, { value: 'akamai', label: 'Akamai' }] },
      { key: 'ttlSeconds', label: 'Cache TTL', type: 'number', min: 0, max: 604800, step: 3600, unit: 'sec' },
      { key: 'cacheRules', label: 'Cache Rules', type: 'tags' },
    ],
  },

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
    },
    configFields: [
      { key: 'runtime', label: 'Runtime', type: 'select', options: [{ value: 'node', label: 'Node.js' }, { value: 'python', label: 'Python' }, { value: 'go', label: 'Go' }, { value: 'java', label: 'Java' }, { value: 'rust', label: 'Rust' }] },
      { key: 'memoryMB', label: 'Memory', type: 'number', min: 128, max: 10240, step: 128, unit: 'MB' },
      { key: 'timeoutSeconds', label: 'Timeout', type: 'number', min: 1, max: 900, step: 1, unit: 'sec' },
      { key: 'concurrencyLimit', label: 'Concurrency Limit', type: 'number', min: 1, max: 1000, step: 1 },
    ],
  },

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
      apiBindings: [],
    },
    configFields: [
      { key: 'name', label: 'Screen Name', type: 'text', placeholder: 'Home, Dashboard, Profile...' },
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
    },
    configFields: [
      { key: 'method', label: 'HTTP Method', type: 'select', options: [{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'PATCH', label: 'PATCH' }, { value: 'DELETE', label: 'DELETE' }] },
      { key: 'path', label: 'Path', type: 'text', placeholder: '/api/users/:id' },
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
    },
    configFields: [
      { key: 'name', label: 'Component Name', type: 'text', placeholder: 'UserCard, ProductList...' },
      { key: 'renderCondition', label: 'Render Condition', type: 'text', placeholder: 'data.isLoaded && data.user != null' },
      { key: 'dynamicProps', label: 'Dynamic Props', type: 'tags' },
    ],
  },

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
    },
    configFields: [
      { key: 'method', label: 'HTTP Method', type: 'select', options: [{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'PATCH', label: 'PATCH' }, { value: 'DELETE', label: 'DELETE' }] },
      { key: 'path', label: 'Path', type: 'text', placeholder: '/users/:id' },
      { key: 'protocol', label: 'Protocol', type: 'select', options: [{ value: 'rest', label: 'REST' }, { value: 'grpc', label: 'gRPC' }, { value: 'graphql', label: 'GraphQL' }] },
      { key: 'authRequired', label: 'Auth Required', type: 'boolean' },
      { key: 'rateLimit', label: 'Rate Limit', type: 'number', min: 0, max: 100000, step: 10, unit: 'req/min' },
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
      operation: 'read',
      collection: 'users',
      indexed: true,
      queryTimeoutMs: 5000,
    },
    configFields: [
      { key: 'operation', label: 'Operation', type: 'select', options: [{ value: 'read', label: 'Read' }, { value: 'write', label: 'Write' }, { value: 'read-write', label: 'Read + Write' }] },
      { key: 'collection', label: 'Collection / Table', type: 'text', placeholder: 'users, orders...' },
      { key: 'indexed', label: 'Uses Index', type: 'boolean' },
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
    },
    configFields: [
      { key: 'successStatus', label: 'Success Status', type: 'number', min: 200, max: 299, step: 1 },
      { key: 'errorStatus', label: 'Error Status', type: 'number', min: 400, max: 599, step: 1 },
      { key: 'cacheControl', label: 'Cache-Control', type: 'text', placeholder: 'no-cache, max-age=3600...' },
    ],
  },
}

export const NODE_TYPES_BY_MODE: Record<DesignMode, NodeType[]> = {
  system: ['microservice', 'database', 'queue', 'cache', 'load-balancer', 'cdn', 'serverless'],
  ui: ['screen', 'api-binding', 'component'],
  service: ['api-endpoint', 'validation-step', 'db-step', 'response-config'],
}

export const NODE_CATEGORY_ORDER: Record<DesignMode, string[]> = {
  system: ['Compute', 'Networking', 'Storage', 'Messaging'],
  ui: ['UI'],
  service: ['API'],
}
