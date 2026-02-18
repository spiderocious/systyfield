import type { DesignMode } from '@shared/types/design.types'
import { NODE_TYPE_REGISTRY } from '@shared/constants'
import type { CanvasNode } from '@features/canvas/types'
import type { Edge } from '@xyflow/react'

export interface DemoTemplate {
  id: string
  title: string
  description: string
  badge: string
  badgeColor: string
  mode: DesignMode
  category: string
  tip: string
  nodes: CanvasNode[]
  edges: Edge[]
}

function node(id: string, type: keyof typeof NODE_TYPE_REGISTRY, label: string, x: number, y: number, overrides?: Record<string, unknown>): CanvasNode {
  const def = NODE_TYPE_REGISTRY[type]
  return {
    id,
    type: 'base',
    position: { x, y },
    data: {
      label,
      nodeType: type,
      data: { ...def.defaultData, ...overrides },
    },
  }
}

function edge(id: string, source: string, target: string, edgeType = 'http'): Edge {
  return { id, source, target, type: 'default', data: { edgeType, label: '' } }
}

export const DEMO_TEMPLATES: DemoTemplate[] = [

  // ── 1. Basic API ──────────────────────────────────────────────────────────────
  {
    id: 'basic-api',
    title: 'Basic API Service',
    badge: 'Beginner',
    badgeColor: 'text-success bg-success/10',
    mode: 'system',
    category: 'System',
    description: 'A single microservice behind a load balancer, backed by a PostgreSQL database — the foundation of most production APIs.',
    tip: 'Try running a Load Test simulation to see how the service handles ramp-up traffic.',
    nodes: [
      node('lb1', 'load-balancer', 'Load Balancer', 60, 140),
      node('svc1', 'microservice', 'API Service', 260, 140, { replicas: 2 }),
      node('db1', 'database', 'PostgreSQL', 460, 140),
    ],
    edges: [
      edge('e1', 'lb1', 'svc1'),
      edge('e2', 'svc1', 'db1', 'sql'),
    ],
  },

  // ── 2. Microservices cluster ───────────────────────────────────────────────────
  {
    id: 'microservices',
    title: 'Microservices Cluster',
    badge: 'Advanced',
    badgeColor: 'text-primary bg-primary/10',
    mode: 'system',
    category: 'System',
    description: 'CDN → load balancer → two independent services sharing a Postgres DB, with Redis cache and a Kafka queue for async processing.',
    tip: 'Run a Cascade Failure simulation to see how one failing service affects the rest of the graph.',
    nodes: [
      node('cdn1', 'cdn', 'CDN', 20, 180),
      node('lb1', 'load-balancer', 'Load Balancer', 190, 180),
      node('svc1', 'microservice', 'User Service', 360, 80, { replicas: 3 }),
      node('svc2', 'microservice', 'Order Service', 360, 270, { replicas: 2 }),
      node('cache1', 'cache', 'Redis', 540, 40),
      node('db1', 'database', 'Postgres', 540, 180),
      node('q1', 'queue', 'Kafka', 540, 320),
    ],
    edges: [
      edge('e1', 'cdn1', 'lb1'),
      edge('e2', 'lb1', 'svc1'),
      edge('e3', 'lb1', 'svc2'),
      edge('e4', 'svc1', 'cache1'),
      edge('e5', 'svc1', 'db1', 'sql'),
      edge('e6', 'svc2', 'q1', 'event'),
      edge('e7', 'svc2', 'db1', 'sql'),
    ],
  },

  // ── 3. E-Commerce Platform ────────────────────────────────────────────────────
  {
    id: 'ecommerce',
    title: 'E-Commerce Platform',
    badge: 'Full-Stack',
    badgeColor: 'text-warning bg-warning/10',
    mode: 'system',
    category: 'System',
    description: 'Full e-commerce stack: API gateway, auth service, product/order/payment microservices, Stripe external service, and a message broker for async events.',
    tip: 'Simulate a Thundering Herd — like Black Friday traffic — to stress-test your checkout flow.',
    nodes: [
      node('gw', 'api-gateway', 'API Gateway', 30, 200),
      node('auth', 'auth-service', 'Auth Service', 220, 60),
      node('products', 'microservice', 'Product Svc', 220, 200, { replicas: 2 }),
      node('orders', 'microservice', 'Order Svc', 220, 340),
      node('payment', 'microservice', 'Payment Svc', 420, 340),
      node('stripe', 'external-service', 'Stripe', 620, 340),
      node('broker', 'message-broker', 'Event Bus', 420, 200),
      node('db', 'database', 'Main DB', 420, 60),
      node('cache', 'cache', 'Redis', 620, 60),
    ],
    edges: [
      edge('e1', 'gw', 'auth'),
      edge('e2', 'gw', 'products'),
      edge('e3', 'gw', 'orders'),
      edge('e4', 'orders', 'payment'),
      edge('e5', 'payment', 'stripe'),
      edge('e6', 'orders', 'broker', 'event'),
      edge('e7', 'products', 'cache'),
      edge('e8', 'products', 'db', 'sql'),
      edge('e9', 'orders', 'db', 'sql'),
      edge('e10', 'auth', 'cache'),
    ],
  },

  // ── 4. Real-Time Chat ─────────────────────────────────────────────────────────
  {
    id: 'realtime-chat',
    title: 'Real-Time Chat System',
    badge: 'WebSocket',
    badgeColor: 'text-success bg-success/10',
    mode: 'system',
    category: 'System',
    description: 'WebSocket server for live messaging, a Pub/Sub message broker for fan-out, a message queue for persistence, and Redis for session/presence tracking.',
    tip: 'Try Queue Backpressure simulation to see what happens when messages pile up faster than consumers can process them.',
    nodes: [
      node('lb', 'load-balancer', 'WS Load Balancer', 40, 180),
      node('ws', 'websocket-server', 'WebSocket Server', 230, 80, { maxConnections: 10000 }),
      node('rest', 'microservice', 'REST API', 230, 280),
      node('broker', 'message-broker', 'Redis Pub/Sub', 430, 80),
      node('q', 'queue', 'Message Queue', 430, 280),
      node('session', 'cache', 'Session Store', 630, 80),
      node('db', 'database', 'Messages DB', 630, 280),
    ],
    edges: [
      edge('e1', 'lb', 'ws', 'websocket'),
      edge('e2', 'lb', 'rest'),
      edge('e3', 'ws', 'broker', 'event'),
      edge('e4', 'broker', 'ws', 'event'),
      edge('e5', 'ws', 'session'),
      edge('e6', 'rest', 'q', 'event'),
      edge('e7', 'q', 'db', 'sql'),
    ],
  },

  // ── 5. Event-Driven Data Pipeline ─────────────────────────────────────────────
  {
    id: 'event-pipeline',
    title: 'Event-Driven Data Pipeline',
    badge: 'Async',
    badgeColor: 'text-primary bg-primary/10',
    mode: 'system',
    category: 'System',
    description: 'Producers emit events to a Kafka queue. Multiple independent consumers process different streams, feeding a data warehouse for analytics.',
    tip: 'Run a Soak Test to verify the pipeline handles sustained load without queue depth growing unbounded.',
    nodes: [
      node('prod1', 'microservice', 'User Events Producer', 40, 100),
      node('prod2', 'microservice', 'Order Events Producer', 40, 260),
      node('kafka', 'queue', 'Kafka', 260, 180, { maxQueueDepth: 50000 }),
      node('c1', 'background-worker', 'Analytics Consumer', 480, 60),
      node('c2', 'background-worker', 'Email Consumer', 480, 180),
      node('c3', 'background-worker', 'Audit Consumer', 480, 300),
      node('dw', 'data-warehouse', 'Data Warehouse', 700, 60),
      node('email', 'email-service', 'Email Service', 700, 180),
      node('db', 'database', 'Audit Log DB', 700, 300),
    ],
    edges: [
      edge('e1', 'prod1', 'kafka', 'event'),
      edge('e2', 'prod2', 'kafka', 'event'),
      edge('e3', 'kafka', 'c1', 'event'),
      edge('e4', 'kafka', 'c2', 'event'),
      edge('e5', 'kafka', 'c3', 'event'),
      edge('e6', 'c1', 'dw', 'sql'),
      edge('e7', 'c2', 'email'),
      edge('e8', 'c3', 'db', 'sql'),
    ],
  },

  // ── 6. Global CDN + Multi-region ──────────────────────────────────────────────
  {
    id: 'global-cdn',
    title: 'Global CDN Architecture',
    badge: 'Infrastructure',
    badgeColor: 'text-info bg-info/10',
    mode: 'system',
    category: 'System',
    description: 'DNS routing, a WAF for protection, multi-region CDN edge nodes, an origin microservice cluster, and object storage for static assets.',
    tip: 'Configure the CDN node\'s cache hit rate target — a higher hit rate dramatically reduces origin load in Load Test.',
    nodes: [
      node('dns', 'dns', 'DNS (Route53)', 40, 160),
      node('waf', 'waf', 'WAF', 200, 160),
      node('cdn', 'cdn', 'CloudFront CDN', 380, 160, { cacheHitRateTarget: 0.95, regions: ['us-east', 'eu-west', 'ap-south'] }),
      node('lb', 'load-balancer', 'Origin LB', 580, 60),
      node('origin1', 'microservice', 'Origin Service', 760, 60, { replicas: 3 }),
      node('storage', 'object-storage', 'S3 Bucket', 580, 280),
      node('db', 'database', 'RDS Aurora', 760, 280),
    ],
    edges: [
      edge('e1', 'dns', 'waf'),
      edge('e2', 'waf', 'cdn'),
      edge('e3', 'cdn', 'lb'),
      edge('e4', 'cdn', 'storage'),
      edge('e5', 'lb', 'origin1'),
      edge('e6', 'origin1', 'db', 'sql'),
    ],
  },

  // ── 7. Serverless + Function Architecture ─────────────────────────────────────
  {
    id: 'serverless',
    title: 'Serverless Functions',
    badge: 'Serverless',
    badgeColor: 'text-accent bg-accent/10',
    mode: 'system',
    category: 'System',
    description: 'API Gateway triggers Lambda-like serverless functions for auth, processing, and notifications — with SQS for queue-based triggers and S3 for file handling.',
    tip: 'Enable provisioned concurrency in the serverless node config to eliminate cold start latency in simulations.',
    nodes: [
      node('gw', 'api-gateway', 'API Gateway', 40, 180),
      node('fn1', 'serverless', 'Auth Function', 240, 80, { coldStartMs: 300, provisionedConcurrency: 0 }),
      node('fn2', 'serverless', 'Process Function', 240, 200, { coldStartMs: 500 }),
      node('fn3', 'serverless', 'Notify Function', 240, 340, { coldStartMs: 200 }),
      node('q', 'queue', 'SQS Queue', 440, 200),
      node('storage', 'object-storage', 'S3', 440, 340),
      node('db', 'database', 'DynamoDB', 640, 200),
    ],
    edges: [
      edge('e1', 'gw', 'fn1'),
      edge('e2', 'gw', 'fn2'),
      edge('e3', 'fn2', 'q', 'event'),
      edge('e4', 'q', 'fn3', 'event'),
      edge('e5', 'fn1', 'db', 'sql'),
      edge('e6', 'fn2', 'storage'),
    ],
  },

  // ── 8. Observability Stack ─────────────────────────────────────────────────────
  {
    id: 'observability',
    title: 'Observability & Monitoring',
    badge: 'Ops',
    badgeColor: 'text-warning bg-warning/10',
    mode: 'system',
    category: 'System',
    description: 'A service mesh with distributed tracing, a centralized observability platform, and feature flags for gradual rollout — the visibility layer for production systems.',
    tip: 'Add a Feature Flags node to your architecture and configure percentage-based rollout in the config panel.',
    nodes: [
      node('sm', 'service-mesh', 'Istio Mesh', 40, 180),
      node('svc1', 'microservice', 'Service A', 240, 60, { replicas: 2 }),
      node('svc2', 'microservice', 'Service B', 240, 200),
      node('svc3', 'microservice', 'Service C', 240, 340),
      node('obs', 'observability', 'Datadog', 480, 200),
      node('ff', 'feature-flags', 'Feature Flags', 480, 340),
      node('db', 'database', 'TimeSeries DB', 700, 200),
    ],
    edges: [
      edge('e1', 'sm', 'svc1'),
      edge('e2', 'sm', 'svc2'),
      edge('e3', 'sm', 'svc3'),
      edge('e4', 'svc1', 'obs'),
      edge('e5', 'svc2', 'obs'),
      edge('e6', 'obs', 'db', 'sql'),
      edge('e7', 'svc1', 'ff'),
    ],
  },

  // ── 9. REST API Pipeline ─────────────────────────────────────────────────────
  {
    id: 'api-pipeline',
    title: 'REST API Pipeline',
    badge: 'Service Mode',
    badgeColor: 'text-accent bg-accent/10',
    mode: 'service',
    category: 'Service',
    description: 'Model a single endpoint at the service level: POST /users flows through validation, a DB write, then returns a 201 response.',
    tip: 'Click any node and use the config panel to change the HTTP method, path, or validation rules.',
    nodes: [
      node('ep1', 'api-endpoint', 'POST /users', 140, 40),
      node('v1', 'validation-step', 'Validate Body', 140, 170),
      node('db1', 'db-step', 'Insert User', 140, 300),
      node('r1', 'response-config', '201 Created', 140, 430),
    ],
    edges: [
      edge('e1', 'ep1', 'v1'),
      edge('e2', 'v1', 'db1'),
      edge('e3', 'db1', 'r1'),
    ],
  },

  // ── 10. Multi-step Checkout API ────────────────────────────────────────────────
  {
    id: 'checkout-api',
    title: 'Checkout API Flow',
    badge: 'Service Mode',
    badgeColor: 'text-accent bg-accent/10',
    mode: 'service',
    category: 'Service',
    description: 'Multi-step checkout: validate cart, auth check, inventory lookup, charge payment, then emit an order event — with a branch for out-of-stock handling.',
    tip: 'Use the Branch Step node to model the in-stock vs. out-of-stock decision path.',
    nodes: [
      node('ep', 'api-endpoint', 'POST /checkout', 150, 20),
      node('v1', 'validation-step', 'Validate Cart', 150, 130),
      node('mw', 'middleware-step', 'Auth Check', 150, 240),
      node('db1', 'db-step', 'Check Inventory', 150, 350),
      node('branch', 'branch-step', 'In Stock?', 150, 460),
      node('db2', 'db-step', 'Charge Payment', 150, 570),
      node('r1', 'response-config', '200 Order Created', 150, 680),
    ],
    edges: [
      edge('e1', 'ep', 'v1'),
      edge('e2', 'v1', 'mw'),
      edge('e3', 'mw', 'db1'),
      edge('e4', 'db1', 'branch'),
      edge('e5', 'branch', 'db2'),
      edge('e6', 'db2', 'r1'),
    ],
  },

  // ── 11. UI Architecture Flow ──────────────────────────────────────────────────
  {
    id: 'ui-flow',
    title: 'UI Architecture Flow',
    badge: 'UI Mode',
    badgeColor: 'text-warning bg-warning/10',
    mode: 'ui',
    category: 'UI',
    description: 'Map screens to API bindings and reusable components — a Login page, a Dashboard, an auth call, a profile fetch, and a UserCard component.',
    tip: 'Click any Screen node and upload a screenshot or mockup from the config panel — it shows up right in the node.',
    nodes: [
      node('s1', 'screen', 'Login Page', 40, 80),
      node('s2', 'screen', 'Dashboard', 40, 260),
      node('api1', 'api-binding', 'POST /auth/login', 260, 80),
      node('api2', 'api-binding', 'GET /user/profile', 260, 260),
      node('c1', 'component', 'UserCard', 480, 260),
    ],
    edges: [
      edge('e1', 's1', 'api1'),
      edge('e2', 's2', 'api2'),
      edge('e3', 'api2', 'c1'),
    ],
  },

  // ── 12. E-Commerce UI ────────────────────────────────────────────────────────
  {
    id: 'ecommerce-ui',
    title: 'E-Commerce UI Flow',
    badge: 'UI Mode',
    badgeColor: 'text-warning bg-warning/10',
    mode: 'ui',
    category: 'UI',
    description: 'Full shop UI: Product Listing, Product Detail, Cart, and Checkout pages — connected to their respective API calls and reusable UI components.',
    tip: 'Add navigation triggers in the Screen node config to show how users flow between pages.',
    nodes: [
      node('s1', 'screen', 'Product Listing', 40, 60),
      node('s2', 'screen', 'Product Detail', 40, 200),
      node('s3', 'screen', 'Cart', 40, 340),
      node('s4', 'screen', 'Checkout', 40, 480),
      node('api1', 'api-binding', 'GET /products', 260, 60),
      node('api2', 'api-binding', 'GET /products/:id', 260, 200),
      node('api3', 'api-binding', 'POST /cart/add', 260, 340),
      node('api4', 'api-binding', 'POST /checkout', 260, 480),
      node('c1', 'component', 'ProductCard', 480, 60),
      node('c2', 'component', 'CartItem', 480, 340),
    ],
    edges: [
      edge('e1', 's1', 'api1', 'navigation'),
      edge('e2', 's2', 'api2', 'navigation'),
      edge('e3', 's3', 'api3'),
      edge('e4', 's4', 'api4'),
      edge('e5', 'api1', 'c1'),
      edge('e6', 'api3', 'c2'),
    ],
  },
]
