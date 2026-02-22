import { useRef, useState } from 'react'
import type { CanvasNode } from '../hooks'
import { NODE_TYPE_REGISTRY } from '@shared/constants'
import type { ConfigField } from '@shared/constants'
import { cn } from '@shared/utils'
import { X, Trash2, Upload, ImageIcon, Tag, StickyNote, Palette, ChevronDown, ChevronRight, Wand2 } from '@shared/ui/icons'
import * as Icons from '@shared/ui/icons'
import type { LucideIcon } from '@shared/ui/icons'

interface NodeConfigPanelProps {
  node: CanvasNode
  onClose: () => void
  onUpdateData: (nodeId: string, updates: Record<string, unknown>) => void
  onUpdateLabel: (nodeId: string, label: string) => void
  onRemove: (nodeId: string) => void
  onUpdateMeta?: (nodeId: string, meta: { notes?: string; tags?: string[]; color?: string }) => void
}

// ─── Image upload ─────────────────────────────────────────────────────────────

function ImageUploadField({ value, onChange }: { value: string | undefined; onChange: (val: string | undefined) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onChange(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img src={value} alt="Screen preview" className="w-full object-cover max-h-36" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute top-1.5 right-1.5 rounded-full bg-card/90 p-1 text-muted-foreground shadow-sm hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
          <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Upload className="h-3.5 w-3.5" />
        {value ? 'Replace image' : 'Upload image'}
      </button>
    </div>
  )
}

// ─── Validation rules editor ──────────────────────────────────────────────────

interface ValidationRule { field: string; rule: string; message: string }

function RulesEditorField({ value, onChange }: { value: ValidationRule[] | undefined; onChange: (v: ValidationRule[]) => void }) {
  const rules = value ?? []
  return (
    <div className="space-y-1.5">
      {rules.map((r, i) => (
        <div key={i} className="space-y-1 rounded-lg border border-border bg-muted/30 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Rule {i + 1}</span>
            <button type="button" onClick={() => onChange(rules.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </div>
          <input
            value={r.field}
            onChange={e => onChange(rules.map((x, idx) => idx === i ? { ...x, field: e.target.value } : x))}
            placeholder="field name"
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground outline-none focus:border-primary"
          />
          <input
            value={r.rule}
            onChange={e => onChange(rules.map((x, idx) => idx === i ? { ...x, rule: e.target.value } : x))}
            placeholder="required | minLength:8 | pattern:..."
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground outline-none focus:border-primary"
          />
          <input
            value={r.message}
            onChange={e => onChange(rules.map((x, idx) => idx === i ? { ...x, message: e.target.value } : x))}
            placeholder="error message"
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rules, { field: '', rule: 'required', message: 'This field is required' }])}
        className="text-xs text-primary hover:underline"
      >
        + Add rule
      </button>
    </div>
  )
}

// ─── Component props editor ───────────────────────────────────────────────────

interface ComponentProp { name: string; type: string; required: boolean; defaultValue: string }

function PropsEditorField({ value, onChange }: { value: ComponentProp[] | undefined; onChange: (v: ComponentProp[]) => void }) {
  const props = value ?? []
  return (
    <div className="space-y-1.5">
      {props.length > 0 && (
        <div className="grid grid-cols-[1fr_80px_auto_auto] gap-1 text-[9px] font-bold uppercase text-muted-foreground px-0.5">
          <span>Name</span><span>Type</span><span>Req?</span><span />
        </div>
      )}
      {props.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_80px_auto_auto] items-center gap-1">
          <input
            value={p.name}
            onChange={e => onChange(props.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
            placeholder="propName"
            className="rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground outline-none focus:border-primary"
          />
          <input
            value={p.type}
            onChange={e => onChange(props.map((x, idx) => idx === i ? { ...x, type: e.target.value } : x))}
            placeholder="string"
            className="rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => onChange(props.map((x, idx) => idx === i ? { ...x, required: !x.required } : x))}
            className={cn('h-5 w-9 rounded-full border-2 border-transparent transition-colors', p.required ? 'bg-primary' : 'bg-muted')}
          >
            <span className={cn('block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', p.required ? 'translate-x-4' : 'translate-x-0')} />
          </button>
          <button type="button" onClick={() => onChange(props.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...props, { name: '', type: 'string', required: false, defaultValue: '' }])}
        className="text-xs text-primary hover:underline"
      >
        + Add prop
      </button>
    </div>
  )
}

// ─── Response branch editor ───────────────────────────────────────────────────

interface ResponseBranch { value: string; label: string; description?: string; statusCode?: number }

function BranchEditorField({ value, onChange }: { value: ResponseBranch[] | undefined; onChange: (v: ResponseBranch[]) => void }) {
  const branches = Array.isArray(value) ? value : []

  const STATUS_COLORS: Record<string, string> = {
    '2': 'text-emerald-500',
    '3': 'text-blue-400',
    '4': 'text-amber-500',
    '5': 'text-destructive',
  }

  const colorFor = (code: number | undefined) => {
    if (!code) return 'text-muted-foreground'
    return STATUS_COLORS[String(code)[0]] ?? 'text-muted-foreground'
  }

  return (
    <div className="space-y-2">
      {branches.map((b, i) => (
        <div key={i} className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Branch {i + 1}</span>
            <button
              type="button"
              onClick={() => onChange(branches.filter((_, idx) => idx !== i))}
              className="rounded p-0.5 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {/* Value + status code row */}
          <div className="flex gap-1.5">
            <input
              value={b.value}
              onChange={e => onChange(branches.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))}
              placeholder="APPROVED"
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground outline-none focus:border-primary"
            />
            <input
              type="number"
              value={b.statusCode ?? ''}
              onChange={e => onChange(branches.map((x, idx) => idx === i ? { ...x, statusCode: e.target.value ? Number(e.target.value) : undefined } : x))}
              placeholder="200"
              min={100}
              max={599}
              className={`w-16 rounded border border-border bg-background px-2 py-1 text-xs font-mono outline-none focus:border-primary ${colorFor(b.statusCode)}`}
            />
          </div>
          {/* Label */}
          <input
            value={b.label}
            onChange={e => onChange(branches.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))}
            placeholder="Branch label shown in UI"
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
          />
          {/* Description */}
          <input
            value={b.description ?? ''}
            onChange={e => onChange(branches.map((x, idx) => idx === i ? { ...x, description: e.target.value || undefined } : x))}
            placeholder="Optional description..."
            className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground outline-none focus:border-primary"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...branches, { value: '', label: '', statusCode: 200 }])}
        className="text-xs text-primary hover:underline"
      >
        + Add response branch
      </button>
    </div>
  )
}

// ─── JSON editor ──────────────────────────────────────────────────────────────

function JsonEditorField({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const [jsonError, setJsonError] = useState<string | null>(null)
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)

  return (
    <div className="space-y-1">
      <textarea
        value={text}
        onChange={e => {
          onChange(e.target.value)
          try { JSON.parse(e.target.value); setJsonError(null) } catch { setJsonError('Invalid JSON') }
        }}
        rows={6}
        spellCheck={false}
        placeholder='{\n  "key": "value"\n}'
        className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20 resize-y"
      />
      {jsonError && <p className="text-[10px] text-destructive">{jsonError}</p>}
    </div>
  )
}

// ─── Field input dispatcher ───────────────────────────────────────────────────

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

    case 'multi-select': {
      const selected = (value as string[]) ?? []
      return (
        <div className="flex flex-wrap gap-1.5">
          {field.options?.map(opt => {
            const active = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(active ? selected.filter(v => v !== opt.value) : [...selected, opt.value])}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )
    }

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

    case 'textarea':
      return (
        <textarea
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={cn(inputClass, 'resize-y font-mono text-xs')}
        />
      )

    case 'json-editor':
      return <JsonEditorField value={value as string | undefined} onChange={onChange} />

    case 'rules-editor':
      return (
        <RulesEditorField
          value={value as ValidationRule[] | undefined}
          onChange={onChange}
        />
      )

    case 'props-editor':
      return (
        <PropsEditorField
          value={value as ComponentProp[] | undefined}
          onChange={onChange}
        />
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

    case 'image-upload':
      return (
        <ImageUploadField
          value={value as string | undefined}
          onChange={onChange}
        />
      )

    case 'branch-editor':
      return (
        <BranchEditorField
          value={value as ResponseBranch[] | undefined}
          onChange={onChange}
        />
      )

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

// ─── Color picker swatches ────────────────────────────────────────────────────

const COLOR_SWATCHES = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#3B82F6',
  '#F97316', '#84CC16', '#6B7280',
]

function ColorSwatchPicker({ value, onChange }: { value: string | undefined; onChange: (c: string | undefined) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {COLOR_SWATCHES.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(value === c ? undefined : c)}
          className={cn(
            'h-5 w-5 rounded-full border-2 transition-all',
            value === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
          )}
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground/30 text-muted-foreground/50 text-[8px] font-bold hover:border-muted-foreground/60"
        title="Reset color"
      >✕</button>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function NodeConfigPanel({
  node,
  onClose,
  onUpdateData,
  onUpdateLabel,
  onRemove,
  onUpdateMeta,
}: NodeConfigPanelProps) {
  const def = NODE_TYPE_REGISTRY[node.data.nodeType]
  if (!def) return null

  const [showMeta, setShowMeta] = useState(false)

  const IconComponent = (Icons as Record<string, LucideIcon>)[def.icon] ?? Icons.Server
  const colorVar = `var(${def.colorVar})`
  const nodeData = node.data.data as unknown as Record<string, unknown>

  const hasReplicas = def.configFields.some(f => f.key === 'replicas')
  const hasCpu = def.configFields.some(f => f.key === 'cpu')
  const hasRam = def.configFields.some(f => f.key === 'ram')
  const hasQuickScale = hasReplicas || hasCpu || hasRam

  const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20'

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
          <p className="text-xs text-muted-foreground truncate">{def.description}</p>
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
            className={inputClass}
          />
        </div>

        {/* Presets (if any) */}
        {def.presets && def.presets.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Wand2 className="h-3 w-3 text-muted-foreground" />
              Apply Preset
            </label>
            <div className="flex flex-wrap gap-1.5">
              {def.presets.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onUpdateData(node.id, preset.values)}
                  className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/80 hover:text-primary"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Config fields from registry */}
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

        {/* Quick Scale section */}
        {hasQuickScale && (
          <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quick Scale</p>

            {hasReplicas && (() => {
              const field = def.configFields.find(f => f.key === 'replicas')
              const cur = Number(nodeData['replicas'] ?? 1)
              const min = field?.min ?? 1
              const max = field?.max ?? 100
              return (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Replicas</span>
                    <span className="text-xs font-mono text-muted-foreground">×{cur}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {([-5, -1, 1, 5] as const).map(d => (
                      <button key={d} type="button"
                        onClick={() => onUpdateData(node.id, { replicas: Math.min(max, Math.max(min, cur + d)) })}
                        className="flex-1 rounded-lg border border-border bg-background py-1 text-xs font-semibold text-foreground hover:bg-muted hover:border-primary/30 transition-colors"
                      >{d > 0 ? `+${d}` : d}</button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {hasCpu && (() => {
              const field = def.configFields.find(f => f.key === 'cpu')
              const cur = Number(nodeData['cpu'] ?? 1)
              const min = field?.min ?? 0.25
              const max = field?.max ?? 64
              return (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">CPU</span>
                    <span className="text-xs font-mono text-muted-foreground">{cur} vCPU</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {([-2, -0.5, 0.5, 2] as const).map(d => (
                      <button key={d} type="button"
                        onClick={() => onUpdateData(node.id, { cpu: Math.min(max, Math.max(min, Math.round((cur + d) * 4) / 4)) })}
                        className="flex-1 rounded-lg border border-border bg-background py-1 text-xs font-semibold text-foreground hover:bg-muted hover:border-primary/30 transition-colors"
                      >{d > 0 ? `+${d}` : d}</button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {hasRam && (() => {
              const field = def.configFields.find(f => f.key === 'ram')
              const cur = Number(nodeData['ram'] ?? 2)
              const min = field?.min ?? 0.5
              const max = field?.max ?? 256
              return (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">RAM</span>
                    <span className="text-xs font-mono text-muted-foreground">{cur} GB</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {([-4, -1, 1, 4] as const).map(d => (
                      <button key={d} type="button"
                        onClick={() => onUpdateData(node.id, { ram: Math.min(max, Math.max(min, Math.round((cur + d) * 2) / 2)) })}
                        className="flex-1 rounded-lg border border-border bg-background py-1 text-xs font-semibold text-foreground hover:bg-muted hover:border-primary/30 transition-colors"
                      >{d > 0 ? `+${d}` : d}</button>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Universal node metadata section */}
        {onUpdateMeta && (
          <div className="rounded-lg border border-border bg-muted/20">
            <button
              type="button"
              onClick={() => setShowMeta(m => !m)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {showMeta ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <StickyNote className="h-3 w-3" />
              Notes, Tags & Color
            </button>
            {showMeta && (
              <div className="border-t border-border px-3 pb-3 pt-2 space-y-3">
                {/* Notes */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <StickyNote className="h-2.5 w-2.5" />
                    Notes
                  </label>
                  <textarea
                    value={node.data.notes ?? ''}
                    onChange={e => onUpdateMeta(node.id, { notes: e.target.value })}
                    placeholder="Add notes about this node..."
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none transition-colors focus:border-primary resize-none"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Tag className="h-2.5 w-2.5" />
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(node.data.tags ?? []).map((tag, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => onUpdateMeta(node.id, { tags: (node.data.tags ?? []).filter((_, idx) => idx !== i) })}
                          className="text-primary/70 hover:text-primary"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add tag, press Enter"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1 text-xs text-foreground outline-none transition-colors focus:border-primary"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim()
                        if (val) {
                          onUpdateMeta(node.id, { tags: [...(node.data.tags ?? []), val] });
                          (e.target as HTMLInputElement).value = ''
                        }
                      }
                    }}
                  />
                </div>

                {/* Color override */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Palette className="h-2.5 w-2.5" />
                    Color Override
                  </label>
                  <ColorSwatchPicker
                    value={node.data.color}
                    onChange={color => onUpdateMeta(node.id, { color })}
                  />
                </div>
              </div>
            )}
          </div>
        )}
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
