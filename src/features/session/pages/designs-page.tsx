import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DesignSummary } from '@shared/types'
import { listDesigns, deleteDesign, duplicateDesign, createNewDesign, saveDesign } from '../services/design-service'
import { ROUTES } from '@shared/constants'
import { cn } from '@shared/utils'
import {
  Search, Plus, Trash2, Copy, ExternalLink, FolderOpen,
  Server, Monitor, Route, RefreshCw, MoreVertical,
} from '@shared/ui/icons'

// ─── Mode icon map ─────────────────────────────────────────────────────────────

const MODE_ICONS: Record<string, React.ElementType> = {
  system: Server,
  ui: Monitor,
  service: Route,
}

const MODE_COLORS: Record<string, string> = {
  system: 'bg-primary/10 text-primary border-primary/20',
  ui: 'bg-warning/10 text-warning border-warning/20',
  service: 'bg-success/10 text-success border-success/20',
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

// ─── Design card ──────────────────────────────────────────────────────────────

interface DesignCardProps {
  summary: DesignSummary
  onOpen: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function DesignCard({ summary, onOpen, onDuplicate, onDelete }: DesignCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const ModeIcon = MODE_ICONS[summary.mode] ?? Server

  return (
    <div
      className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md cursor-pointer"
      onClick={onOpen}
    >
      {/* Preview thumbnail */}
      <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
        <div className="flex flex-col items-center gap-2 opacity-30">
          <ModeIcon className="h-8 w-8" />
          <span className="text-[10px] font-medium uppercase tracking-wider">{summary.mode} design</span>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{summary.meta.title}</p>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setMenuOpen(m => !m) }}
            className="shrink-0 rounded-lg p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase', MODE_COLORS[summary.mode] ?? 'bg-muted text-muted-foreground border-border')}>
            {summary.mode}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Updated {formatDate(summary.meta.updatedAt)}
          </span>
        </div>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          className="absolute right-3 top-3 z-50 min-w-[140px] rounded-xl border border-border bg-card shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onOpen() }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-t-xl transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            Open
          </button>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onDuplicate() }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            Duplicate
          </button>
          <div className="h-px bg-border mx-2" />
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onDelete() }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/5 rounded-b-xl transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Delete confirm dialog ─────────────────────────────────────────────────────

function DeleteConfirmDialog({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-80 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="text-sm font-bold text-foreground mb-1">Delete design?</h2>
        <p className="text-xs text-muted-foreground mb-4">
          "<span className="text-foreground font-medium">{title}</span>" will be permanently removed. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card">
        <FolderOpen className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">No designs yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Create your first system design to get started</p>
      </div>
      <button
        type="button"
        onClick={onNew}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        <Plus className="h-4 w-4" />
        New Design
      </button>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function DesignsPage() {
  const navigate = useNavigate()
  const [designs, setDesigns] = useState<DesignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DesignSummary | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const list = await listDesigns()
    setDesigns(list)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleNew = useCallback(async () => {
    const design = createNewDesign('system')
    await saveDesign(design)
    navigate(ROUTES.CANVAS.DESIGN(design.id))
  }, [navigate])

  const handleOpen = useCallback((id: string) => {
    navigate(ROUTES.CANVAS.DESIGN(id))
  }, [navigate])

  const handleDuplicate = useCallback(async (id: string) => {
    const copy = await duplicateDesign(id)
    if (copy) {
      await load()
    }
  }, [load])

  const handleDelete = useCallback(async (id: string) => {
    await deleteDesign(id)
    setDeleteTarget(null)
    await load()
  }, [load])

  const filtered = designs.filter(d =>
    query === '' ||
    d.meta.title.toLowerCase().includes(query.toLowerCase()) ||
    d.mode.includes(query.toLowerCase())
  )

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">My Designs</h1>
            <p className="text-xs text-muted-foreground">{designs.length} design{designs.length !== 1 ? 's' : ''} saved locally</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNew}
              className="flex items-center gap-2 rounded-xl bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              New Design
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search designs by name or mode..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 && query === '' ? (
          <EmptyState onNew={handleNew} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24">
            <Search className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No designs match "<span className="text-foreground">{query}</span>"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {/* New design card */}
            <button
              type="button"
              onClick={handleNew}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-transparent p-6 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              <Plus className="h-7 w-7" />
              <span className="text-xs font-semibold">New Design</span>
            </button>
            {filtered.map(d => (
              <DesignCard
                key={d.id}
                summary={d}
                onOpen={() => handleOpen(d.id)}
                onDuplicate={() => handleDuplicate(d.id)}
                onDelete={() => setDeleteTarget(d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirmDialog
          title={deleteTarget.meta.title}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
