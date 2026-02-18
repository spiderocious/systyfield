import type { Node, NodeProps } from '@xyflow/react'
import type { NodeData, NodeType } from '@shared/types'

export interface CanvasNodeData extends Record<string, unknown> {
  label: string
  nodeType: NodeType
  data: NodeData
  // Universal fields (stored at the canvas wrapper level, not type-specific data)
  notes?: string
  tags?: string[]
  color?: string
  // Simulation overlay state (set live during simulation)
  isSimulating?: boolean
  simStatus?: 'healthy' | 'degraded' | 'failing' | 'down' | 'idle'
  errorRate?: number
  loadFactor?: number
  rps?: number
  latencyP99?: number
}

export type CanvasNode = Node<CanvasNodeData>
export type CanvasNodeProps = NodeProps<CanvasNode>
