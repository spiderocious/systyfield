import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@shared/utils'
import { log } from '@shared/utils'
import { storageAdapter } from '@shared/services/storage-adapter'
import { createNewDesign } from '@features/session/services/design-service'
import {
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Layers3,
  MousePointerClick,
  TrendingUp,
  RotateCcw,
  Search,
} from '@shared/ui/icons'
import { TemplatePreview } from './parts/template-preview'
import { DEMO_TEMPLATES } from './data/templates'
import type { DemoTemplate } from './data/templates'
import type { Canvas, DesignEdge } from '@shared/types/design.types'

// ─── Open template in canvas ──────────────────────────────────────────────────

async function openTemplate(template: DemoTemplate, navigate: ReturnType<typeof useNavigate>) {
  log.session.info('Opening demo template', { id: template.id, mode: template.mode })

  const design = createNewDesign(template.mode)
  const canvas: Canvas = {
    nodes: template.nodes.map(n => ({
      id: n.id,
      type: n.data.nodeType,
      position: n.position,
      label: n.data.label,
      data: n.data.data,
    })),
    edges: template.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: ((e.data as Record<string, unknown>)?.edgeType ?? 'http') as DesignEdge['type'],
      label: ((e.data as Record<string, unknown>)?.label as string) ?? '',
    })),
    viewport: { x: 0, y: 0, zoom: 1 },
  }
  const withCanvas = { ...design, meta: { ...design.meta, title: template.title }, canvas }
  await storageAdapter.saveDesign(withCanvas)
  navigate(`/canvas/${withCanvas.id}?mode=${template.mode}`)
}

// ─── Feature highlight card ───────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  tooltip: string
}

function FeatureCard({ icon, title, description, tooltip }: FeatureCardProps) {
  const [showTip, setShowTip] = useState(false)

  return (
    <div
      className="relative rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        {icon}
      </div>
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
      {showTip && (
        <div className="absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] text-foreground shadow-lg">
          {tooltip}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-b border-r border-border bg-card" />
        </div>
      )}
    </div>
  )
}

// ─── Template card ────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: DemoTemplate
  onOpen: () => void
  isLoading: boolean
}

function TemplateCard({ template, onOpen, isLoading }: TemplateCardProps) {
  const [showTip, setShowTip] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)

  const handleReplay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setPreviewKey(k => k + 1)
  }, [])

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-primary/20">
      {/* Mini canvas preview with replay button */}
      <div className="relative bg-canvas-bg border-b border-border overflow-hidden group/preview">
        <TemplatePreview key={previewKey} template={template} />
        <button
          type="button"
          onClick={handleReplay}
          className="absolute top-2 right-2 flex items-center gap-1 rounded-lg border border-border bg-card/80 px-2 py-1 text-[10px] font-medium text-muted-foreground opacity-0 group-hover/preview:opacity-100 transition-opacity backdrop-blur-sm hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Replay
        </button>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', template.badgeColor)}>
            {template.badge}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">{template.mode} mode</span>
        </div>

        <h3 className="text-sm font-bold text-foreground">{template.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed flex-1">{template.description}</p>

        {/* Tip with hover tooltip */}
        <div
          className="relative mt-3 cursor-default"
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
        >
          <div className="flex items-start gap-1.5 rounded-lg border border-dashed border-primary/20 bg-primary/5 px-3 py-2">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <p className="text-[11px] text-primary/80 leading-tight">{template.tip}</p>
          </div>
          {showTip && (
            <div className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] text-foreground shadow-lg">
              Tip: try this when you open the template
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-b border-r border-border bg-card" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpen}
          disabled={isLoading}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {isLoading ? 'Opening…' : 'Open in Canvas'}
        </button>
      </div>
    </div>
  )
}

// ─── Demo page ────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = ['All', 'System', 'Service', 'UI']

export function DemoPage() {
  const navigate = useNavigate()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const handleOpen = async (template: DemoTemplate) => {
    setLoadingId(template.id)
    try {
      await openTemplate(template, navigate)
    } catch (err) {
      log.session.error('Failed to open demo template', { err })
      setLoadingId(null)
    }
  }

  const filteredTemplates = DEMO_TEMPLATES.filter(t => {
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory
    const matchesSearch = searchQuery === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background w-full">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-card/95 px-6 py-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div className="mx-auto flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Examples & Templates</span>
        </div>
        <div className="w-12" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">
              {DEMO_TEMPLATES.length} interactive templates
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            See systyfield in action
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground leading-relaxed">
            Pick a template to explore a pre-built design. Every template opens in the full canvas — drag nodes, edit configs, and run simulations.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/canvas/new')}
              className="rounded-xl border border-border bg-card px-5 py-2 text-sm font-semibold text-foreground transition-all hover:border-primary/30 hover:shadow-sm"
            >
              Start from scratch
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Category tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
                  activeCategory === cat
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {cat}
                {cat !== 'All' && (
                  <span className="ml-1.5 text-[9px] font-bold text-muted-foreground/60">
                    {DEMO_TEMPLATES.filter(t => t.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 sm:w-56">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Template grid */}
        <section className="mb-16">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Search className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No templates match your search</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onOpen={() => handleOpen(template)}
                  isLoading={loadingId === template.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* Feature highlights */}
        <section>
          <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            What you can do
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5 text-primary" />}
              title="Simulate your system"
              description="Run 16 simulation types — load tests, spike tests, chaos engineering — and watch live metrics update in real time with per-node breakdowns."
              tooltip="Start a simulation from the toolbar floating above the canvas"
            />
            <FeatureCard
              icon={<MousePointerClick className="h-5 w-5 text-primary" />}
              title="Configure every node"
              description="Click any node to open the config panel. Change replicas, memory limits, DB engines, validation rules — all reflected in simulation outputs."
              tooltip="Click a node on the canvas to open its config panel"
            />
            <FeatureCard
              icon={<Layers3 className="h-5 w-5 text-primary" />}
              title="Three design modes"
              description="Switch between System Design, UI Architecture, and Service-Level API Designer — each mode has its own node types, config fields, and export options."
              tooltip="Use the System / UI / Service tabs in the header to switch modes"
            />
          </div>
        </section>
      </div>
    </div>
  )
}
