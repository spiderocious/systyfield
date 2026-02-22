import { useState, useRef, useEffect, useCallback } from 'react'
import type { Design } from '@shared/types'
import { Save, Share2, Check, Grid3X3, Layers, SlidersHorizontal, Download, FileJson, FileCode, Upload, ImageIcon } from '@shared/ui/icons'
import { cn } from '@shared/utils'
import { exportDesignAsJson, importDesignFromJson } from '../services/export-service'

type BgStyle = 'dots' | 'lines' | 'cross'

const MODE_COLORS: Record<string, string> = {
  system: 'bg-primary/10 text-primary border-primary/20',
  ui: 'bg-warning/10 text-warning border-warning/20',
  service: 'bg-success/10 text-success border-success/20',
}

const BG_STYLE_ICONS: Record<BgStyle, React.ReactNode> = {
  dots: <Grid3X3 className="h-3 w-3" />,
  lines: <Layers className="h-3 w-3" />,
  cross: <SlidersHorizontal className="h-3 w-3" />,
}

interface DesignHeaderBarProps {
  design: Design
  isSaving: boolean
  onTitleChange: (title: string) => void
  onSave: () => void
  onShare: () => void
  currentMode?: string
  onBgToggle?: () => void
  bgStyle?: BgStyle
  onImportDesign?: (design: Design) => void
  onExportPng?: () => void
  onExportSvg?: () => void
  onExportOpenApi?: () => void
  onExportTs?: () => void
  onExportFolderStructure?: () => void
  onExportScaffolds?: () => void
  onExportRoutes?: () => void
  onExportApiClient?: () => void
}

export function DesignHeaderBar({
  design,
  isSaving,
  onTitleChange,
  onSave,
  onShare,
  currentMode,
  onBgToggle,
  bgStyle = 'dots',
  onImportDesign,
  onExportPng,
  onExportSvg,
  onExportOpenApi,
  onExportTs,
  onExportFolderStructure,
  onExportScaffolds,
  onExportRoutes,
  onExportApiClient,
}: DesignHeaderBarProps) {
  const [editing, setEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(design.meta.title)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTitleValue(design.meta.title)
  }, [design.meta.title])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExportMenu])

  const commitTitle = () => {
    const trimmed = titleValue.trim()
    const final = trimmed || 'Untitled Design'
    setTitleValue(final)
    onTitleChange(final)
    setEditing(false)
  }

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importDesignFromJson(file)
      onImportDesign?.(imported)
    } catch (err) {
      console.error('Import failed:', err)
    }
    e.target.value = ''
  }, [onImportDesign])

  return (
    <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2">
      {/* Mode badge */}
      {currentMode && (
        <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize', MODE_COLORS[currentMode] ?? 'bg-muted text-muted-foreground border-border')}>
          {currentMode}
        </span>
      )}

      {/* Editable title */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') commitTitle()
              if (e.key === 'Escape') {
                setTitleValue(design.meta.title)
                setEditing(false)
              }
            }}
            className="w-full rounded-md border border-primary bg-background px-2 py-0.5 text-sm font-semibold text-foreground outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="truncate text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            {design.meta.title}
          </button>
        )}
      </div>

      {/* Save status */}
      <div className="flex items-center gap-1.5">
        {isSaving ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
            Saving...
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-success" />
            Saved
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* Background style toggle */}
        {onBgToggle && (
          <button
            type="button"
            onClick={onBgToggle}
            title={`Canvas background: ${bgStyle}`}
            className="flex items-center gap-1 rounded-lg border border-border bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            {BG_STYLE_ICONS[bgStyle]}
            <span className="capitalize text-[10px]">{bgStyle}</span>
          </button>
        )}

        {/* Export/Import dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setShowExportMenu(m => !m)}
            title="Export / Import"
            className="flex items-center gap-1 rounded-lg border border-border bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <Download className="h-3 w-3" />
            <span className="text-[10px]">Export</span>
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl border border-border bg-card shadow-2xl">
              <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">Export</div>
              <button
                type="button"
                onClick={() => { exportDesignAsJson(design); setShowExportMenu(false) }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
              >
                <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
                Download JSON
              </button>
              {onExportPng && (
                <button
                  type="button"
                  onClick={() => { onExportPng(); setShowExportMenu(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  Export as PNG
                </button>
              )}
              {onExportSvg && (
                <button
                  type="button"
                  onClick={() => { onExportSvg(); setShowExportMenu(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-primary/70" />
                  Export as SVG
                </button>
              )}
              {onExportOpenApi && (
                <button
                  type="button"
                  onClick={() => { onExportOpenApi(); setShowExportMenu(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <FileJson className="h-3.5 w-3.5 text-success" />
                  OpenAPI 3.0
                </button>
              )}
              {onExportTs && (
                <button
                  type="button"
                  onClick={() => { onExportTs(); setShowExportMenu(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <FileCode className="h-3.5 w-3.5 text-primary" />
                  TypeScript Types
                </button>
              )}
              {onExportFolderStructure && (
                <button
                  type="button"
                  onClick={() => { onExportFolderStructure(); setShowExportMenu(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <FileCode className="h-3.5 w-3.5 text-warning" />
                  Folder Structure
                </button>
              )}
              {onExportScaffolds && (
                <button
                  type="button"
                  onClick={() => { onExportScaffolds(); setShowExportMenu(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <FileCode className="h-3.5 w-3.5 text-success" />
                  Component Scaffolds
                </button>
              )}
              {onExportRoutes && (
                <button
                  type="button"
                  onClick={() => { onExportRoutes(); setShowExportMenu(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <FileCode className="h-3.5 w-3.5 text-accent" />
                  Route Config
                </button>
              )}
              {onExportApiClient && (
                <button
                  type="button"
                  onClick={() => { onExportApiClient(); setShowExportMenu(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <FileJson className="h-3.5 w-3.5 text-secondary" />
                  API Client
                </button>
              )}
              <div className="h-px bg-border mx-3" />
              <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Import</div>
              <button
                type="button"
                onClick={() => { importRef.current?.click(); setShowExportMenu(false) }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-b-xl transition-colors"
              >
                <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                Load from JSON
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground'
          )}
        >
          <Save className="h-3 w-3" />
          Save
        </button>
        <button
          type="button"
          onClick={onShare}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Share2 className="h-3 w-3" />
          Share
        </button>
      </div>

      {/* Hidden file import input */}
      <input
        ref={importRef}
        type="file"
        accept=".json,.systyfield.json"
        className="hidden"
        onChange={handleImportFile}
      />
    </div>
  )
}
