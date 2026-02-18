import { v4 as uuidv4 } from 'uuid'
import type { Design, DesignMode, Canvas } from '@shared/types'
import { storageAdapter } from '@shared/services/storage-adapter'
import { log } from '@shared/utils'

const EMPTY_CANVAS: Canvas = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
}

export function createNewDesign(mode: DesignMode = 'system'): Design {
  const id = uuidv4()
  const editToken = uuidv4()
  const viewToken = uuidv4().split('-')[0]
  const now = new Date().toISOString()

  const design: Design = {
    id,
    editToken,
    viewToken,
    mode,
    meta: {
      title: 'Untitled Design',
      createdAt: now,
      updatedAt: now,
    },
    canvas: EMPTY_CANVAS,
    simulations: [],
  }
  log.session.info('Created new design', { id, mode })
  return design
}

export async function loadDesign(id: string): Promise<Design | null> {
  log.session.info('Loading design', { id })
  return storageAdapter.getDesign(id)
}

export async function saveDesign(design: Design): Promise<Design> {
  log.session.info('Saving design', { id: design.id, title: design.meta.title })
  return storageAdapter.saveDesign(design)
}

export async function listDesigns() {
  return storageAdapter.listDesigns()
}

export async function deleteDesign(id: string): Promise<void> {
  log.session.info('Deleting design', { id })
  return storageAdapter.deleteDesign(id)
}

export function getShareUrl(design: Design, type: 'view' | 'edit'): string {
  const token = type === 'edit' ? design.editToken : design.viewToken
  const base = window.location.origin
  return `${base}/canvas/${design.id}?token=${token}&access=${type}`
}
