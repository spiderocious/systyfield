import { useState } from 'react'
import type { DesignMode, NodeType } from '@shared/types'
import { NODE_TYPE_REGISTRY, NODE_TYPES_BY_MODE, NODE_CATEGORY_ORDER } from '@shared/constants'
import { log } from '@shared/utils'
import { Search } from '@shared/ui/icons'
import * as Icons from '@shared/ui/icons'
import type { LucideIcon } from '@shared/ui/icons'

interface NodePaletteProps {
  mode: DesignMode
}

interface PaletteItemProps {
  nodeType: NodeType
}

function PaletteItem({ nodeType }: PaletteItemProps) {
  const def = NODE_TYPE_REGISTRY[nodeType]
  if (!def) return null

  const IconComponent = (Icons as Record<string, LucideIcon>)[def.icon] ?? Icons.Server
  const colorVar = `var(${def.colorVar})`

  const onDragStart = (e: React.DragEvent) => {
    log.canvas.debug('Drag start from palette', { nodeType })
    e.dataTransfer.setData('application/systyfield-node-type', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 transition-all active:cursor-grabbing hover:border-primary/30 hover:shadow-sm hover:bg-muted/50"
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 15%, transparent)` }}
      >
        <IconComponent className="h-3.5 w-3.5" style={{ color: colorVar }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground truncate leading-tight">{def.label}</p>
        <p className="text-[10px] text-muted-foreground truncate leading-tight">{def.description}</p>
      </div>
    </div>
  )
}

export function NodePalette({ mode }: NodePaletteProps) {
  const [search, setSearch] = useState('')
  const nodeTypes = NODE_TYPES_BY_MODE[mode]
  const categoryOrder = NODE_CATEGORY_ORDER[mode]

  const filtered = nodeTypes.filter(type => {
    const def = NODE_TYPE_REGISTRY[type]
    if (!def) return false
    if (!search) return true
    const q = search.toLowerCase()
    return def.label.toLowerCase().includes(q) || def.description.toLowerCase().includes(q)
  })

  const grouped = categoryOrder.reduce<Record<string, NodeType[]>>((acc, cat) => {
    const items = filtered.filter(t => NODE_TYPE_REGISTRY[t]?.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  return (
    <div className="flex h-full w-60 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Components
        </h2>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Drag onto the canvas</p>
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.entries(grouped).map(([category, types]) => (
          <div key={category} className="space-y-1.5">
            <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {category}
            </p>
            <div className="space-y-1">
              {types.map(type => (
                <PaletteItem key={type} nodeType={type} />
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-muted-foreground">No components match your search</p>
          </div>
        )}
      </div>
    </div>
  )
}
