import type { Design, DesignSummary } from '../types'
import { log } from '../utils/log'
import { APIStorageAdapter } from './api-storage-adapter'

// ─── Interface ────────────────────────────────────────────────────────────────

export interface DesignStorageAdapter {
  getDesign(id: string): Promise<Design | null>
  saveDesign(design: Design): Promise<Design>
  listDesigns(): Promise<DesignSummary[]>
  deleteDesign(id: string): Promise<void>
  generatePresignedUrl(filename: string): Promise<string>
}

// ─── LocalStorage Adapter ─────────────────────────────────────────────────────

const STORAGE_PREFIX = 'systyfield:design:'
const STORAGE_INDEX_KEY = 'systyfield:design-index'

export class LocalStorageAdapter implements DesignStorageAdapter {
  async getDesign(id: string): Promise<Design | null> {
    log.storage.debug('getDesign', { id })
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`)
      if (!raw) {
        log.storage.warn('Design not found in localStorage', { id })
        return null
      }
      const design = JSON.parse(raw) as Design
      log.storage.info('Design loaded', { id, title: design.meta.title })
      return design
    } catch (err) {
      log.storage.error('Failed to parse design from localStorage', err)
      return null
    }
  }

  async saveDesign(design: Design): Promise<Design> {
    log.storage.debug('saveDesign', { id: design.id, title: design.meta.title })
    const updated: Design = {
      ...design,
      meta: { ...design.meta, updatedAt: new Date().toISOString() },
    }
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${design.id}`, JSON.stringify(updated))
      this.updateIndex(updated)
      log.storage.info('Design saved', { id: design.id })
    } catch (err) {
      log.storage.error('Failed to save design to localStorage', err)
      throw err
    }
    return updated
  }

  async listDesigns(): Promise<DesignSummary[]> {
    log.storage.debug('listDesigns')
    try {
      const raw = localStorage.getItem(STORAGE_INDEX_KEY)
      if (!raw) return []
      const index = JSON.parse(raw) as DesignSummary[]
      log.storage.info('Designs listed', { count: index.length })
      return index.sort(
        (a, b) =>
          new Date(b.meta.updatedAt).getTime() - new Date(a.meta.updatedAt).getTime()
      )
    } catch (err) {
      log.storage.error('Failed to list designs from localStorage', err)
      return []
    }
  }

  async deleteDesign(id: string): Promise<void> {
    log.storage.debug('deleteDesign', { id })
    localStorage.removeItem(`${STORAGE_PREFIX}${id}`)
    this.removeFromIndex(id)
    log.storage.info('Design deleted', { id })
  }

  async generatePresignedUrl(_filename: string): Promise<string> {
    log.storage.warn('generatePresignedUrl called on LocalStorageAdapter — using mock URL')
    return Promise.resolve(`data:image/png;base64,`)
  }

  private updateIndex(design: Design): void {
    const summaries = this.readIndex()
    const summary: DesignSummary = {
      id: design.id,
      viewToken: design.viewToken,
      mode: design.mode,
      meta: design.meta,
    }
    const existing = summaries.findIndex(s => s.id === design.id)
    if (existing >= 0) {
      summaries[existing] = summary
    } else {
      summaries.push(summary)
    }
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(summaries))
  }

  private removeFromIndex(id: string): void {
    const summaries = this.readIndex().filter(s => s.id !== id)
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(summaries))
  }

  private readIndex(): DesignSummary[] {
    try {
      const raw = localStorage.getItem(STORAGE_INDEX_KEY)
      return raw ? (JSON.parse(raw) as DesignSummary[]) : []
    } catch {
      return []
    }
  }
}

// ─── Singleton — selects adapter based on VITE_API_URL env var ────────────────

function createStorageAdapter(): DesignStorageAdapter {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined
  if (apiUrl) {
    log.storage.info('Using APIStorageAdapter', { apiUrl })
    return new APIStorageAdapter(apiUrl)
  }
  log.storage.info('Using LocalStorageAdapter (no VITE_API_URL set)')
  return new LocalStorageAdapter()
}

export const storageAdapter: DesignStorageAdapter = createStorageAdapter()
