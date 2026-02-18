import { useState, useRef, useEffect } from 'react'
import type { Design } from '@shared/types'
import { Save, Share2, Check } from '@shared/ui/icons'
import { cn } from '@shared/utils'

interface DesignHeaderBarProps {
  design: Design
  isSaving: boolean
  onTitleChange: (title: string) => void
  onSave: () => void
  onShare: () => void
}

export function DesignHeaderBar({
  design,
  isSaving,
  onTitleChange,
  onSave,
  onShare,
}: DesignHeaderBarProps) {
  const [editing, setEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(design.meta.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTitleValue(design.meta.title)
  }, [design.meta.title])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commitTitle = () => {
    const trimmed = titleValue.trim()
    const final = trimmed || 'Untitled Design'
    setTitleValue(final)
    onTitleChange(final)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2">
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
    </div>
  )
}
