import { useState } from 'react'
import type { Design } from '@shared/types'
import { X, Copy, Check, Eye, Edit3 } from '@shared/ui/icons'
import { cn } from '@shared/utils'
import { getShareUrl } from '../services/design-service'
import { ROUTES } from '@shared/constants'

interface ShareModalProps {
  design: Design
  onClose: () => void
}

type CopiedState = 'view' | 'edit' | 'readonly' | null

export function ShareModal({ design, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState<CopiedState>(null)

  const viewUrl = getShareUrl(design, 'view')
  const editUrl = getShareUrl(design, 'edit')
  const readonlyUrl = `${window.location.origin}${ROUTES.VIEW}?id=${design.id}`

  const copyToClipboard = async (url: string, type: Exclude<CopiedState, null>) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback: select the text
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Share Design</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Copy a link to share <span className="font-medium text-foreground">{design.meta.title}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Links */}
        <div className="space-y-3 p-5">
          <ShareLinkRow
            icon={<Eye className="h-4 w-4" />}
            label="Read-only view"
            description="Interactive read-only canvas — no login needed"
            url={readonlyUrl}
            copied={copied === 'readonly'}
            onCopy={() => copyToClipboard(readonlyUrl, 'readonly')}
            colorClass="text-success"
          />
          <ShareLinkRow
            icon={<Eye className="h-4 w-4" />}
            label="View token"
            description="Original view token link (legacy)"
            url={viewUrl}
            copied={copied === 'view'}
            onCopy={() => copyToClipboard(viewUrl, 'view')}
            colorClass="text-info"
          />
          <ShareLinkRow
            icon={<Edit3 className="h-4 w-4" />}
            label="Edit access"
            description="Anyone with this link can modify the design"
            url={editUrl}
            copied={copied === 'edit'}
            onCopy={() => copyToClipboard(editUrl, 'edit')}
            colorClass="text-warning"
            isPrivate
          />
        </div>

        {/* Footer note */}
        <div className="border-t border-border px-5 py-3">
          <p className="text-[10px] text-muted-foreground">
            Links are tied to this design ID. Anyone with the link can access it — keep the edit link private.
          </p>
        </div>
      </div>
    </div>
  )
}

interface ShareLinkRowProps {
  icon: React.ReactNode
  label: string
  description: string
  url: string
  copied: boolean
  onCopy: () => void
  colorClass: string
  isPrivate?: boolean
}

function ShareLinkRow({ icon, label, description, url, copied, onCopy, colorClass, isPrivate }: ShareLinkRowProps) {
  return (
    <div className={cn('rounded-xl border border-border p-3', isPrivate && 'border-warning/20 bg-warning/5')}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className={colorClass}>{icon}</span>
          <div>
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground">{description}</p>
          </div>
        </div>
        {isPrivate && (
          <span className="shrink-0 rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning">
            Private
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground outline-none truncate"
        />
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
            copied
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground'
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
