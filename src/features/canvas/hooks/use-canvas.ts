import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
} from '@xyflow/react'
import { useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { NodeType, DesignMode, NodeData } from '@shared/types'
import { NODE_TYPE_REGISTRY } from '@shared/constants'
import { log } from '@shared/utils'
import type { CanvasNode } from '../types/canvas-node.types'

export type { CanvasNode }
export type CanvasEdge = Edge<{ label?: string; edgeType?: string; latencyMs?: number }>

export function useCanvas(mode: DesignMode) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasEdge>([])
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null)

  const addNode = useCallback(
    (nodeType: NodeType, position: { x: number; y: number }) => {
      const def = NODE_TYPE_REGISTRY[nodeType]
      if (!def) {
        log.canvas.warn('Unknown node type', { nodeType })
        return
      }
      if (!def.modes.includes(mode)) {
        log.canvas.warn('Node type not available in current mode', { nodeType, mode })
        return
      }

      const id = uuidv4()
      const newNode: CanvasNode = {
        id,
        type: 'base',
        position,
        data: {
          label: def.label,
          nodeType,
          data: def.defaultData as NodeData,
          isSelected: false,
        },
      }

      log.canvas.info('Adding node', { id, nodeType, position })
      setNodes(nds => [...nds, newNode])
      return id
    },
    [mode, setNodes]
  )

  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<NodeData>) => {
      log.canvas.debug('Updating node data', { nodeId, updates })
      setNodes(nds =>
        nds.map(n => {
          if (n.id !== nodeId) return n
          return {
            ...n,
            data: {
              ...n.data,
              data: { ...n.data.data, ...updates } as NodeData,
            },
          }
        })
      )
    },
    [setNodes]
  )

  const updateNodeLabel = useCallback(
    (nodeId: string, label: string) => {
      log.canvas.debug('Updating node label', { nodeId, label })
      setNodes(nds =>
        nds.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, label } } : n))
      )
    },
    [setNodes]
  )

  const removeNode = useCallback(
    (nodeId: string) => {
      log.canvas.info('Removing node', { nodeId })
      setNodes(nds => nds.filter(n => n.id !== nodeId))
      setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
    },
    [setNodes, setEdges]
  )

  const updateEdgeData = useCallback(
    (edgeId: string, updates: Partial<{ label: string; edgeType: string; latencyMs: number }>) => {
      log.canvas.debug('Updating edge data', { edgeId, updates })
      setEdges(eds =>
        eds.map(e => {
          if (e.id !== edgeId) return e
          const newLabel = updates.label !== undefined ? updates.label : e.label
          return {
            ...e,
            label: newLabel,
            data: { ...e.data, ...updates },
            // Use labeled style for non-default edge types
            type: updates.edgeType === 'event' ? 'labeled' : 'default',
            animated: updates.edgeType === 'event',
          }
        })
      )
    },
    [setEdges]
  )

  const removeEdge = useCallback(
    (edgeId: string) => {
      log.canvas.info('Removing edge', { edgeId })
      setEdges(eds => eds.filter(e => e.id !== edgeId))
    },
    [setEdges]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      log.canvas.debug('Connecting nodes', connection)
      setEdges(eds =>
        addEdge(
          {
            ...connection,
            id: uuidv4(),
            type: 'default',
            animated: false,
            label: '',
            data: { edgeType: 'http', label: '' },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  const onDrop = useCallback(
    (event: React.DragEvent, reactFlowInstance: { screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number } }) => {
      event.preventDefault()
      const nodeType = event.dataTransfer.getData('application/systyfield-node-type') as NodeType
      if (!nodeType) {
        log.canvas.warn('Drop event with no node type data')
        return
      }
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      log.canvas.info('Node dropped onto canvas', { nodeType, position })
      addNode(nodeType, position)
    },
    [addNode]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Populate xyflow state from a saved design (called once when design loads)
  const setInitialCanvas = useCallback(
    (initialNodes: CanvasNode[], initialEdges: CanvasEdge[]) => {
      setNodes(initialNodes)
      setEdges(initialEdges)
    },
    [setNodes, setEdges]
  )

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDrop,
    onDragOver,
    addNode,
    updateNodeData,
    updateNodeLabel,
    removeNode,
    updateEdgeData,
    removeEdge,
    reactFlowWrapper,
    setInitialCanvas,
    setNodes,
    setEdges,
  }
}
