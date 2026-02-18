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
import { useCallback, useMemo, useState } from 'react'
import { useUrlState } from '@shared/hooks'
import { log } from '@shared/utils'
import { useCanvas } from './hooks'
import { BaseNode } from './components/base-node'
import { NodeConfigPanel } from './parts/node-config-panel'
import { NodePalette } from '@features/node-palette'
import { SimulationToolbar, useSimulation } from '@features/simulation'
import { DesignHeaderBar, ShareModal, useDesignSession } from '@features/session'
import { MetricsPanel } from '@features/metrics-panel'
import type { NodeData, Canvas, DesignNode, DesignEdge } from '@shared/types'
import type { CanvasNode } from './types'
import type { MetricsSnapshot, SimulationConfig } from '@shared/types/simulation.types'

const NODE_TYPES: NodeTypes = {
  base: BaseNode as NodeTypes[string],
}

function CanvasInner() {
  const { state, setUrlState } = useUrlState()
  const reactFlowInstance = useReactFlow()
  const [showShare, setShowShare] = useState(false)
  const [liveMetrics, setLiveMetrics] = useState<MetricsSnapshot | null>(null)
  const [simType, setSimType] = useState<string>('load-test')

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

  const { design, isSaving, updateTitle, saveNow } = useDesignSession(state.mode)

  // Build a Canvas snapshot for the simulation adapter — derived from xyflow state
  const canvasSnapshot = useMemo<Canvas>(() => ({
    nodes: nodes.map((n): DesignNode => ({
      id: n.id,
      type: n.data.nodeType,
      position: n.position,
      label: n.data.label,
      data: n.data.data,
    })),
    edges: edges.map((e): DesignEdge => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: (e.type ?? 'default') as DesignEdge['type'],
    })),
    viewport: { x: 0, y: 0, zoom: 1 },
  }), [nodes, edges])

  const handleMetricsUpdate = useCallback((metrics: MetricsSnapshot) => {
    setLiveMetrics(metrics)
  }, [])

  const { isRunning, isPaused, isCompleted, progressPercent, simState, start, pause, resume, stop } =
    useSimulation({ canvas: canvasSnapshot, onMetricsUpdate: handleMetricsUpdate })

  const isSimActive = isRunning || isPaused || isCompleted

  const handleSimStart = useCallback(
    (config: Omit<SimulationConfig, 'id' | 'createdAt'>) => {
      log.sim.info('Simulation start requested', { type: config.type })
      setSimType(config.type)
      start(config)
    },
    [start]
  )

  const handleSimStop = useCallback(() => {
    log.sim.info('Simulation stopped')
    stop()
    setLiveMetrics(null)
  }, [stop])

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
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Design header bar (title + save + share) */}
      {design && (
        <DesignHeaderBar
          design={design}
          isSaving={isSaving}
          onTitleChange={updateTitle}
          onSave={saveNow}
          onShare={() => setShowShare(true)}
        />
      )}

      {/* Main canvas area */}
      <div className="flex flex-1 overflow-hidden">
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
              <SimulationToolbar
                isRunning={isRunning}
                isPaused={isPaused}
                progressPercent={progressPercent}
                onStart={handleSimStart}
                onPause={pause}
                onResume={resume}
                onStop={handleSimStop}
              />
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

        {/* Right panel — metrics during simulation, or node config */}
        {isSimActive && liveMetrics ? (
          <MetricsPanel
            metrics={liveMetrics}
            elapsedMs={simState?.elapsedMs ?? 0}
            progressPercent={progressPercent}
            simulationType={simType}
          />
        ) : selectedNode ? (
          <NodeConfigPanel
            node={selectedNode}
            onClose={() => setUrlState({ nodeId: null })}
            onUpdateData={(id, updates) => updateNodeData(id, updates as unknown as Partial<NodeData>)}
            onUpdateLabel={updateNodeLabel}
            onRemove={removeNode}
          />
        ) : null}
      </div>

      {/* Share modal */}
      {showShare && design && (
        <ShareModal design={design} onClose={() => setShowShare(false)} />
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
