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
  tip: string
  nodes: CanvasNode[]
  edges: Edge[]
}

function node(id: string, type: keyof typeof NODE_TYPE_REGISTRY, label: string, x: number, y: number): CanvasNode {
  const def = NODE_TYPE_REGISTRY[type]
  return {
    id,
    type: 'base',
    position: { x, y },
    data: {
      label,
      nodeType: type,
      data: { ...def.defaultData },
    },
  }
}

function edge(id: string, source: string, target: string): Edge {
  return { id, source, target, type: 'default' }
}

export const DEMO_TEMPLATES: DemoTemplate[] = [
  // ── 1. Basic API ──────────────────────────────────────────────────────────────
  {
    id: 'basic-api',
    title: 'Basic API Service',
    badge: 'Beginner',
    badgeColor: 'text-success bg-success/10',
    mode: 'system',
    description: 'A single microservice behind a load balancer, backed by a PostgreSQL database — the foundation of most production APIs.',
    tip: 'Try running a Load Test simulation to see how the service handles ramp-up traffic.',
    nodes: [
      node('lb1', 'load-balancer', 'Load Balancer', 60, 140),
      node('svc1', 'microservice', 'API Service', 260, 140),
      node('db1', 'database', 'PostgreSQL', 460, 140),
    ],
    edges: [
      edge('e1', 'lb1', 'svc1'),
      edge('e2', 'svc1', 'db1'),
    ],
  },

  // ── 2. Microservices cluster ───────────────────────────────────────────────────
  {
    id: 'microservices',
    title: 'Microservices Cluster',
    badge: 'Advanced',
    badgeColor: 'text-primary bg-primary/10',
    mode: 'system',
    description: 'CDN → load balancer → two independent services sharing a Postgres DB, with Redis cache and a Kafka queue for async processing.',
    tip: 'Run a Cascade Failure simulation to see how one failing service affects the rest of the graph.',
    nodes: [
      node('cdn1', 'cdn', 'CDN', 20, 180),
      node('lb1', 'load-balancer', 'Load Balancer', 190, 180),
      node('svc1', 'microservice', 'User Service', 360, 80),
      node('svc2', 'microservice', 'Order Service', 360, 270),
      node('cache1', 'cache', 'Redis', 540, 40),
      node('db1', 'database', 'Postgres', 540, 180),
      node('q1', 'queue', 'Kafka', 540, 320),
    ],
    edges: [
      edge('e1', 'cdn1', 'lb1'),
      edge('e2', 'lb1', 'svc1'),
      edge('e3', 'lb1', 'svc2'),
      edge('e4', 'svc1', 'cache1'),
      edge('e5', 'svc1', 'db1'),
      edge('e6', 'svc2', 'q1'),
      edge('e7', 'svc2', 'db1'),
    ],
  },

  // ── 3. API pipeline ────────────────────────────────────────────────────────────
  {
    id: 'api-pipeline',
    title: 'REST API Pipeline',
    badge: 'Service Mode',
    badgeColor: 'text-accent bg-accent/10',
    mode: 'service',
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

  // ── 4. UI Architecture ────────────────────────────────────────────────────────
  {
    id: 'ui-flow',
    title: 'UI Architecture Flow',
    badge: 'UI Mode',
    badgeColor: 'text-warning bg-warning/10',
    mode: 'ui',
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
]
