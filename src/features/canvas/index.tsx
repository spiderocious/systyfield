import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  ConnectionMode,
  type NodeTypes,
  type EdgeTypes,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CinematicContext } from './context/cinematic-context'
import { useUrlState } from '@shared/hooks'
import { log } from '@shared/utils'
import { useCanvas } from './hooks'
import { BaseNode } from './components/base-node'
import { SimEdge } from './components/sim-edge'
import { NodeConfigPanel } from './parts/node-config-panel'
import { EdgeConfigPanel } from './parts/edge-config-panel'
import { NodePalette } from '@features/node-palette'
import { SimulationToolbar, useSimulation } from '@features/simulation'
import type { SimHistoryEntry } from '@features/simulation/parts/simulation-toolbar'
import { DesignHeaderBar, ShareModal, useDesignSession } from '@features/session'
import { MetricsPanel } from '@features/metrics-panel'
import type { NodeData, NodeType, Canvas, DesignNode, DesignEdge, Design } from '@shared/types'
import { exportCanvasAsPng, exportCanvasAsSvg, exportOpenApiFromCanvas, exportTypescriptFromCanvas, exportFolderStructure, exportComponentScaffolds, exportRouteConfig, exportApiClient, exportMetricsAsCsv } from '@features/session/services/export-service'
import { saveDesign } from '@features/session/services/design-service'
import type { CanvasNode } from './types'
import type { CanvasEdge } from './hooks'
import type { MetricsSnapshot, SimulationConfig } from '@shared/types/simulation.types'
import { NODE_TYPE_REGISTRY } from '@shared/constants'
import { cn } from '@shared/utils'
import { Search, X, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyCenter, ArrowUpDown, Undo2, Redo2, Maximize2, ExternalLink } from '@shared/ui/icons'
import { OnboardingTour, useOnboardingTour } from './parts/onboarding-tour'
import { v4 as uuidv4 } from 'uuid'

const NODE_TYPES: NodeTypes = {
  base: BaseNode as NodeTypes[string],
}

const EDGE_TYPES: EdgeTypes = {
  default: SimEdge as EdgeTypes[string],
  sim: SimEdge as EdgeTypes[string],
}

// Category → minimap color mapping
function minimapNodeColor(nodeType: string | undefined): string {
  if (!nodeType) return 'var(--color-muted)'
  const def = NODE_TYPE_REGISTRY[nodeType as NodeType]
  if (!def) return 'var(--color-muted)'
  const category = def.category
  switch (category) {
    case 'Compute': return '#6366F1'
    case 'Networking': return '#06B6D4'
    case 'Security': return '#EF4444'
    case 'Storage': return '#10B981'
    case 'Messaging': return '#F59E0B'
    case 'Integrations': return '#8B5CF6'
    case 'Operations': return '#F97316'
    case 'UI': return '#3B82F6'
    case 'API': return '#EC4899'
    default: return 'var(--color-muted)'
  }
}

// ─── Background style preference ─────────────────────────────────────────────

type BgStyle = 'dots' | 'lines' | 'cross'

function useBgStyle(): [BgStyle, () => void] {
  const [style, setStyle] = useState<BgStyle>(() => {
    return (localStorage.getItem('systyfield_bg_style') as BgStyle) ?? 'dots'
  })
  const toggle = () => {
    setStyle(prev => {
      const next: BgStyle = prev === 'dots' ? 'lines' : prev === 'lines' ? 'cross' : 'dots'
      localStorage.setItem('systyfield_bg_style', next)
      return next
    })
  }
  return [style, toggle]
}

const BG_VARIANT: Record<BgStyle, BackgroundVariant> = {
  dots: BackgroundVariant.Dots,
  lines: BackgroundVariant.Lines,
  cross: BackgroundVariant.Cross,
}

// ─── Action stack for undo/redo ───────────────────────────────────────────────

interface CanvasSnapshot {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}


// ─── Toast system ─────────────────────────────────────────────────────────────

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  return { toasts, addToast }
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none absolute bottom-20 right-6 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-sm',
            t.type === 'success' && 'border-success/30 bg-success/10 text-success',
            t.type === 'error' && 'border-destructive/30 bg-destructive/10 text-destructive',
            t.type === 'info' && 'border-border bg-card text-foreground',
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ─── Node Search overlay ──────────────────────────────────────────────────────

function NodeSearch({ nodes, onJump, onClose }: { nodes: CanvasNode[]; onJump: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const filtered = nodes.filter(n =>
    query === '' || n.data.label.toLowerCase().includes(query.toLowerCase()) || n.data.nodeType.includes(query.toLowerCase())
  )
  return (
    <div className="absolute left-1/2 top-4 z-50 w-80 -translate-x-1/2 rounded-xl border border-border bg-card shadow-2xl">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search nodes..."
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button type="button" onClick={onClose} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto p-1">
        {filtered.map(n => (
          <button
            key={n.id}
            type="button"
            onClick={() => { onJump(n.id); onClose() }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs hover:bg-muted"
          >
            <span className="font-semibold text-foreground truncate">{n.data.label}</span>
            <span className="ml-auto shrink-0 text-muted-foreground">{n.data.nodeType}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">No nodes match</p>
        )}
      </div>
    </div>
  )
}

// ─── Alignment toolbar ────────────────────────────────────────────────────────

function AlignmentToolbar({ selectedNodes, onAlign }: {
  selectedNodes: CanvasNode[]
  onAlign: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => void
}) {
  if (selectedNodes.length < 2) return null
  const btn = 'rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
  return (
    <div className="absolute left-1/2 bottom-20 -translate-x-1/2 z-40 flex items-center gap-1 rounded-xl border border-border bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-sm">
      <span className="text-[10px] text-muted-foreground pr-1 font-semibold">{selectedNodes.length} selected</span>
      <div className="h-4 w-px bg-border mx-1" />
      <button type="button" onClick={() => onAlign('left')} className={btn} title="Align left"><AlignLeft className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={() => onAlign('center')} className={btn} title="Align center"><AlignCenter className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={() => onAlign('right')} className={btn} title="Align right"><AlignRight className="h-3.5 w-3.5" /></button>
      <div className="h-4 w-px bg-border mx-1" />
      <button type="button" onClick={() => onAlign('top')} className={btn} title="Align top">
        <AlignVerticalJustifyCenter className="h-3.5 w-3.5 rotate-90" />
      </button>
      <button type="button" onClick={() => onAlign('middle')} className={btn} title="Align middle">
        <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => onAlign('bottom')} className={btn} title="Align bottom">
        <AlignVerticalJustifyCenter className="h-3.5 w-3.5 -rotate-90" />
      </button>
      <div className="h-4 w-px bg-border mx-1" />
      <button type="button" onClick={() => onAlign('distribute-h')} className={btn} title="Distribute horizontally"><ArrowUpDown className="h-3.5 w-3.5 rotate-90" /></button>
      <button type="button" onClick={() => onAlign('distribute-v')} className={btn} title="Distribute vertically"><ArrowUpDown className="h-3.5 w-3.5" /></button>
    </div>
  )
}

// ─── Keyboard shortcuts modal ─────────────────────────────────────────────────

function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: 'Delete / Backspace', desc: 'Remove selected node or edge' },
    { keys: 'Ctrl/Cmd + Z', desc: 'Undo' },
    { keys: 'Ctrl/Cmd + Shift + Z', desc: 'Redo' },
    { keys: 'Ctrl/Cmd + C', desc: 'Copy selected nodes' },
    { keys: 'Ctrl/Cmd + V', desc: 'Paste nodes (offset +20px)' },
    { keys: 'Ctrl/Cmd + S', desc: 'Save now' },
    { keys: 'Ctrl/Cmd + F', desc: 'Search nodes' },
    { keys: 'Shift + Click', desc: 'Multi-select nodes' },
    { keys: 'Shift + Drag', desc: 'Box selection' },
    { keys: '?', desc: 'Open keyboard shortcuts' },
    { keys: 'Escape', desc: 'Close panel / deselect' },
  ]
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-96 rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold text-foreground">Keyboard Shortcuts</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 gap-1.5">
          {shortcuts.map(({ keys, desc }) => (
            <div key={keys} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted">
              <kbd className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground whitespace-nowrap">{keys}</kbd>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Bottleneck banner ────────────────────────────────────────────────────────

function BottleneckBanner({ nodeLabel, errorRate, onDismiss }: { nodeLabel: string; errorRate: number; onDismiss: () => void }) {
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 shadow-lg backdrop-blur-sm">
      <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
      <p className="text-xs font-semibold text-destructive">
        Bottleneck: <span className="text-foreground">{nodeLabel}</span> — {(errorRate * 100).toFixed(0)}% error rate
      </p>
      <button type="button" onClick={onDismiss} className="ml-2 rounded p-0.5 text-muted-foreground hover:text-foreground">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Main Canvas Inner ────────────────────────────────────────────────────────

function CanvasInner() {
  const { state, setUrlState } = useUrlState()
  const reactFlowInstance = useReactFlow()
  const [showShare, setShowShare] = useState(false)
  const [liveMetrics, setLiveMetrics] = useState<MetricsSnapshot | null>(null)
  const [simType, setSimType] = useState<string>('load-test')
  const [bgStyle, toggleBgStyle] = useBgStyle()
  const [showNodeSearch, setShowNodeSearch] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [simHistory, setSimHistory] = useState<SimHistoryEntry[]>([])
  const [bottleneck, setBottleneck] = useState<{ label: string; errorRate: number } | null>(null)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [copiedNodes, setCopiedNodes] = useState<CanvasNode[]>([])
  const [hasMetrics, setHasMetrics] = useState(false)
  const metricsHistoryRef = useRef<Array<{ elapsedSec: number; totalRps: number; totalErrorRate: number; avgLatencyP99: number }>>([])
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const [cinematicMode, setCinematicMode] = useState(false)
  const cinematicPrevFocusRef = useRef<string | null>(null)

  const { toasts, addToast } = useToasts()
  const { show: showTour, complete: completeTour } = useOnboardingTour()

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
    updateEdgeData,
    removeEdge,
    setInitialCanvas,
    setNodes,
    setEdges,
  } = useCanvas(state.mode)

  const { design, isSaving, updateTitle, saveNow, scheduleAutosave } = useDesignSession(state.mode)

  const populatedRef = useRef(false)
  const prevModeRef = useRef(state.mode)

  // ── Undo/Redo stack ─────────────────────────────────────────────────────────
  const historyRef = useRef<{ past: CanvasSnapshot[]; future: CanvasSnapshot[] }>({ past: [], future: [] })
  const prevSnapshot = useRef<CanvasSnapshot>({ nodes: [], edges: [] })
  const skipHistoryPush = useRef(false)

  const pushHistory = useCallback((snap: CanvasSnapshot) => {
    if (skipHistoryPush.current) { skipHistoryPush.current = false; return }
    historyRef.current.past.push({ nodes: prevSnapshot.current.nodes, edges: prevSnapshot.current.edges })
    if (historyRef.current.past.length > 50) historyRef.current.past.shift()
    historyRef.current.future = []
    prevSnapshot.current = snap
  }, [])

  // Track canvas changes for undo
  useEffect(() => {
    if (!populatedRef.current) return
    const snap = { nodes, edges }
    pushHistory(snap)
  }, [nodes, edges]) // eslint-disable-line react-hooks/exhaustive-deps

  const undo = useCallback(() => {
    const prev = historyRef.current.past.pop()
    if (!prev) return
    historyRef.current.future.push({ nodes, edges })
    skipHistoryPush.current = true
    setNodes(prev.nodes)
    setEdges(prev.edges)
  }, [nodes, edges, setNodes, setEdges])

  const redo = useCallback(() => {
    const next = historyRef.current.future.pop()
    if (!next) return
    historyRef.current.past.push({ nodes, edges })
    skipHistoryPush.current = true
    setNodes(next.nodes)
    setEdges(next.edges)
  }, [nodes, edges, setNodes, setEdges])

  // ── Mode switch guard ───────────────────────────────────────────────────────
  useEffect(() => {
    const prevMode = prevModeRef.current
    if (prevMode === state.mode) return
    prevModeRef.current = state.mode

    if (nodes.length === 0) return
    const incompatible = nodes.filter(n => {
      const def = NODE_TYPE_REGISTRY[n.data.nodeType]
      return def && !def.modes.includes(state.mode)
    })
    if (incompatible.length > 0) {
      addToast(
        `${incompatible.length} node${incompatible.length > 1 ? 's' : ''} may not be supported in ${state.mode} mode`,
        'info'
      )
    }
  }, [state.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restore from saved design ──────────────────────────────────────────────
  useEffect(() => {
    if (!design) return
    populatedRef.current = false

    if (design.canvas.nodes.length > 0) {
      const initialNodes: CanvasNode[] = design.canvas.nodes.map(n => ({
        id: n.id,
        type: 'base' as const,
        position: n.position,
        data: {
          label: n.label,
          nodeType: n.type as NodeType,
          data: n.data,
          notes: n.notes,
          tags: n.tags,
          color: n.color,
        },
      }))
      const initialEdges: CanvasEdge[] = design.canvas.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type === 'event' ? 'default' : 'default',
        label: e.label ?? '',
        animated: e.type === 'event',
        data: { label: e.label ?? '', edgeType: e.type ?? 'http', latencyMs: e.data?.latencyMs ?? 0 },
      }))
      setInitialCanvas(initialNodes, initialEdges)
      prevSnapshot.current = { nodes: initialNodes, edges: initialEdges }
      log.canvas.info('Restored canvas from design', { id: design.id, nodes: initialNodes.length, edges: initialEdges.length })
    }

    const t = setTimeout(() => {
      populatedRef.current = true
      // Fit view after restore
      reactFlowInstance.fitView({ padding: 0.15, duration: 400 })
    }, 80)
    return () => clearTimeout(t)
  }, [design?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas snapshot for auto-save ──────────────────────────────────────────
  const canvasSnapshot = useMemo<Canvas>(() => ({
    nodes: nodes.map((n): DesignNode => ({
      id: n.id,
      type: n.data.nodeType,
      position: n.position,
      label: n.data.label,
      data: n.data.data,
      notes: n.data.notes,
      tags: n.data.tags,
      color: n.data.color,
    })),
    edges: edges.map((e): DesignEdge => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: ((e.data as Record<string, unknown>)?.edgeType ?? 'http') as DesignEdge['type'],
      label: (e.data as Record<string, unknown>)?.label as string | undefined ?? e.label as string | undefined,
      data: { latencyMs: (e.data as Record<string, unknown>)?.latencyMs as number | undefined },
    })),
    viewport: { x: 0, y: 0, zoom: 1 },
  }), [nodes, edges])

  useEffect(() => {
    if (!design || !populatedRef.current) return
    scheduleAutosave({ ...design, canvas: canvasSnapshot })
  }, [canvasSnapshot]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Simulation ──────────────────────────────────────────────────────────────
  const handleMetricsUpdate = useCallback((metrics: MetricsSnapshot) => {
    setLiveMetrics(metrics)
    // Track metrics history for CSV export
    metricsHistoryRef.current.push({
      elapsedSec: Math.round(metrics.nodes.length > 0 ? metricsHistoryRef.current.length : 0),
      totalRps: metrics.totalRps,
      totalErrorRate: metrics.totalErrorRate,
      avgLatencyP99: metrics.avgLatencyP99,
    })
    setHasMetrics(true)
  }, [])

  const { isRunning, isPaused, isCompleted, progressPercent, simState, start, pause, resume, stop } =
    useSimulation({ canvas: canvasSnapshot, onMetricsUpdate: handleMetricsUpdate, speedMultiplier })

  const isSimActive = isRunning || isPaused || isCompleted

  // ── Real-time node status badges ────────────────────────────────────────────
  useEffect(() => {
    if (!isSimActive || !liveMetrics) {
      // Clear status after sim ends
      if (!isSimActive) {
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, simStatus: undefined, isSimulating: false, errorRate: undefined, loadFactor: undefined } })))
      }
      return
    }
    setNodes(nds => nds.map(n => {
      const nodeMetrics = liveMetrics.nodes.find(m => m.nodeId === n.id)
      if (!nodeMetrics) return n
      const nodeState = simState?.nodeStates[n.id]
      let simStatus: 'healthy' | 'degraded' | 'failing' | 'down' | 'idle' = 'idle'
      if (nodeState?.isDown) simStatus = 'down'
      else if (nodeMetrics.errorRate > 0.2) simStatus = 'failing'
      else if (nodeMetrics.errorRate > 0.05) simStatus = 'degraded'
      else if (nodeMetrics.rps > 0) simStatus = 'healthy'
      return {
        ...n,
        data: {
          ...n.data,
          isSimulating: true,
          simStatus,
          errorRate: nodeMetrics.errorRate,
          loadFactor: nodeMetrics.cpuPercent / 100,
          rps: nodeMetrics.rps,
          latencyP99: nodeMetrics.latencyP99,
        },
      }
    }))
  }, [liveMetrics, isSimActive, simState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time edge traffic ───────────────────────────────────────────────
  useEffect(() => {
    // Clear animations when sim is stopped or completed
    if (isCompleted || !isSimActive || !liveMetrics) {
      setEdges(eds => eds.map(e => ({
        ...e,
        data: { ...(e.data as Record<string, unknown>), isSimulating: false, rps: 0 },
      })))
      return
    }
    // Compute outgoing edge count per source node
    const outgoing: Record<string, number> = {}
    edges.forEach(e => { outgoing[e.source] = (outgoing[e.source] ?? 0) + 1 })
    setEdges(eds => eds.map(e => {
      const src = liveMetrics.nodes.find(m => m.nodeId === e.source)
      const rps = src && outgoing[e.source] > 0 ? src.rps / outgoing[e.source] : 0
      return { ...e, data: { ...(e.data as Record<string, unknown>), isSimulating: true, rps } }
    }))
  }, [liveMetrics, isSimActive, isCompleted]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bottleneck detection after sim completes ──────────────────────────────
  useEffect(() => {
    if (!isCompleted || !liveMetrics) return
    const worst = liveMetrics.nodes.reduce((max, n) => n.errorRate > max.errorRate ? n : max, liveMetrics.nodes[0])
    if (worst && worst.errorRate > 0.1) {
      const nodeLabel = nodes.find(n => n.id === worst.nodeId)?.data.label ?? worst.nodeId
      setTimeout(() => setBottleneck({ label: nodeLabel, errorRate: worst.errorRate }), 0)
    }
    // Record in sim history
    if (liveMetrics) {
      const entry: SimHistoryEntry = {
        id: Math.random().toString(36).slice(2),
        type: simType,
        label: SIM_REGISTRY_LABEL[simType] ?? simType,
        timestamp: Date.now(),
        finalRps: liveMetrics.totalRps,
        finalErrorRate: liveMetrics.totalErrorRate,
        finalP99: liveMetrics.avgLatencyP99,
      }
      setTimeout(() => setSimHistory(h => [entry, ...h].slice(0, 10)), 0)
    }
  }, [isCompleted]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cinematic auto-zoom ──────────────────────────────────────────────────────
  // Derive the focus node without storing it in state (avoids setState-in-effect)
  const cinematicFocusId = useMemo(() => {
    if (!cinematicMode || !isRunning) return null

    // UI mode: first node marked isActive in the flow trace
    if (simState?.nodeStates) {
      const activeEntry = Object.entries(simState.nodeStates).find(([, ns]) => ns.isActive)
      if (activeEntry) return activeEntry[0]
    }

    // System/service mode: node with highest current RPS
    if (liveMetrics && liveMetrics.nodes.length > 0) {
      const hottest = liveMetrics.nodes.reduce((max, n) => n.rps > max.rps ? n : max)
      if (hottest.rps > 0) return hottest.nodeId
    }

    return null
  }, [cinematicMode, isRunning, simState, liveMetrics])

  // Side-effect: call fitView only when the focus node ID changes
  useEffect(() => {
    if (cinematicFocusId && cinematicFocusId !== cinematicPrevFocusRef.current) {
      reactFlowInstance.fitView({
        nodes: [{ id: cinematicFocusId }],
        duration: 700,
        padding: 0.8,
        maxZoom: 2.0,
      })
    }
    cinematicPrevFocusRef.current = cinematicFocusId
  }, [cinematicFocusId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSimStart = useCallback(
    (config: Omit<SimulationConfig, 'id' | 'createdAt'>) => {
      log.sim.info('Simulation start requested', { type: config.type })
      setSimType(config.type)
      setBottleneck(null)
      start(config)
      addToast(`Simulation started: ${config.name}`, 'info')
    },
    [start, addToast]
  )

  const handleSimStop = useCallback(() => {
    log.sim.info('Simulation stopped')
    stop()
    setLiveMetrics(null)
    cinematicPrevFocusRef.current = null
    addToast('Simulation stopped')
  }, [stop, addToast])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey

      // Cmd+S → save
      if (meta && e.key === 's') {
        e.preventDefault()
        saveNow().then(() => addToast('Saved ✓'))
        return
      }
      // Cmd+Z → undo
      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      // Cmd+Shift+Z → redo
      if (meta && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }
      // Cmd+C → copy selected nodes
      if (meta && e.key === 'c') {
        const selected = nodes.filter(n => n.selected)
        if (selected.length > 0) {
          setCopiedNodes(selected)
          addToast(`Copied ${selected.length} node${selected.length > 1 ? 's' : ''}`, 'info')
        }
        return
      }
      // Cmd+V → paste
      if (meta && e.key === 'v' && copiedNodes.length > 0) {
        e.preventDefault()
        const pasted = copiedNodes.map(n => ({
          ...n,
          id: uuidv4(),
          selected: false,
          position: { x: n.position.x + 30, y: n.position.y + 30 },
        }))
        setNodes(nds => [...nds, ...pasted])
        addToast(`Pasted ${pasted.length} node${pasted.length > 1 ? 's' : ''}`, 'info')
        return
      }
      // Cmd+F → node search
      if (meta && e.key === 'f') {
        e.preventDefault()
        setShowNodeSearch(s => !s)
        return
      }
      // ? → shortcuts modal
      if (e.key === '?' && !meta && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        setShowShortcuts(s => !s)
        return
      }
      // Escape → close panels
      if (e.key === 'Escape') {
        setShowNodeSearch(false)
        setShowShortcuts(false)
        setSelectedEdgeId(null)
        if (state.nodeId) setUrlState({ nodeId: null })
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nodes, copiedNodes, undo, redo, saveNow, addToast, setNodes, state.nodeId, setUrlState])

  // ── Node alignment ──────────────────────────────────────────────────────────
  const selectedNodes = nodes.filter(n => n.selected)

  const handleAlign = useCallback((type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => {
    if (selectedNodes.length < 2) return
    setNodes(nds => {
      const sel = nds.filter(n => n.selected)
      const xs = sel.map(n => n.position.x)
      const ys = sel.map(n => n.position.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      const sortedH = [...sel].sort((a, b) => a.position.x - b.position.x)
      const sortedV = [...sel].sort((a, b) => a.position.y - b.position.y)
      const stepH = sel.length > 1 ? (maxX - minX) / (sel.length - 1) : 0
      const stepV = sel.length > 1 ? (maxY - minY) / (sel.length - 1) : 0

      return nds.map(n => {
        if (!n.selected) return n
        let x = n.position.x, y = n.position.y
        switch (type) {
          case 'left': x = minX; break
          case 'center': x = centerX; break
          case 'right': x = maxX; break
          case 'top': y = minY; break
          case 'middle': y = centerY; break
          case 'bottom': y = maxY; break
          case 'distribute-h': x = minX + sortedH.findIndex(s => s.id === n.id) * stepH; break
          case 'distribute-v': y = minY + sortedV.findIndex(s => s.id === n.id) * stepV; break
        }
        return { ...n, position: { x, y } }
      })
    })
  }, [selectedNodes, setNodes])

  // ── Node jump-to ────────────────────────────────────────────────────────────
  const handleJumpTo = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    reactFlowInstance.setCenter(node.position.x + 80, node.position.y + 40, { zoom: 1.5, duration: 500 })
    setUrlState({ nodeId })
  }, [nodes, reactFlowInstance, setUrlState])

  // ── Save now with toast ─────────────────────────────────────────────────────
  const handleSaveNow = useCallback(async () => {
    await saveNow()
    addToast('Saved ✓')
  }, [saveNow, addToast])

  // ── Import design from JSON ──────────────────────────────────────────────────
  const handleImportDesign = useCallback(async (imported: Design) => {
    // Save the imported design and restore the canvas
    await saveDesign(imported)
    const initialNodes: CanvasNode[] = imported.canvas.nodes.map(n => ({
      id: n.id,
      type: 'base' as const,
      position: n.position,
      data: {
        label: n.label,
        nodeType: n.type as NodeType,
        data: n.data,
        notes: n.notes,
        tags: n.tags,
        color: n.color,
      },
    }))
    const initialEdges: CanvasEdge[] = imported.canvas.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'default' as const,
      label: e.label ?? '',
      animated: e.type === 'event',
      data: { label: e.label ?? '', edgeType: e.type ?? 'http', latencyMs: e.data?.latencyMs ?? 0 },
    }))
    setInitialCanvas(initialNodes, initialEdges)
    addToast(`Imported "${imported.meta.title}"`, 'success')
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.15, duration: 400 }), 100)
  }, [setInitialCanvas, addToast, reactFlowInstance])

  // ── Export PNG ───────────────────────────────────────────────────────────────
  const handleExportPng = useCallback(async () => {
    const el = canvasWrapperRef.current
    if (!el || !design) return
    try {
      await exportCanvasAsPng(el, design.meta.title)
      addToast('Canvas exported as PNG')
    } catch (err) {
      addToast((err as Error).message, 'error')
    }
  }, [design, addToast])

  // ── Export SVG ─────────────────────────────────────────────────────────────────
  const handleExportSvg = useCallback(async () => {
    const el = canvasWrapperRef.current
    if (!el || !design) return
    try {
      await exportCanvasAsSvg(el, design.meta.title)
      addToast('Canvas exported as SVG')
    } catch (err) {
      addToast((err as Error).message, 'error')
    }
  }, [design, addToast])

  // ── Export OpenAPI ────────────────────────────────────────────────────────────
  const handleExportOpenApi = useCallback(() => {
    if (!design) return
    exportOpenApiFromCanvas(canvasSnapshot, design.meta.title)
    addToast('OpenAPI spec exported')
  }, [design, canvasSnapshot, addToast])

  // ── Export TypeScript types ───────────────────────────────────────────────────
  const handleExportTs = useCallback(() => {
    if (!design) return
    exportTypescriptFromCanvas(canvasSnapshot, design.meta.title)
    addToast('TypeScript types exported')
  }, [design, canvasSnapshot, addToast])

  // ── UI-mode code exports ──────────────────────────────────────────────────────
  const handleExportFolderStructure = useCallback(() => {
    if (!design) return
    exportFolderStructure(canvasSnapshot, design.meta.title)
    addToast('Folder structure exported')
  }, [design, canvasSnapshot, addToast])

  const handleExportScaffolds = useCallback(() => {
    if (!design) return
    exportComponentScaffolds(canvasSnapshot, design.meta.title)
    addToast('Component scaffolds exported')
  }, [design, canvasSnapshot, addToast])

  const handleExportRoutes = useCallback(() => {
    if (!design) return
    exportRouteConfig(canvasSnapshot, design.meta.title)
    addToast('Route config exported')
  }, [design, canvasSnapshot, addToast])

  const handleExportApiClient = useCallback(() => {
    if (!design) return
    exportApiClient(canvasSnapshot, design.meta.title)
    addToast('API client exported')
  }, [design, canvasSnapshot, addToast])

  // ── Export metrics CSV ────────────────────────────────────────────────────────
  const handleExportMetricsCsv = useCallback(() => {
    if (!design || metricsHistoryRef.current.length === 0) return
    exportMetricsAsCsv(metricsHistoryRef.current, design.meta.title)
    addToast('Metrics exported as CSV')
  }, [design, addToast])

  // ── Node update wrappers ────────────────────────────────────────────────────
  const selectedNode = nodes.find(n => n.id === state.nodeId) ?? null
  const selectedEdge = edges.find(e => e.id === selectedEdgeId) ?? null

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: CanvasNode) => {
      log.canvas.debug('Node clicked', { id: node.id })
      setSelectedEdgeId(null)
      setUrlState({ nodeId: node.id, panel: 'config' })
    },
    [setUrlState]
  )

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: CanvasEdge) => {
      setSelectedEdgeId(edge.id)
      setUrlState({ nodeId: null })
    },
    [setUrlState]
  )

  const handlePaneClick = useCallback(() => {
    if (state.nodeId) setUrlState({ nodeId: null })
    setSelectedEdgeId(null)
  }, [state.nodeId, setUrlState])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      onDrop(event, reactFlowInstance)
    },
    [onDrop, reactFlowInstance]
  )

  const handleRemoveNode = useCallback((nodeId: string) => {
    removeNode(nodeId)
    addToast('Node removed')
  }, [removeNode, addToast])

  const handleRemoveEdge = useCallback((edgeId: string) => {
    removeEdge(edgeId)
    setSelectedEdgeId(null)
    addToast('Connection removed')
  }, [removeEdge, addToast, setSelectedEdgeId])

  const handleReverseEdge = useCallback((edgeId: string) => {
    setEdges(eds => eds.map(e => e.id !== edgeId ? e : {
      ...e,
      source: e.target,
      target: e.source,
      sourceHandle: e.targetHandle,
      targetHandle: e.sourceHandle,
    }))
    addToast('Direction reversed')
  }, [setEdges, addToast])

  const handleRepointEdge = useCallback((edgeId: string, updates: { source?: string; target?: string }) => {
    setEdges(eds => eds.map(e => e.id !== edgeId ? e : { ...e, ...updates }))
  }, [setEdges])

  // ── Update node top-level fields (notes/tags/color) ──────────────────────
  const updateNodeMeta = useCallback((nodeId: string, meta: { notes?: string; tags?: string[]; color?: string }) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...meta } } : n))
  }, [setNodes])

  const modeLabelColors: Record<string, string> = {
    system: 'bg-primary/10 text-primary border-primary/20',
    ui: 'bg-warning/10 text-warning border-warning/20',
    service: 'bg-accent/10 text-accent border-accent/20',
  }

  return (
    <CinematicContext.Provider value={{ cinematicMode, focusNodeId: cinematicFocusId }}>
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Design header bar — hidden in embed mode */}
      {design && !state.embed && (
        <DesignHeaderBar
          design={design}
          isSaving={isSaving}
          onTitleChange={updateTitle}
          onSave={handleSaveNow}
          onShare={() => setShowShare(true)}
          currentMode={state.mode}
          onBgToggle={toggleBgStyle}
          bgStyle={bgStyle}
          onImportDesign={handleImportDesign}
          onExportPng={handleExportPng}
          onExportSvg={handleExportSvg}
          onExportOpenApi={state.mode === 'service' ? handleExportOpenApi : undefined}
          onExportTs={state.mode === 'ui' ? handleExportTs : undefined}
          onExportFolderStructure={state.mode === 'ui' ? handleExportFolderStructure : undefined}
          onExportScaffolds={state.mode === 'ui' ? handleExportScaffolds : undefined}
          onExportRoutes={state.mode === 'ui' ? handleExportRoutes : undefined}
          onExportApiClient={state.mode === 'ui' ? handleExportApiClient : undefined}
        />
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left palette — hidden in embed mode */}
        {!state.embed && <NodePalette mode={state.mode} />}

        {/* Canvas */}
        <div className="relative flex-1 overflow-hidden" ref={canvasWrapperRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={state.embed ? undefined : onConnect}
            onNodeClick={state.embed ? undefined : handleNodeClick}
            onEdgeClick={state.embed ? undefined : handleEdgeClick}
            onPaneClick={handlePaneClick}
            onDrop={state.embed ? undefined : handleDrop}
            onDragOver={state.embed ? undefined : onDragOver}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            connectionMode={ConnectionMode.Loose}
            fitView
            nodesDraggable={!state.embed}
            nodesConnectable={!state.embed}
            elementsSelectable={!state.embed}
            deleteKeyCode={state.embed ? null : ['Delete', 'Backspace']}
            multiSelectionKeyCode="Shift"
            selectionOnDrag={!state.embed}
            className="h-full w-full"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BG_VARIANT[bgStyle]}
              gap={20}
              size={1.5}
              color="var(--color-canvas-dot)"
            />
            <Controls className="bottom-6 left-6" />
            <MiniMap
              className="bottom-6 right-6"
              nodeColor={node => minimapNodeColor((node.data as { nodeType?: string }).nodeType)}
              maskColor="rgba(0,0,0,0.05)"
            />
            <Panel position="top-left" className="flex items-center gap-2 m-2">
              {/* Mode badge */}
              <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize', modeLabelColors[state.mode] ?? 'bg-muted text-muted-foreground border-border')}>
                {state.mode} mode
              </span>
              {/* Undo/Redo */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card/90 px-1.5 py-1">
                <button type="button" onClick={undo} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Undo (Ctrl+Z)">
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={redo} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Redo (Ctrl+Shift+Z)">
                  <Redo2 className="h-3.5 w-3.5" />
                </button>
                <div className="h-3 w-px bg-border mx-0.5" />
                <button type="button" onClick={() => reactFlowInstance.fitView({ padding: 0.1, duration: 400 })} className="rounded p-0.5 text-muted-foreground hover:text-foreground" title="Fit view">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Panel>
          </ReactFlow>

          {/* Simulation toolbar */}
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <div className="pointer-events-auto">
              <SimulationToolbar
                mode={state.mode}
                isRunning={isRunning}
                isPaused={isPaused}
                progressPercent={progressPercent}
                nodes={nodes}
                onStart={handleSimStart}
                onPause={pause}
                onResume={resume}
                onStop={handleSimStop}
                speedMultiplier={speedMultiplier}
                onSpeedChange={setSpeedMultiplier}
                simHistory={simHistory}
                cinematicMode={cinematicMode}
                onCinematicToggle={() => setCinematicMode(m => !m)}
              />
            </div>
          </div>

          {/* Embed — floating "Open in full view" button */}
          {state.embed && design && (
            <a
              href={`${window.location.origin}/canvas/${design.id}?mode=${state.mode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 right-3 z-40 flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-foreground hover:border-primary/30"
            >
              <ExternalLink className="h-3 w-3" />
              Open in full view
            </a>
          )}

          {/* Node search */}
          {showNodeSearch && (
            <NodeSearch
              nodes={nodes}
              onJump={handleJumpTo}
              onClose={() => setShowNodeSearch(false)}
            />
          )}

          {/* Alignment toolbar */}
          <AlignmentToolbar selectedNodes={selectedNodes} onAlign={handleAlign} />

          {/* Bottleneck banner */}
          {bottleneck && (
            <BottleneckBanner
              nodeLabel={bottleneck.label}
              errorRate={bottleneck.errorRate}
              onDismiss={() => setBottleneck(null)}
            />
          )}

          {/* Status bar */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 border-t border-border bg-card/80 px-4 py-1 backdrop-blur-sm">
            <span className="text-[10px] text-muted-foreground">{nodes.length} node{nodes.length !== 1 ? 's' : ''}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">{edges.length} edge{edges.length !== 1 ? 's' : ''}</span>
            {selectedNodes.length > 0 && (
              <>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-primary font-semibold">{selectedNodes.length} selected</span>
              </>
            )}
          </div>

          {/* Toast stack */}
          <ToastStack toasts={toasts} />

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

          {/* Onboarding tour */}
          {showTour && <OnboardingTour onComplete={completeTour} />}
        </div>

        {/* Right panel — hidden in embed mode */}
        {!state.embed && selectedNode ? (
          <NodeConfigPanel
            node={selectedNode}
            onClose={() => setUrlState({ nodeId: null })}
            onUpdateData={(id, updates) => updateNodeData(id, updates as unknown as Partial<NodeData>)}
            onUpdateLabel={updateNodeLabel}
            onRemove={handleRemoveNode}
            onUpdateMeta={updateNodeMeta}
          />
        ) : !state.embed && selectedEdge ? (
          <EdgeConfigPanel
            edge={selectedEdge}
            nodes={nodes}
            onClose={() => setSelectedEdgeId(null)}
            onUpdateEdge={updateEdgeData}
            onRemoveEdge={handleRemoveEdge}
            onReverseEdge={handleReverseEdge}
            onRepointEdge={handleRepointEdge}
          />
        ) : !state.embed && isSimActive && liveMetrics ? (
          <MetricsPanel
            metrics={liveMetrics}
            elapsedMs={simState?.elapsedMs ?? 0}
            progressPercent={progressPercent}
            simulationType={simType}
            nodes={nodes}
            onExportCsv={hasMetrics ? handleExportMetricsCsv : undefined}
          />
        ) : null}
      </div>

      {/* Share modal */}
      {showShare && design && (
        <ShareModal design={design} onClose={() => setShowShare(false)} />
      )}

      {/* Keyboard shortcuts modal */}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
    </CinematicContext.Provider>
  )
}

// Simple label registry for sim history display
const SIM_REGISTRY_LABEL: Record<string, string> = {
  'load-test': 'Load Test', 'spike-test': 'Spike Test', 'soak-test': 'Soak Test',
  'stress-test': 'Stress Test', 'ramp-down': 'Ramp Down', 'node-kill': 'Node Kill',
  'slow-node': 'Slow Node', 'cascade-failure': 'Cascade Failure', 'db-failure': 'DB Failure',
  'thundering-herd': 'Thundering Herd', 'random-chaos': 'Random Chaos', 'scale-out': 'Scale Out',
  'queue-backpressure': 'Queue Backpressure', 'cache-cold-start': 'Cache Cold Start',
  'retry-amplification': 'Retry Amplification', 'rate-limiting': 'Rate Limiting',
}

export function CanvasPage() {
  const { state } = useUrlState()
  log.canvas.info('CanvasPage mounted', { mode: state.mode })
  return (
    <ReactFlowProvider key={state.mode}>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
