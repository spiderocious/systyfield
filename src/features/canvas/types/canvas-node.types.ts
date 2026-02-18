import type { Node, NodeProps } from '@xyflow/react'
import type { NodeData, NodeType } from '@shared/types'

export interface CanvasNodeData extends Record<string, unknown> {
  label: string
  nodeType: NodeType
  data: NodeData
  isSimulating?: boolean
  errorRate?: number
  loadFactor?: number
}

export type CanvasNode = Node<CanvasNodeData>
export type CanvasNodeProps = NodeProps<CanvasNode>
