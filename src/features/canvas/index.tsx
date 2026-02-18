import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback } from 'react'
import { useUrlState } from '@shared/hooks'
import { log } from '@shared/utils'
import { useCanvas } from './hooks'
import { BaseNode } from './components/base-node'
import { NodeConfigPanel } from './parts/node-config-panel'
import { NodePalette } from '@features/node-palette'
import { SimulationToolbar } from '@features/simulation'
import type { NodeData } from '@shared/types'
import type { CanvasNode } from './types'

const NODE_TYPES: NodeTypes = {
  base: BaseNode as NodeTypes[string],
}

function CanvasInner() {
  const { state, setUrlState } = useUrlState()
  const reactFlowInstance = useReactFlow()

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDrop,
    onDragOver,
    updateNodeData,
    updateNodeLabel,
    removeNode,
    reactFlowWrapper,
  } = useCanvas(state.mode)

  const selectedNode = nodes.find(n => n.id === state.nodeId) ?? null

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: CanvasNode) => {
      log.canvas.debug('Node clicked', { id: node.id })
      setUrlState({ nodeId: node.id, panel: 'config' })
    },
    [setUrlState]
  )

  const handlePaneClick = useCallback(() => {
    if (state.nodeId) {
      log.canvas.debug('Pane clicked — deselecting node')
      setUrlState({ nodeId: null })
    }
  }, [state.nodeId, setUrlState])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      onDrop(event, reactFlowInstance)
    },
    [onDrop, reactFlowInstance]
  )

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left palette */}
      <NodePalette mode={state.mode} />

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onDrop={handleDrop}
          onDragOver={onDragOver}
          nodeTypes={NODE_TYPES}
          fitView
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"
          className="h-full w-full"
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="var(--color-canvas-dot)"
          />
          <Controls className="bottom-6 left-6" />
          <MiniMap
            className="bottom-6 right-6"
            nodeColor={node => {
              const nodeType = (node.data as { nodeType?: string }).nodeType
              if (!nodeType) return 'var(--color-muted)'
              return `var(--color-node-${nodeType}, var(--color-muted))`
            }}
            maskColor="rgba(0,0,0,0.05)"
          />
        </ReactFlow>

        {/* Simulation toolbar — floating at top center */}
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <div className="pointer-events-auto">
            <SimulationToolbar />
          </div>
        </div>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/80">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
                    <circle cx="5" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="19" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="5" cy="19" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="19" cy="19" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="5" y1="5" x2="19" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground">Start designing</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Drag components from the left panel onto the canvas
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right config panel */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onClose={() => setUrlState({ nodeId: null })}
          onUpdateData={(id, updates) => updateNodeData(id, updates as unknown as Partial<NodeData>)}
          onUpdateLabel={updateNodeLabel}
          onRemove={removeNode}
        />
      )}
    </div>
  )
}

export function CanvasPage() {
  log.canvas.info('CanvasPage mounted')
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
