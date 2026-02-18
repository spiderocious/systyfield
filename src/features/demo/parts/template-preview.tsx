import { useState, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { RefreshCw } from '@shared/ui/icons'
import { BaseNode } from '@features/canvas/components/base-node'
import type { DemoTemplate } from '../data/templates'

const PREVIEW_NODE_TYPES: NodeTypes = {
  base: BaseNode as NodeTypes[string],
}

function PreviewInner({ template }: { template: DemoTemplate }) {
  const [fitKey, setFitKey] = useState(0)

  const onInit = useCallback(() => {
    // fitView is handled by the fitView prop — this is a no-op placeholder
  }, [])

  return (
    <div className="relative h-52 w-full">
      <ReactFlow
        key={fitKey}
        nodes={template.nodes}
        edges={template.edges}
        nodeTypes={PREVIEW_NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        preventScrolling={false}
        className="h-full w-full"
        proOptions={{ hideAttribution: true }}
        onInit={onInit}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
          color="var(--color-canvas-dot)"
        />
      </ReactFlow>

      {/* Reset / re-fit button */}
      <button
        type="button"
        title="Reset view"
        onClick={() => setFitKey(k => k + 1)}
        className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card/90 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
      >
        <RefreshCw className="h-3 w-3" />
      </button>
    </div>
  )
}

export function TemplatePreview({ template }: { template: DemoTemplate }) {
  return (
    <ReactFlowProvider>
      <PreviewInner template={template} />
    </ReactFlowProvider>
  )
}
