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

function bedge(id: string, source: string, target: string, edgeType: string, sourceHandle?: string, label?: string): Edge {
  return { id, source, target, type: 'default', sourceHandle, data: { edgeType, label: label ?? '' } }
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

  // ── 13. Access Eligibility Gate ──────────────────────────────────────────────
  {
    id: 'eligibility-gate',
    title: 'Access Eligibility Gate',
    badge: 'Flow Logic',
    badgeColor: 'text-primary bg-primary/10',
    mode: 'ui',
    category: 'UI',
    description: 'A feature-flag-gated eligibility check with four response branches — each maps the user to a different restriction state or unlocks the feature.',
    tip: 'Run the UI API Response simulation and select each branch to see how the restriction routing changes.',
    nodes: [
      node('entry', 'screen', 'Feature Entry', 200, 40),
      node('ff', 'feature-flag-gate', 'Eligibility V2 Active?', 200, 190, { flagName: 'eligibility_v2_enabled', rolloutPercent: 100, trueLabel: 'Enabled', falseLabel: 'Fallback' }),
      node('legacy', 'named-state', 'Legacy Access', 200, 360, { stateName: 'LEGACY_FLOW', isTerminal: true }),
      node('api', 'api-call', 'GET /eligibility/status', 480, 190, {
        method: 'GET',
        endpoint: '/eligibility/status',
        authHeader: 'Bearer token',
        responseBranches: [
          { value: 'APPROVED', label: 'Access Granted', description: 'User meets all eligibility criteria', statusCode: 200 },
          { value: 'RESTRICTED_AGE', label: 'Age Restriction', description: 'Does not meet minimum age requirement', statusCode: 200 },
          { value: 'RESTRICTED_DOCS', label: 'Documents Required', description: 'Pending document verification', statusCode: 200 },
          { value: 'RESTRICTED_TYPE', label: 'Account Incompatible', description: 'Account type not supported', statusCode: 200 },
        ],
      }),
      node('home', 'screen', 'Feature Home', 760, 60),
      node('age', 'named-state', 'Age Restriction', 760, 190, { stateName: 'RESTRICTED_AGE' }),
      node('docs', 'named-state', 'Docs Required', 760, 300, { stateName: 'RESTRICTED_DOCS' }),
      node('type', 'named-state', 'Type Incompatible', 760, 410, { stateName: 'RESTRICTED_TYPE', isTerminal: true }),
      node('support', 'navigation-trigger', 'Contact Support', 980, 190, { route: '/support', strategy: 'modal' }),
      node('verify', 'navigation-trigger', 'Submit Documents', 980, 300, { route: '/verify-docs', strategy: 'push' }),
    ],
    edges: [
      bedge('e1', 'entry', 'ff', 'navigates-to'),
      bedge('e2', 'ff', 'api', 'flag-on', 'flag-on', 'Enabled'),
      bedge('e3', 'ff', 'legacy', 'flag-off', 'flag-off', 'Fallback'),
      bedge('e4', 'api', 'home', 'on-success', 'branch-APPROVED', 'APPROVED'),
      bedge('e5', 'api', 'age', 'on-success', 'branch-RESTRICTED_AGE', 'RESTRICTED_AGE'),
      bedge('e6', 'api', 'docs', 'on-success', 'branch-RESTRICTED_DOCS', 'RESTRICTED_DOCS'),
      bedge('e7', 'api', 'type', 'on-error', 'branch-RESTRICTED_TYPE', 'RESTRICTED_TYPE'),
      bedge('e8', 'age', 'support', 'triggers'),
      bedge('e9', 'docs', 'verify', 'triggers'),
    ],
  },

  // ── 14. Biometric Identity Bridge ────────────────────────────────────────────
  {
    id: 'biometric-identity-bridge',
    title: 'Biometric Identity Bridge',
    badge: 'Async Flow',
    badgeColor: 'text-success bg-success/10',
    mode: 'ui',
    category: 'UI',
    description: 'Feature-flag-switched biometric verification flow: SDK initialisation, response branching, async polling until verified/failed, then downstream routing.',
    tip: 'Run the UI Polling Viz simulation to see the Poll Verification Status node pulse every 3 seconds.',
    nodes: [
      node('entry', 'screen', 'Identity Check Screen', 200, 40),
      node('ff', 'feature-flag-gate', 'Enhanced Biometrics?', 200, 190, { flagName: 'biometric_v2_enabled', rolloutPercent: 80, trueLabel: 'BioV2', falseLabel: 'Legacy' }),
      node('legacy', 'screen', 'Legacy Verification Form', 200, 360),
      node('init', 'api-call', 'POST /identity/session/init', 480, 190, {
        method: 'POST',
        endpoint: '/identity/session/init',
        authHeader: 'Bearer token',
        responseBranches: [
          { value: 'SESSION_READY', label: 'Session Initialised', description: 'SDK token returned, ready to capture', statusCode: 200 },
          { value: 'SUSPENDED', label: 'Account Suspended', description: 'Verification attempts exhausted', statusCode: 403 },
          { value: 'PROVIDER_ERROR', label: 'Provider Unavailable', description: 'Biometric provider unreachable', statusCode: 503 },
        ],
      }),
      node('sdk', 'service-singleton', 'Identity SDK', 760, 100, {
        serviceName: 'IdentitySDK',
        providedIn: 'component',
        exposedMethods: ['startCapture', 'cancelSession', 'getSessionRef'],
        hasLocalState: true,
      }),
      node('suspended', 'named-state', 'Session Suspended', 760, 240, { stateName: 'SUSPENDED', isTerminal: true }),
      node('provider_err', 'named-state', 'Provider Error', 760, 360, { stateName: 'PROVIDER_ERROR', isTerminal: true }),
      node('poll', 'polling-node', 'Poll Verification Status', 760, 480, {
        endpoint: '/identity/session/{ref}/status',
        intervalMs: 3000,
        maxDurationMs: 120000,
        successCondition: "status === 'VERIFIED'",
        failureCondition: "failedAttempts >= maxAttempts",
        strategy: 'fixed',
      }),
      node('gate', 'decision-gate', 'Status = VERIFIED?', 760, 640, { condition: "result.status === 'VERIFIED'", trueLabel: 'Verified', falseLabel: 'Failed' }),
      node('verified', 'named-state', 'Identity Verified', 1000, 600, { stateName: 'VERIFIED' }),
      node('failed', 'named-state', 'Verification Failed', 1000, 720, { stateName: 'FAILED' }),
      node('cont', 'navigation-trigger', 'Continue to Next Step', 1220, 600, { route: '/next-step', strategy: 'push' }),
      node('retry', 'navigation-trigger', 'Retry Capture', 1220, 720, { route: '/identity-check', strategy: 'replace' }),
    ],
    edges: [
      bedge('e1', 'entry', 'ff', 'navigates-to'),
      bedge('e2', 'ff', 'init', 'flag-on', 'flag-on', 'BioV2'),
      bedge('e3', 'ff', 'legacy', 'flag-off', 'flag-off', 'Legacy'),
      bedge('e4', 'init', 'sdk', 'on-success', 'branch-SESSION_READY', 'SESSION_READY'),
      bedge('e5', 'init', 'suspended', 'on-error', 'branch-SUSPENDED', 'SUSPENDED'),
      bedge('e6', 'init', 'provider_err', 'on-error', 'branch-PROVIDER_ERROR', 'PROVIDER_ERROR'),
      bedge('e7', 'sdk', 'poll', 'triggers'),
      bedge('e8', 'poll', 'gate', 'triggers'),
      bedge('e9', 'gate', 'verified', 'condition-true', 'condition-true', 'Verified'),
      bedge('e10', 'gate', 'failed', 'condition-false', 'condition-false', 'Failed'),
      bedge('e11', 'verified', 'cont', 'navigates-to'),
      bedge('e12', 'failed', 'retry', 'navigates-to'),
    ],
  },

  // ── 15. Route-Aware Prompt Orchestration ─────────────────────────────────────
  {
    id: 'route-aware-prompts',
    title: 'Route-Aware Prompt Orchestration',
    badge: 'Service Flow',
    badgeColor: 'text-accent bg-accent/10',
    mode: 'ui',
    category: 'UI',
    description: 'A singleton orchestration service monitors route changes, checks a feature flag and prompt eligibility API, then conditionally injects an action prompt modal onto the matched route.',
    tip: 'Run the UI Flag Toggle simulation to see how toggling "orchestrated_prompts_enabled" blocks the entire prompt injection path.',
    nodes: [
      node('orch', 'service-singleton', 'Prompt Orchestration Service', 200, 40, {
        serviceName: 'PromptOrchestrationService',
        providedIn: 'root',
        initHook: 'ngOnInit',
        exposedMethods: ['init', 'checkRoute', 'showPrompt', 'dismiss'],
        subscribesTo: ['Router.NavigationEnd'],
        hasLocalState: true,
      }),
      node('poll', 'polling-node', 'Route Event Listener', 200, 220, {
        endpoint: 'routerEvents$',
        intervalMs: 0,
        successCondition: 'event instanceof NavigationEnd',
        strategy: 'fixed',
      }),
      node('ff', 'feature-flag-gate', 'Orchestrated Prompts?', 200, 400, { flagName: 'orchestrated_prompts_enabled', rolloutPercent: 50, trueLabel: 'Active', falseLabel: 'Off' }),
      node('inactive', 'named-state', 'Prompts Inactive', 200, 570, { stateName: 'PROMPTS_OFF', isTerminal: true }),
      node('api', 'api-call', 'GET /prompt/eligibility', 480, 400, {
        method: 'GET',
        endpoint: '/prompt/eligibility',
        authHeader: 'Bearer token',
        responseBranches: [
          { value: 'SHOW_PROMPT', label: 'Show Prompt', description: 'User is eligible, prompt is new', statusCode: 200 },
          { value: 'SKIP_PROMPT', label: 'Skip Prompt', description: 'Already actioned or not eligible', statusCode: 200 },
          { value: 'CROSS_DEVICE', label: 'Cross-Device State', description: 'Action was completed on another device', statusCode: 200 },
        ],
      }),
      node('modal', 'screen', 'Action Prompt Modal', 760, 300),
      node('skip_state', 'named-state', 'Prompt Skipped', 760, 420, { stateName: 'SKIP', isTerminal: true }),
      node('cross_state', 'named-state', 'Cross-Device Handled', 760, 530, { stateName: 'CROSS_DEVICE', isTerminal: true }),
      node('route_gate', 'decision-gate', 'Route Pattern Match?', 760, 660, { condition: 'route.matches(supportedPatterns)', trueLabel: 'Matched', falseLabel: 'No Match' }),
      node('nav', 'navigation-trigger', 'Navigate to Action', 1000, 630, { route: '/action-target', strategy: 'push' }),
      node('dismiss', 'named-state', 'Prompt Dismissed', 1000, 740, { stateName: 'DISMISSED', isTerminal: true }),
    ],
    edges: [
      bedge('e1', 'orch', 'poll', 'triggers'),
      bedge('e2', 'poll', 'ff', 'triggers'),
      bedge('e3', 'ff', 'api', 'flag-on', 'flag-on', 'Active'),
      bedge('e4', 'ff', 'inactive', 'flag-off', 'flag-off', 'Off'),
      bedge('e5', 'api', 'modal', 'on-success', 'branch-SHOW_PROMPT', 'SHOW_PROMPT'),
      bedge('e6', 'api', 'skip_state', 'on-success', 'branch-SKIP_PROMPT', 'SKIP_PROMPT'),
      bedge('e7', 'api', 'cross_state', 'on-success', 'branch-CROSS_DEVICE', 'CROSS_DEVICE'),
      bedge('e8', 'modal', 'route_gate', 'triggers'),
      bedge('e9', 'route_gate', 'nav', 'condition-true', 'condition-true', 'Matched'),
      bedge('e10', 'route_gate', 'dismiss', 'condition-false', 'condition-false', 'No Match'),
    ],
  },

  // ── 16. Pending Corrections Remediation Flow ──────────────────────────────────
  {
    id: 'corrections-remediation',
    title: 'Pending Corrections Remediation',
    badge: 'Complex Flow',
    badgeColor: 'text-warning bg-warning/10',
    mode: 'ui',
    category: 'UI',
    description: 'Full correction resolution flow: feature-flag-gated entry detection, corrections hub with reviewer details, four parallel type handlers (contact, home address, premises address, co-applicant stub), shared submit endpoint, loop guard, and per-type error states.',
    tip: 'Open each correction-type screen and click the config panel to see the allowedActions and address diff data structures.',
    nodes: [

      // ── Entry Detection ────────────────────────────────────────────────
      node('appentry',    'screen',           'Product Entry',                          600,   40),
      node('ff',          'feature-flag-gate','Profile Corrections Enabled?',           600,  200, {
        flagName: 'allow_profile_corrections', rolloutPercent: 100,
        trueLabel: 'Enabled', falseLabel: 'Disabled',
      }),
      node('ff-off',      'named-state',      'Flag Disabled – Normal Routing',         280,  380, {
        stateName: 'FLAG_OFF', isTerminal: true,
      }),
      node('status-api',  'api-call',         'GET /application/status',                900,  200, {
        method: 'GET', endpoint: '/application/status', authHeader: 'Bearer token',
        responseBranches: [
          { value: 'CORRECTIONS_PENDING', label: 'Corrections Pending',   description: 'hasPendingCorrections = true',  statusCode: 200 },
          { value: 'NONE',                label: 'No Corrections',         description: 'hasPendingCorrections = false', statusCode: 200 },
          { value: 'ERROR',               label: 'Status Fetch Error',     description: 'Network / server error',        statusCode: 500 },
        ],
      }),
      node('normal-flow', 'named-state',      'Continue Normal Application Routing',   1180,  100, {
        stateName: 'NORMAL_FLOW', isTerminal: true,
      }),
      node('status-err',  'named-state',      'Application Status Error',              1180,  300, {
        stateName: 'STATUS_FETCH_ERROR', isTerminal: true,
      }),

      // ── Corrections Hub ────────────────────────────────────────────────
      node('list-screen', 'screen',           'Corrections Hub',                        600,  460),
      node('reviewer-ann','epic-annotation',  'Case Reviewer + Expiry Countdown',       940,  440, {
        epicName: 'Case Reviewer Details', owner: 'FieldOps Team',
        baseline: '0', target: 'All Resolved', unit: ' items',
      }),
      node('list-api',    'api-call',         'GET /corrections?ref={applicationRef}',  600,  640, {
        method: 'GET', endpoint: '/corrections',
        responseBranches: [
          { value: 'HAS_CORRECTIONS', label: 'Corrections Returned',  description: 'Render correction items inline', statusCode: 200 },
          { value: 'EMPTY_LIST',      label: 'No Pending Items',       description: 'Navigate back to entry',         statusCode: 200 },
          { value: 'LIST_ERROR',      label: 'Fetch Failed',           description: '404 – show retry',               statusCode: 404 },
        ],
      }),
      node('loop-guard',  'named-state',      'Redirect Loop Guard (MAX 3)',            940,  660, {
        stateName: 'LOOP_GUARD_REACHED',
        entryAction: 'show error — prevent infinite bounce',
        isTerminal: true,
      }),
      node('all-done-nav','navigation-trigger','Back to Entry – All Resolved',          940,  800, {
        route: '/product-entry', strategy: 'replace',
        queryParams: { refresh: 'true' },
      }),
      node('list-err',    'named-state',      'List Fetch Error – Retry',               940,  520, {
        stateName: 'LIST_FETCH_ERROR', isTerminal: false,
      }),

      // ── Contact Info Flow (CONTACT_PHONE / CONTACT_EMAIL) ──────────────
      node('contact-scr', 'screen',           'Contact Info Update',                     80,  960),
      node('ext-redirect','named-state',      'External App Redirect State',             80, 1100, {
        stateName: 'AWAITING_EXTERNAL_UPDATE',
        entryAction: 'navigate to /profile/update-contact?next={returnPath}',
      }),
      node('nav-profile', 'navigation-trigger','Update in Profile App',                  80, 1220, {
        route: '/profile/update-contact', strategy: 'push',
        queryParams: { next: '/corrections' },
      }),
      node('confirm-modal','screen',          'Confirm Update Modal',                    80, 1360),
      node('submit-contact','api-call',       'POST /corrections/submit',                80, 1520, {
        method: 'POST', endpoint: '/corrections/submit', authHeader: 'Bearer token',
        responseBranches: [
          { value: 'COMPLETED',          label: 'Correction Completed',    description: 'Backend always returns COMPLETED regardless of change', statusCode: 200 },
          { value: 'NO_LONGER_PENDING',  label: 'Correction Stale',        description: 'Item resolved between load and submit',               statusCode: 400 },
          { value: 'SERVICE_UNAVAILABLE',label: 'Service Unavailable',     description: '503 / timeout — show retry message',                  statusCode: 503 },
        ],
      }),
      node('contact-done','navigation-trigger','Back to Hub – Contact Updated',          80, 1720, {
        route: '/corrections', strategy: 'replace',
        queryParams: { updated: 'true', type: 'CONTACT_PHONE' },
      }),
      node('contact-stale','named-state',     'Correction No Longer Pending',           360, 1620, {
        stateName: 'CORRECTION_STALE', isTerminal: true,
      }),
      node('contact-unavail','named-state',   'Service Unavailable – Retry',            360, 1740, {
        stateName: 'SERVICE_UNAVAILABLE', isTerminal: false,
      }),

      // ── Home Address Flow (HOME_ADDRESS) ────────────────────────────────
      node('home-scr',    'screen',           'Home Address Review',                    600,  960),
      node('geo-svc',     'service-singleton','Region Config Service',                  600, 1100, {
        serviceName: 'RegionConfigService', providedIn: 'root',
        initHook: 'ngOnInit',
        exposedMethods: ['resolveAddressText', 'getLGAs', 'findByLgaCode'],
        subscribesTo: ['configObj$'],
        hasLocalState: false,
      }),
      node('home-gate',   'decision-gate',    'User Confirms Address?',                 600, 1260, {
        condition: 'isConfirmed === true', trueLabel: 'Confirm', falseLabel: 'Dispute',
      }),
      node('home-dispute','named-state',      'Address Edit Form (TODO)',                900, 1360, {
        stateName: 'DISPUTE_NOT_BUILT', isTerminal: true,
        entryAction: 'open address edit form — not yet implemented',
      }),
      node('submit-home', 'api-call',         'POST /corrections/submit',               600, 1440, {
        method: 'POST', endpoint: '/corrections/submit', authHeader: 'Bearer token',
        responseBranches: [
          { value: 'COMPLETED',        label: 'Correction Submitted', description: 'Address accepted, navigate back', statusCode: 200 },
          { value: 'ERROR_400_STALE',  label: 'Correction Stale',     description: 'Reload listing — item already resolved', statusCode: 400 },
          { value: 'ERROR_400_STATUS', label: 'App Status Changed',   description: 'Show "status changed" message',          statusCode: 400 },
        ],
      }),
      node('home-done',   'navigation-trigger','Back to Hub – Address Updated',         600, 1640, {
        route: '/corrections', strategy: 'replace',
        queryParams: { updated: 'true', type: 'HOME_ADDRESS' },
      }),
      node('home-stale',  'named-state',      'Correction No Longer Pending',           900, 1540, {
        stateName: 'CORRECTION_STALE', isTerminal: true,
      }),
      node('home-status', 'named-state',      'Application Status Changed',             900, 1660, {
        stateName: 'APP_STATUS_CHANGED', isTerminal: true,
      }),

      // ── Premises Address Flow (PREMISES_ADDRESS) ──────────────────────
      node('premises-scr','screen',           'Premises Address Review',               1140,  960),
      node('photos-tbc',  'named-state',      'Reviewer Site Photos (Field Name TBC)', 1400,  960, {
        stateName: 'PHOTOS_PENDING_FIELD_CONFIRM',
        entryAction: 'imageType vs label vs type field — confirm with backend',
      }),
      node('premises-gate','decision-gate',   'User Confirms Address?',                1140, 1120, {
        condition: 'isConfirmed === true', trueLabel: 'Confirm', falseLabel: 'Dispute',
      }),
      node('premises-dispute','named-state',  'Premises Edit Form (TODO)',             1400, 1220, {
        stateName: 'PREMISES_DISPUTE_NOT_BUILT', isTerminal: true,
        entryAction: 'open premises edit form — not yet implemented',
      }),
      node('submit-premises','api-call',      'POST /corrections/submit',              1140, 1300, {
        method: 'POST', endpoint: '/corrections/submit', authHeader: 'Bearer token',
        responseBranches: [
          { value: 'COMPLETED',       label: 'Correction Submitted', description: 'Premises address accepted',             statusCode: 200 },
          { value: 'ERROR_400_STALE', label: 'Correction Stale',     description: 'Reload listing — already resolved',     statusCode: 400 },
        ],
      }),
      node('premises-done','navigation-trigger','Back to Hub – Premises Updated',      1140, 1500, {
        route: '/corrections', strategy: 'replace',
        queryParams: { updated: 'true', type: 'PREMISES_ADDRESS' },
      }),
      node('premises-stale','named-state',    'Correction No Longer Pending',          1400, 1420, {
        stateName: 'CORRECTION_STALE', isTerminal: true,
      }),

      // ── Co-Applicant Flow (STUB) ────────────────────────────────────────
      node('co-stub',     'named-state',      'Co-Applicant Correction (Not Routed)',  1680,  960, {
        stateName: 'CO_APPLICANT_NOT_IMPLEMENTED', isTerminal: true,
        entryAction: 'correctionTypeToRouteMap — co-applicant entry not yet mapped',
      }),
      node('co-processing','named-state',     'Backend Auto-Processing',               1680, 1100, {
        stateName: 'CO_APPLICANT_PROCESSING',
        entryAction: 'status: PROCESSING — backend resolves automatically',
      }),
    ],

    edges: [
      // ── Entry Detection ────────────────────────────────────────────────
      bedge('e1',  'appentry',     'ff',            'navigates-to'),
      bedge('e2',  'ff',           'status-api',    'flag-on',       'flag-on',            'Enabled'),
      bedge('e3',  'ff',           'ff-off',        'flag-off',      'flag-off',            'Disabled'),
      bedge('e4',  'status-api',   'list-screen',   'on-success',    'branch-CORRECTIONS_PENDING', 'CORRECTIONS_PENDING'),
      bedge('e5',  'status-api',   'normal-flow',   'on-success',    'branch-NONE',                'NONE'),
      bedge('e6',  'status-api',   'status-err',    'on-error',      'branch-ERROR',               'ERROR'),

      // ── Corrections Hub ────────────────────────────────────────────────
      bedge('e7',  'list-screen',  'list-api',      'triggers',      undefined,            'on mount: fetch corrections'),
      bedge('e7b', 'list-screen',  'loop-guard',    'navigates-to',  undefined,            'redirectionCount ≥ MAX_3'),
      bedge('e8',  'list-api',     'all-done-nav',  'on-success',    'branch-EMPTY_LIST',  'EMPTY_LIST'),
      bedge('e9',  'list-api',     'list-err',      'on-error',      'branch-LIST_ERROR',  'LIST_ERROR 404'),

      // ── Type dispatch (from hub) ───────────────────────────────────────
      bedge('e10', 'list-screen',  'contact-scr',   'navigates-to',  undefined,  'CONTACT_PHONE / CONTACT_EMAIL'),
      bedge('e11', 'list-screen',  'home-scr',      'navigates-to',  undefined,  'HOME_ADDRESS'),
      bedge('e12', 'list-screen',  'premises-scr',  'navigates-to',  undefined,  'PREMISES_ADDRESS'),
      bedge('e13', 'list-screen',  'co-stub',       'navigates-to',  undefined,  'CO_APPLICANT'),

      // ── Contact info flow ──────────────────────────────────────────────
      bedge('e14', 'contact-scr',  'ext-redirect',  'navigates-to',  undefined,  'allowedActions: PROFILE_REDIRECT'),
      bedge('e15', 'ext-redirect', 'nav-profile',   'triggers'),
      bedge('e16', 'nav-profile',  'confirm-modal', 'navigates-to',  undefined,  'on return from profile app'),
      bedge('e17', 'confirm-modal','submit-contact','triggers',       undefined,  'user clicks Confirm'),
      bedge('e18', 'submit-contact','contact-done', 'on-success',    'branch-COMPLETED',          'COMPLETED'),
      bedge('e19', 'submit-contact','contact-stale','on-error',      'branch-NO_LONGER_PENDING',  'NO_LONGER_PENDING'),
      bedge('e20', 'submit-contact','contact-unavail','on-error',    'branch-SERVICE_UNAVAILABLE','SERVICE_UNAVAILABLE'),
      bedge('e20b','contact-done', 'list-screen',   'navigates-to',  undefined,  'reload: updated=true'),

      // ── Home address flow ──────────────────────────────────────────────
      bedge('e21', 'home-scr',     'geo-svc',       'triggers',      undefined,  'on load: resolve lgaCode → readable address'),
      bedge('e22', 'geo-svc',      'home-gate',     'triggers',      undefined,  'addresses resolved'),
      bedge('e23', 'home-gate',    'submit-home',   'condition-true','condition-true', 'Confirm'),
      bedge('e24', 'home-gate',    'home-dispute',  'condition-false','condition-false','Dispute'),
      bedge('e25', 'submit-home',  'home-done',     'on-success',    'branch-COMPLETED',        'COMPLETED'),
      bedge('e26', 'submit-home',  'home-stale',    'on-error',      'branch-ERROR_400_STALE',  'ERROR_400_STALE'),
      bedge('e27', 'submit-home',  'home-status',   'on-error',      'branch-ERROR_400_STATUS', 'ERROR_400_STATUS'),
      bedge('e27b','home-done',    'list-screen',   'navigates-to',  undefined,  'reload: updated=true'),

      // ── Premises address flow ──────────────────────────────────────────
      bedge('e28', 'premises-scr', 'photos-tbc',    'triggers',       undefined,  'suggestedAddress.images (field TBC)'),
      bedge('e29', 'premises-scr', 'premises-gate', 'triggers',       undefined,  'on load: resolve LGA + load images'),
      bedge('e30', 'premises-gate','submit-premises','condition-true','condition-true',  'Confirm'),
      bedge('e31', 'premises-gate','premises-dispute','condition-false','condition-false','Dispute'),
      bedge('e32', 'submit-premises','premises-done','on-success',    'branch-COMPLETED',       'COMPLETED'),
      bedge('e33', 'submit-premises','premises-stale','on-error',     'branch-ERROR_400_STALE', 'ERROR_400_STALE'),
      bedge('e33b','premises-done','list-screen',   'navigates-to',   undefined,  'reload: updated=true'),

      // ── Co-applicant stub ──────────────────────────────────────────────
      bedge('e34', 'co-stub',      'co-processing', 'navigates-to',   undefined,  'status: PROCESSING — backend only'),

      // ── All resolved: return to entry ─────────────────────────────────
      bedge('e35', 'all-done-nav', 'appentry',      'navigates-to',   undefined,  'rerun ongoing check — hasPendingCorrections = false'),
    ],
  },
]
