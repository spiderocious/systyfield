import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bug, ChevronDown, ChevronUp, X } from '@shared/ui/icons'
import { cn, isDebugMode } from '@shared/utils'
import { storageAdapter } from '@shared/services/storage-adapter'
import { useTheme } from '@shared/hooks'

interface KVRowProps {
  label: string
  value: string | number | boolean | null | undefined
}

function KVRow({ label, value }: KVRowProps) {
  const display = value === null || value === undefined ? '—' : String(value)
  const isEmpty = value === null || value === undefined || value === ''
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="w-24 shrink-0 text-[10px] font-semibold text-muted-foreground">{label}</span>
      <span className={cn('text-[10px] font-mono', isEmpty ? 'text-muted-foreground/50' : 'text-foreground')}>
        {display}
      </span>
    </div>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="rounded-lg border border-border bg-background/60 px-2 py-1.5">
        {children}
      </div>
    </div>
  )
}

export function DebugOverlay() {
  const [open, setOpen] = useState(true)
  const [params] = useSearchParams()
  const { theme, resolved } = useTheme()

  if (!isDebugMode()) return null

  const urlState = {
    mode: params.get('mode') ?? '(default: system)',
    nodeId: params.get('nodeId'),
    simId: params.get('simId'),
    panel: params.get('panel'),
    debug: params.get('debug'),
  }

  // Read design count from storage synchronously via the raw key pattern
  const designKeys = Object.keys(localStorage).filter(k => k.startsWith('systyfield:design:') && !k.endsWith(':index'))
  const designCount = designKeys.length

  const adapter = storageAdapter.constructor.name

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-[9999] w-64 rounded-xl border border-warning/40 bg-card/95 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between rounded-t-xl px-3 py-2 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-1.5">
          <Bug className="h-3 w-3 text-warning" />
          <span className="text-[11px] font-bold text-warning">Debug Panel</span>
        </div>
        {open ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-3 py-2.5">
          <Section title="URL State">
            <KVRow label="mode" value={urlState.mode} />
            <KVRow label="nodeId" value={urlState.nodeId} />
            <KVRow label="simId" value={urlState.simId} />
            <KVRow label="panel" value={urlState.panel} />
            <KVRow label="debug" value={urlState.debug} />
          </Section>

          <Section title="Theme">
            <KVRow label="preference" value={theme} />
            <KVRow label="resolved" value={resolved} />
          </Section>

          <Section title="Storage">
            <KVRow label="adapter" value={adapter} />
            <KVRow label="designs" value={designCount} />
            <KVRow label="localStorage" value={`${(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB`} />
          </Section>

          <Section title="Build">
            <KVRow label="env" value={import.meta.env.MODE} />
            <KVRow label="dev" value={String(import.meta.env.DEV)} />
          </Section>

          {/* Clear debug mode */}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('systyfield_debug')
              const url = new URL(window.location.href)
              url.searchParams.delete('debug')
              window.location.href = url.toString()
            }}
            className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-border py-1 text-[10px] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            <X className="h-2.5 w-2.5" />
            Exit debug mode
          </button>
        </div>
      )}
    </div>
  )
}
