import type { CanvasNode } from '../hooks'
import { NODE_TYPE_REGISTRY } from '@shared/constants'
import type { ConfigField } from '@shared/constants'
import { cn } from '@shared/utils'
import { X, Trash2 } from '@shared/ui/icons'
import * as Icons from '@shared/ui/icons'
import type { LucideIcon } from '@shared/ui/icons'

interface NodeConfigPanelProps {
  node: CanvasNode
  onClose: () => void
  onUpdateData: (nodeId: string, updates: Record<string, unknown>) => void
  onUpdateLabel: (nodeId: string, label: string) => void
  onRemove: (nodeId: string) => void
}

interface FieldInputProps {
  field: ConfigField
  value: unknown
  onChange: (val: unknown) => void
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  const inputClass =
    'w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20'

  switch (field.type) {
    case 'boolean':
      return (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            value ? 'bg-primary' : 'bg-muted'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
              value ? 'translate-x-4' : 'translate-x-0'
            )}
          />
        </button>
      )

    case 'select':
      return (
        <select
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          className={cn(inputClass, 'cursor-pointer')}
        >
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )

    case 'number':
      return (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={Number(value ?? 0)}
            onChange={e => onChange(Number(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            className={cn(inputClass, 'flex-1')}
          />
          {field.unit && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">{field.unit}</span>
          )}
        </div>
      )

    case 'key-value': {
      const kvData = (value as Record<string, string>) ?? {}
      return (
        <div className="space-y-1.5">
          {Object.entries(kvData).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <input
                value={k}
                readOnly
                className={cn(inputClass, 'w-1/2 font-mono text-xs')}
              />
              <input
                value={v}
                onChange={e => {
                  const next = { ...kvData, [k]: e.target.value }
                  onChange(next)
                }}
                className={cn(inputClass, 'flex-1 font-mono text-xs')}
              />
              <button
                type="button"
                onClick={() => {
                  const next = { ...kvData }
                  delete next[k]
                  onChange(next)
                }}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const key = `KEY_${Object.keys(kvData).length + 1}`
              onChange({ ...kvData, [key]: '' })
            }}
            className="text-xs text-primary hover:underline"
          >
            + Add variable
          </button>
        </div>
      )
    }

    case 'tags': {
      const tags = (value as string[]) ?? []
      return (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Type and press Enter..."
            className={inputClass}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim()
                if (val) {
                  onChange([...tags, val]);
                  (e.target as HTMLInputElement).value = ''
                }
              }
            }}
          />
        </div>
      )
    }

    default:
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputClass}
        />
      )
  }
}

export function NodeConfigPanel({
  node,
  onClose,
  onUpdateData,
  onUpdateLabel,
  onRemove,
}: NodeConfigPanelProps) {
  const def = NODE_TYPE_REGISTRY[node.data.nodeType]
  if (!def) return null

  const IconComponent = (Icons as Record<string, LucideIcon>)[def.icon] ?? Icons.Server
  const colorVar = `var(${def.colorVar})`
  const nodeData = node.data.data as unknown as Record<string, unknown>

  return (
    <div className="flex h-full w-72 flex-col border-l border-border bg-card">
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b border-border px-4 py-3"
        style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 8%, transparent)` }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: colorVar }}
        >
          <IconComponent className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{def.label}</p>
          <p className="text-xs text-muted-foreground">{def.description}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable config fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label field always first */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Label</label>
          <input
            type="text"
            value={node.data.label}
            onChange={e => onUpdateLabel(node.id, e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {def.configFields.map(field => (
          <div key={field.key} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-foreground">{field.label}</label>
              {field.description && (
                <span className="text-[10px] text-muted-foreground">— {field.description}</span>
              )}
              {field.type === 'boolean' && (
                <div className="ml-auto">
                  <FieldInput
                    field={field}
                    value={nodeData[field.key]}
                    onChange={val => onUpdateData(node.id, { [field.key]: val })}
                  />
                </div>
              )}
            </div>
            {field.type !== 'boolean' && (
              <FieldInput
                field={field}
                value={nodeData[field.key]}
                onChange={val => onUpdateData(node.id, { [field.key]: val })}
              />
            )}
          </div>
        ))}
      </div>

      {/* Delete footer */}
      <div className="border-t border-border p-4">
        <button
          onClick={() => {
            onRemove(node.id)
            onClose()
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove node
        </button>
      </div>
    </div>
  )
}
